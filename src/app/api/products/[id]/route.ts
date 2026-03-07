import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      company: { select: { id: true, name: true, slug: true, brandPrimary: true } },
      assets: true,
      experiences: {
        select: { id: true, name: true, slug: true, experienceType: true, publishStatus: true },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Include latest generation job if any
  const generationJob = await prisma.imageTo3DJob.findFirst({
    where: { productId: params.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      ...product,
      generationJob: generationJob ? {
        id: generationJob.id,
        status: generationJob.status,
        provider: generationJob.provider,
        errorMessage: generationJob.errorMessage,
        startedAt: generationJob.startedAt,
        completedAt: generationJob.completedAt,
      } : null,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // Whitelist allowed fields to prevent mass assignment
  const allowedFields = ['title', 'sku', 'category', 'description', 'brand', 'thumbnailUrl',
    'status', 'tags', 'dimensionWidth', 'dimensionHeight', 'dimensionDepth', 'dimensionUnit',
    'scalePreset', 'anchorType', 'defaultSceneConfig', 'externalId', 'externalSource', 'externalHandle'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) data[key] = body[key];
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data,
    include: {
      company: { select: { id: true, name: true, slug: true } },
      assets: true,
    },
  });

  await logAudit({
    userId: session.userId,
    companyId: product.companyId,
    action: 'UPDATE',
    entity: 'Product',
    entityId: product.id,
    details: body,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const product = await prisma.product.findUnique({ where: { id: params.id } });
  if (!product) {
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === product.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.product.delete({ where: { id: params.id } });

  await logAudit({
    userId: session.userId,
    companyId: product.companyId,
    action: 'DELETE',
    entity: 'Product',
    entityId: product.id,
  });

  return NextResponse.json({ success: true });
}
