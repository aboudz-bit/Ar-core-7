/**
 * GET /api/automation/memory — Query memory store
 * POST /api/automation/memory — Store a memory entry
 *
 * Returns 503 when disabled (default). In-memory only.
 */

import { NextRequest, NextResponse } from 'next/server';
import automationConfig from '../../../../../automation/config/automationConfig';
import { remember, recall, listMemory } from '../../../../../automation/memory-agent/memoryAgent';
import { executeQuery } from '../../../../../automation/memory-agent/memoryQuery';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!automationConfig.enabled || !automationConfig.allowMemoryAgent) {
    return NextResponse.json(
      { success: false, error: 'Memory agent is disabled' },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  const tag = searchParams.get('tag');
  const source = searchParams.get('source');
  const limit = searchParams.get('limit');

  if (key) {
    const entry = recall(key);
    return NextResponse.json({
      success: true,
      data: entry || null,
    });
  }

  const result = executeQuery({
    tags: tag ? [tag] : undefined,
    source: source || undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
  });

  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: NextRequest) {
  if (!automationConfig.enabled || !automationConfig.allowMemoryAgent) {
    return NextResponse.json(
      { success: false, error: 'Memory agent is disabled' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { key, value, source, tags, ttlMs } = body;

    if (!key || value === undefined || !source) {
      return NextResponse.json(
        { success: false, error: 'key, value, and source are required' },
        { status: 400 },
      );
    }

    const entry = remember(key, value, source, tags || [], ttlMs);
    return NextResponse.json({ success: true, data: entry });
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }
}
