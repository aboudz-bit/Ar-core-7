import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { experienceId, action } = await req.json();

  if (!experienceId || !action) {
    return NextResponse.json({ success: false, error: 'experienceId and action are required' }, { status: 400 });
  }

  const experience = await prisma.experience.findUnique({
    where: { id: experienceId },
    include: { company: true },
  });

  if (!experience) {
    return NextResponse.json({ success: false, error: 'Experience not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === experience.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const statusMap: Record<string, 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED'> = {
    publish: 'PUBLISHED',
    unpublish: 'DRAFT',
    archive: 'ARCHIVED',
    ready: 'READY',
  };

  const newStatus = statusMap[action];
  if (!newStatus) {
    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const publicUrl = `${appUrl}/ar/${experience.slug}`;
  const embedUrl = `${appUrl}/embed/${experience.slug}`;
  const embedSnippet = `<iframe src="${embedUrl}" style="width:100%;height:600px;border:0;" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`;
  const qrCodeUrl = `${appUrl}/qr/${experience.slug}`;
  const launchUrl = `${appUrl}/launch/${experience.slug}`;

  await prisma.$transaction([
    prisma.experience.update({
      where: { id: experienceId },
      data: { publishStatus: newStatus },
    }),
    prisma.publishRecord.create({
      data: {
        experienceId,
        companyId: experience.companyId,
        publishStatus: newStatus,
        publicUrl: newStatus === 'PUBLISHED' ? publicUrl : null,
        embedSnippet: newStatus === 'PUBLISHED' ? embedSnippet : null,
        qrCodeUrl: newStatus === 'PUBLISHED' ? qrCodeUrl : null,
        publishedAt: newStatus === 'PUBLISHED' ? new Date() : null,
        publishedBy: session.userId,
      },
    }),
  ]);

  await logAudit({
    userId: session.userId,
    companyId: experience.companyId,
    action: 'PUBLISH_' + action.toUpperCase(),
    entity: 'Experience',
    entityId: experienceId,
  });

  return NextResponse.json({
    success: true,
    data: {
      status: newStatus,
      publicUrl: newStatus === 'PUBLISHED' ? publicUrl : null,
      embedUrl: newStatus === 'PUBLISHED' ? embedUrl : null,
      embedSnippet: newStatus === 'PUBLISHED' ? embedSnippet : null,
      launchUrl: newStatus === 'PUBLISHED' ? launchUrl : null,
      qrCodeUrl: newStatus === 'PUBLISHED' ? qrCodeUrl : null,
    },
  });
}
