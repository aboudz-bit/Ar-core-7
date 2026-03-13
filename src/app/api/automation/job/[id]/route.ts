/**
 * GET /api/automation/job/:id
 *
 * Get a specific job by ID from the queue.
 * Returns 503 when automation is disabled (default).
 */

import { NextRequest, NextResponse } from 'next/server';
import automationConfig from '../../../../../../automation/config/automationConfig';
import { getJobById } from '../../../../../../automation/queue/queueManager';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!automationConfig.enabled) {
    return NextResponse.json(
      { success: false, error: 'Automation bridge is disabled' },
      { status: 503 },
    );
  }

  const job = getJobById(params.id);
  if (!job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: job });
}
