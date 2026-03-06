import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { slugify } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';

  const where = isSuperAdmin(session)
    ? search ? { name: { contains: search, mode: 'insensitive' as const } } : {}
    : {
        id: { in: session.memberships.map((m) => m.companyId) },
        ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
      };

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: {
        _count: { select: { products: true, memberships: true, experiences: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.company.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: companies,
    meta: { page, limit, total },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, domain, brandPrimary, brandSecondary } = body;

  if (!name) {
    return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
  }

  const slug = slugify(name);
  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Company slug already exists' }, { status: 409 });
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      domain: domain || null,
      brandPrimary: brandPrimary || '#4263eb',
      brandSecondary: brandSecondary || '#748ffc',
    },
  });

  await logAudit({
    userId: session.userId,
    companyId: company.id,
    action: 'CREATE',
    entity: 'Company',
    entityId: company.id,
    details: { name },
  });

  return NextResponse.json({ success: true, data: company }, { status: 201 });
}
