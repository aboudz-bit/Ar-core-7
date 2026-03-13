/**
 * Bridge Logger — SAFE MODE
 *
 * Centralized logging for the automation bridge.
 * In-memory log store. No file I/O. No external calls.
 */

import { BridgeLogEntry } from '../types/automationTypes';
import automationConfig from '../config/automationConfig';

const logStore: BridgeLogEntry[] = [];
const MAX_LOG_ENTRIES = 500;

const LOG_PRIORITY: Record<string, number> = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

export function bridgeLog(
  level: BridgeLogEntry['level'],
  source: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  const configPriority = LOG_PRIORITY[automationConfig.logLevel] ?? 0;
  const msgPriority = LOG_PRIORITY[level] ?? 0;

  if (msgPriority > configPriority) return;

  const entry: BridgeLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    source,
    message,
    meta,
  };

  logStore.push(entry);
  if (logStore.length > MAX_LOG_ENTRIES) logStore.shift();
}

export function getLogs(limit?: number): BridgeLogEntry[] {
  const all = [...logStore];
  return limit ? all.slice(-limit) : all;
}

export function clearLogs(): void {
  logStore.length = 0;
}

export function logCount(): number {
  return logStore.length;
}
