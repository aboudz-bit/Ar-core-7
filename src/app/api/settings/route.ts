import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get('companyId');

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

  const { companyId, settings } = await req.json();

  if (!isSuperAdmin(session) && companyId && !session.memberships.some((m) => m.companyId === companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { companyId_key: { companyId: companyId || '', key } },
      create: { companyId: companyId || null, key, value: value as object },
      update: { value: value as object },
    });
  }

  return NextResponse.json({ success: true });
}
