/**
 * Automation Logger — SAFE MODE
 *
 * Convenience wrapper re-exporting bridgeLogger with category-scoped helpers.
 * No file I/O. In-memory only.
 */

import { bridgeLog, getLogs, clearLogs, logCount } from './bridgeLogger';
import type { BridgeLogEntry } from '../types/automationTypes';

export type LogCategory =
  | 'bridge'
  | 'agent'
  | 'workflow'
  | 'queue'
  | 'provider'
  | 'memory'
  | 'visual'
  | 'document'
  | 'browser'
  | 'api';

function createCategoryLogger(category: LogCategory) {
  return {
    info: (message: string, meta?: Record<string, unknown>) => bridgeLog('info', category, message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => bridgeLog('warn', category, message, meta),
    error: (message: string, meta?: Record<string, unknown>) => bridgeLog('error', category, message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => bridgeLog('debug', category, message, meta),
  };
}

/** Pre-built category loggers */
export const log = {
  bridge: createCategoryLogger('bridge'),
  agent: createCategoryLogger('agent'),
  workflow: createCategoryLogger('workflow'),
  queue: createCategoryLogger('queue'),
  provider: createCategoryLogger('provider'),
  memory: createCategoryLogger('memory'),
  visual: createCategoryLogger('visual'),
  document: createCategoryLogger('document'),
  browser: createCategoryLogger('browser'),
  api: createCategoryLogger('api'),
};

/** Filter logs by category */
export function getLogsByCategory(category: string, limit?: number): BridgeLogEntry[] {
  const all = getLogs();
  const filtered = all.filter((e) => e.source === category);
  return limit ? filtered.slice(-limit) : filtered;
}

export { getLogs, clearLogs, logCount };
