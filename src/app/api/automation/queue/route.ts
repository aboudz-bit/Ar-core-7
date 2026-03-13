/**
 * GET /api/automation/queue
 *
 * List all jobs in the automation queue.
 * Returns 503 when automation is disabled (default).
 */

import { NextResponse } from 'next/server';
import automationConfig from '../../../../../automation/config/automationConfig';
import { getQueue, getQueueStats } from '../../../../../automation/queue/queueManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!automationConfig.enabled) {
    return NextResponse.json(
      { success: false, error: 'Automation bridge is disabled' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      stats: getQueueStats(),
      jobs: getQueue(),
    },
  });
}
