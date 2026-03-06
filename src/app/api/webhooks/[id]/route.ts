import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const webhook = await prisma.webhook.findUnique({ where: { id: params.id } });
  if (!webhook) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === webhook.companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { isActive, url, events } = body;

  const updated = await prisma.webhook.update({
    where: { id: params.id },
    data: {
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(url ? { url } : {}),
      ...(events ? { events } : {}),
    },
  });

  await logAudit({
    userId: session.userId,
    companyId: webhook.companyId,
    action: 'UPDATE_WEBHOOK',
    entity: 'Webhook',
    entityId: webhook.id,
    details: body,
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const webhook = await prisma.webhook.findUnique({ where: { id: params.id } });
  if (!webhook) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === webhook.companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.webhook.delete({ where: { id: params.id } });

  await logAudit({
    userId: session.userId,
    companyId: webhook.companyId,
    action: 'DELETE_WEBHOOK',
    entity: 'Webhook',
    entityId: webhook.id,
  });

  return NextResponse.json({ success: true });
}

// Get delivery history for a webhook
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const webhook = await prisma.webhook.findUnique({ where: { id: params.id } });
  if (!webhook) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === webhook.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const deliveries = await prisma.webhookDelivery.findMany({
    where: { webhookId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ success: true, data: deliveries });
}
