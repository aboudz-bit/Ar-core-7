import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSuperAdmin } from '@/lib/auth';
import { getTryOnJobStatus } from '@/services/virtual-tryon';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tryon-jobs/[id] — Get the status of a try-on job.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const result = await getTryOnJobStatus(params.id);
  if (!result) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  // Verify the user has access to this job's company
  const job = await prisma.tryOnJob.findUnique({
    where: { id: params.id },
    select: { companyId: true },
  });

  if (job && !isSuperAdmin(session) && !session.memberships.some((m) => m.companyId === job.companyId)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: result });
}
