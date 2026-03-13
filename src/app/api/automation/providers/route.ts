/**
 * GET /api/automation/providers
 *
 * List registered provider adapters and their connection status.
 * Returns 503 when automation is disabled (default).
 */

import { NextResponse } from 'next/server';
import automationConfig from '../../../../../automation/config/automationConfig';
import { listAdapters } from '../../../../../automation/integrations/integrationManager';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!automationConfig.enabled) {
    return NextResponse.json(
      { success: false, error: 'Automation bridge is disabled' },
      { status: 503 },
    );
  }

  const adapters = listAdapters().map((a) => ({
    name: a.name,
    connected: a.connected,
  }));

  return NextResponse.json({ success: true, data: adapters });
}
