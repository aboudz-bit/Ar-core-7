import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// Revoke an API key
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const apiKey = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === apiKey.companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const { action } = await req.json();

  if (action === 'revoke') {
    await prisma.apiKey.update({
      where: { id: params.id },
      data: { status: 'REVOKED' },
    });

    await logAudit({
      userId: session.userId,
      companyId: apiKey.companyId,
      action: 'REVOKE_API_KEY',
      entity: 'ApiKey',
      entityId: apiKey.id,
      details: { name: apiKey.name },
    });

    return NextResponse.json({ success: true, message: 'API key revoked' });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
}

// Delete an API key permanently
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const apiKey = await prisma.apiKey.findUnique({ where: { id: params.id } });
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === apiKey.companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await prisma.apiKey.delete({ where: { id: params.id } });

  await logAudit({
    userId: session.userId,
    companyId: apiKey.companyId,
    action: 'DELETE_API_KEY',
    entity: 'ApiKey',
    entityId: apiKey.id,
  });

  return NextResponse.json({ success: true });
}
