/**
 * GET /api/automation/visual-explainer/health
 *
 * Visual explainer health check.
 * Returns 503 when disabled (default).
 */

import { NextResponse } from 'next/server';
import automationConfig from '../../../../../../automation/config/automationConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!automationConfig.enabled || !automationConfig.allowVisualExplainer) {
    return NextResponse.json(
      { success: false, status: 'disabled', message: 'Visual explainer is disabled (safe mode)' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    status: 'ok',
    safeMode: automationConfig.safeMode,
  });
}
