/**
 * GET /api/automation/browser/health
 *
 * Browser automation (PinchTab) health check.
 * Returns 503 when automation or browser adapter is disabled (default).
 */

import { NextResponse } from 'next/server';
import automationConfig from '../../../../../../automation/config/automationConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!automationConfig.enabled || !automationConfig.allowBrowserAdapter) {
    return NextResponse.json(
      { success: false, status: 'disabled', message: 'Browser adapter is disabled (safe mode)' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    status: 'ok',
    safeMode: automationConfig.safeMode,
    provider: 'pinchtab',
  });
}
