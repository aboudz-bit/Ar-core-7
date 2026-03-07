import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { generateSlug } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const companyId = searchParams.get('companyId') || '';
  const type = searchParams.get('type') || '';
  const status = searchParams.get('status') || '';

  const companyIds = isSuperAdmin(session)
    ? undefined
    : session.memberships.map((m) => m.companyId);

  // If companyId filter is specified, validate the user has access to it
  if (companyId && !isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const where = {
    ...(companyId
      ? { companyId }
      : companyIds ? { companyId: { in: companyIds } } : {}),
    ...(type ? { experienceType: type as 'PRODUCT_VIEWER' | 'SURFACE_AR' | 'IMAGE_TARGET' | 'QR_LAUNCH' | 'EMBED_VIEWER' | 'FACE_TRYON' | 'BODY_TRYON' } : {}),
    ...(status ? { publishStatus: status as 'DRAFT' | 'READY' | 'PUBLISHED' | 'ARCHIVED' } : {}),
  };

  const [experiences, total] = await Promise.all([
    prisma.experience.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, slug: true } },
        product: { select: { id: true, title: true, thumbnailUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.experience.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: experiences,
    meta: { page, limit, total },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const { companyId, productId, name, experienceType, scale, lightingPreset, backgroundMode, ctaText, ctaLink, sceneConfig } = body;

  if (!companyId || !name || !experienceType) {
    return NextResponse.json(
      { success: false, error: 'companyId, name, and experienceType are required' },
      { status: 400 }
    );
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const slug = `${generateSlug()}-${name.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`;

  const experience = await prisma.experience.create({
    data: {
      companyId,
      productId: productId || null,
      name,
      slug,
      experienceType,
      ...(scale != null && { scale }),
      ...(lightingPreset && { lightingPreset }),
      ...(backgroundMode && { backgroundMode }),
      ...(ctaText !== undefined && { ctaText }),
      ...(ctaLink !== undefined && { ctaLink }),
      ...(sceneConfig && { sceneConfig }),
    },
    include: {
      company: { select: { id: true, name: true, slug: true } },
      product: { select: { id: true, title: true } },
    },
  });

  await logAudit({
    userId: session.userId,
    companyId,
    action: 'CREATE',
    entity: 'Experience',
    entityId: experience.id,
    details: { name, experienceType },
  });

  return NextResponse.json({ success: true, data: experience }, { status: 201 });
}
