/**
 * POST /api/automation/run
 *
 * Submit a task to the automation bridge.
 * Returns 503 when automation is disabled (default).
 * All tasks are dry-run in safe mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import automationConfig from '../../../../../automation/config/automationConfig';
import { submitTask } from '../../../../../automation/scripts/automationBridge';
import type { ProviderName } from '../../../../../automation/types/automationTypes';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!automationConfig.enabled) {
    return NextResponse.json(
      { success: false, error: 'Automation bridge is disabled' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { name, provider, payload, priority } = body;

    if (!name || !provider) {
      return NextResponse.json(
        { success: false, error: 'name and provider are required' },
        { status: 400 },
      );
    }

    const validProviders: ProviderName[] = ['claude', 'n8n', 'paperclip', 'pinchtab', 'dash'];
    if (!validProviders.includes(provider)) {
      return NextResponse.json(
        { success: false, error: `Invalid provider: ${provider}` },
        { status: 400 },
      );
    }

    const result = submitTask(name, provider, payload || {}, priority || 0);
    return NextResponse.json({ success: result.success, data: result });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
