import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

const VALID_EVENTS = ['ar_viewed', 'ar_launched', 'experience_published', 'qr_opened', 'asset_uploaded'];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) return NextResponse.json({ success: false, error: 'companyId required' }, { status: 400 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const webhooks = await prisma.webhook.findMany({
    where: { companyId },
    include: { _count: { select: { deliveries: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: webhooks });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { companyId, url, events, description } = await req.json();

  if (!companyId || !url || !events?.length) {
    return NextResponse.json({ success: false, error: 'companyId, url, and events are required' }, { status: 400 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const invalidEvents = events.filter((e: string) => !VALID_EVENTS.includes(e));
  if (invalidEvents.length > 0) {
    return NextResponse.json({ success: false, error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
  }

  const secret = `whsec_${randomBytes(24).toString('hex')}`;

  const webhook = await prisma.webhook.create({
    data: {
      companyId,
      url,
      secret,
      events,
      description: description || null,
    },
  });

  await logAudit({
    userId: session.userId,
    companyId,
    action: 'CREATE_WEBHOOK',
    entity: 'Webhook',
    entityId: webhook.id,
    details: { url, events },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      secret: webhook.secret,
      warning: 'Save this signing secret now. It will not be shown again.',
    },
  }, { status: 201 });
}
