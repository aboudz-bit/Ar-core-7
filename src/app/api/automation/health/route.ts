/**
 * GET /api/automation/health
 *
 * Automation bridge health check.
 * Returns 503 when automation is disabled (default).
 */

import { NextResponse } from 'next/server';
import automationConfig from '../../../../../automation/config/automationConfig';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!automationConfig.enabled) {
    return NextResponse.json(
      { success: false, status: 'disabled', message: 'Automation bridge is disabled (safe mode)' },
      { status: 503 },
    );
  }

  return NextResponse.json({
    success: true,
    status: 'ok',
    safeMode: automationConfig.safeMode,
    providers: [...automationConfig.supportedProviders],
    documentTools: automationConfig.allowDocumentTools,
  });
}
