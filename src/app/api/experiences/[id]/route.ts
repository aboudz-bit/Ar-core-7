import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const experience = await prisma.experience.findUnique({
    where: { id: params.id },
    include: {
      company: true,
      product: { include: { assets: true } },
      publishRecords: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!experience) {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === experience.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: experience });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const experience = await prisma.experience.findUnique({ where: { id: params.id } });
  if (!experience) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === experience.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Whitelist allowed fields to prevent mass assignment
  const allowedFields = ['name', 'productId', 'scale', 'initialRotationX', 'initialRotationY', 'initialRotationZ',
    'positionOffsetX', 'positionOffsetY', 'positionOffsetZ', 'lightingPreset', 'backgroundMode',
    'ctaText', 'ctaLink', 'analyticsEnabled', 'sceneConfig'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.experience.update({
    where: { id: params.id },
    data,
    include: {
      company: { select: { id: true, name: true, slug: true } },
      product: { select: { id: true, title: true } },
    },
  });

  await logAudit({
    userId: session.userId,
    companyId: experience.companyId,
    action: 'UPDATE',
    entity: 'Experience',
    entityId: experience.id,
    details: { updatedFields: Object.keys(data) },
  });

  return NextResponse.json({ success: true, data: updated });
}
