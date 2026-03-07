import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { retryJob } from '@/lib/image-to-3d';

export const dynamic = 'force-dynamic';

/**
 * GET /api/generate-3d/[jobId]
 * Get status of a specific generation job.
 */
export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const job = await prisma.imageTo3DJob.findUnique({
    where: { id: params.jobId },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === job.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: job.id,
      productId: job.productId,
      status: job.status,
      provider: job.provider,
      outputGlbPath: job.outputGlbPath,
      errorMessage: job.errorMessage,
      retryCount: job.retryCount,
      metadata: job.metadata,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    },
  });
}

/**
 * POST /api/generate-3d/[jobId]
 * Retry a failed job.
 * Body: { action: "retry" }
 */
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const { action } = await req.json();

  if (action !== 'retry') {
    return NextResponse.json({ success: false, error: 'Invalid action. Use "retry".' }, { status: 400 });
  }

  const job = await prisma.imageTo3DJob.findUnique({ where: { id: params.jobId } });
  if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

  if (!isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === job.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    await retryJob(params.jobId);
    return NextResponse.json({ success: true, data: { status: 'pending' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
