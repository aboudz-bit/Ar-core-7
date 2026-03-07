import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  const companyIds = isSuperAdmin(session)
    ? undefined
    : session.memberships.map((m) => m.companyId);

  const where = companyIds
    ? { memberships: { some: { companyId: { in: companyIds } } } }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        memberships: {
          include: { company: { select: { id: true, name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ success: true, data: users, meta: { page, limit, total } });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !isSuperAdmin(session)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { email, password, firstName, lastName, companyId, role } = await req.json();

  if (!email || !password || !firstName || !lastName) {
    return NextResponse.json({ success: false, error: 'All fields are required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      ...(companyId && role
        ? {
            memberships: {
              create: { companyId, role },
            },
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      memberships: {
        include: { company: { select: { id: true, name: true } } },
      },
    },
  });

  await logAudit({
    userId: session.userId,
    action: 'CREATE',
    entity: 'User',
    entityId: user.id,
    details: { email },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
