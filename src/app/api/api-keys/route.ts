import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { generateApiKey } from '@/lib/api-keys';
import { logAudit } from '@/lib/audit';

export const dynamic = 'force-dynamic';

// List API keys for a company (secrets are never returned)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const companyId = req.nextUrl.searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ success: false, error: 'companyId is required' }, { status: 400 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
      environment: true,
      lastUsedAt: true,
      createdAt: true,
      createdBy: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: keys });
}

// Create a new API key
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { companyId, name, environment } = await req.json();

  if (!companyId || !name) {
    return NextResponse.json({ success: false, error: 'companyId and name are required' }, { status: 400 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === companyId && ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(m.role))) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const env = environment === 'test' ? 'test' : 'live';
  const { fullKey, keyPrefix, hashedSecret } = generateApiKey(env as 'test' | 'live');

  const apiKey = await prisma.apiKey.create({
    data: {
      companyId,
      name,
      keyPrefix,
      hashedSecret,
      environment: env === 'test' ? 'TEST' : 'LIVE',
      createdBy: session.userId,
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
      environment: true,
      createdAt: true,
    },
  });

  await logAudit({
    userId: session.userId,
    companyId,
    action: 'CREATE_API_KEY',
    entity: 'ApiKey',
    entityId: apiKey.id,
    details: { name, environment: env },
  });

  // Return full key ONLY at creation time
  return NextResponse.json({
    success: true,
    data: {
      ...apiKey,
      secret: fullKey,
      warning: 'Save this key now. It will not be shown again.',
    },
  }, { status: 201 });
}
