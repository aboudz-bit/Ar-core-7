import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

  // Global settings require super admin; company settings require membership
  if (!companyId && !isSuperAdmin(session)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }
  if (companyId && !isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const settings = await prisma.setting.findMany({
    where: companyId ? { companyId } : { companyId: null },
  });

  const settingsMap: Record<string, unknown> = {};
  settings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return NextResponse.json({ success: true, data: settingsMap });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  const { companyId, settings } = body;

  if (!companyId && !isSuperAdmin(session)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  if (companyId && !isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  for (const [key, value] of Object.entries(settings)) {
    if (companyId) {
      await prisma.setting.upsert({
        where: { companyId_key: { companyId, key } },
        create: { companyId, key, value: value as object },
        update: { value: value as object },
      });
    } else {
      // Global settings: find existing or create
      const existing = await prisma.setting.findFirst({ where: { companyId: null, key } });
      if (existing) {
        await prisma.setting.update({ where: { id: existing.id }, data: { value: value as object } });
      } else {
        await prisma.setting.create({ data: { companyId: null, key, value: value as object } });
      }
    }
  }

  return NextResponse.json({ success: true });
}
