/**
 * POST /api/automation/browser/run
 *
 * Submit a browser automation task (PinchTab).
 * Returns 503 when disabled (default). Mock-only in safe mode.
 */

import { NextRequest, NextResponse } from 'next/server';
import automationConfig from '../../../../../../automation/config/automationConfig';
import type { BrowserTask, BrowserTaskResult } from '../../../../../../automation/types/automationTypes';
import { bridgeLog } from '../../../../../../automation/scripts/bridgeLogger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!automationConfig.enabled || !automationConfig.allowBrowserAdapter) {
    return NextResponse.json(
      { success: false, error: 'Browser adapter is disabled' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { action, target, value, timeout } = body;

    const validActions = ['navigate', 'screenshot', 'click', 'type', 'evaluate', 'wait'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const task: BrowserTask = {
      id: `bt-${Date.now()}`,
      action,
      target: target || '',
      value,
      timeout,
      dryRun: true,
    };

    bridgeLog('info', 'browser-api', `[DRY RUN] Browser task: ${action} → ${target}`);

    const result: BrowserTaskResult = {
      taskId: task.id,
      success: false,
      action: task.action,
      result: null,
      error: 'Safe mode — browser task not executed',
      durationMs: 0,
      dryRun: true,
    };

    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
