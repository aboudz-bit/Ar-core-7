import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const search = searchParams.get('search') || '';
  const companyId = searchParams.get('companyId') || '';
  const status = searchParams.get('status') || '';

  const userCompanyIds = isSuperAdmin(session)
    ? undefined
    : session.memberships.map((m) => m.companyId);

  // If companyId filter is specified, validate the user has access to it
  if (companyId && !isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  // Build tenant-safe filter: companyId param narrows within allowed companies
  const effectiveCompanyFilter = companyId
    ? { companyId }
    : userCompanyIds ? { companyId: { in: userCompanyIds } } : {};

  const where = {
    ...effectiveCompanyFilter,
    ...(status ? { status: status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' as const } },
            { sku: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, slug: true } },
        assets: { select: { id: true, assetType: true, fileName: true, filePath: true } },
        _count: { select: { experiences: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: products,
    meta: { page, limit, total },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { companyId, title, sku, category, description, brand, tags, anchorType, scalePreset } = body;

  if (!companyId || !title) {
    return NextResponse.json({ success: false, error: 'Company and title are required' }, { status: 400 });
  }

  // Tenant check
  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const product = await prisma.product.create({
    data: {
      companyId,
      title,
      sku: sku || null,
      category: category || null,
      description: description || null,
      brand: brand || null,
      tags: tags || [],
      anchorType: anchorType || 'floor',
      scalePreset: scalePreset || 1.0,
    },
    include: {
      company: { select: { id: true, name: true, slug: true } },
    },
  });

  await logAudit({
    userId: session.userId,
    companyId,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: { title },
  });

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
