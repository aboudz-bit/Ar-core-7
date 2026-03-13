/**
 * Document Logger — SAFE MODE
 *
 * Separate logging for document tools layer.
 * In-memory only. No file I/O.
 */

import documentConfig from './documentConfig';

export interface DocumentLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

const logStore: DocumentLogEntry[] = [];
const MAX_ENTRIES = 200;

export function documentLog(level: DocumentLogEntry['level'], message: string): void {
  if (!documentConfig.enabled && level === 'debug') return;

  const entry: DocumentLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  logStore.push(entry);
  if (logStore.length > MAX_ENTRIES) logStore.shift();
}

export function getDocumentLogs(limit?: number): DocumentLogEntry[] {
  const all = [...logStore];
  return limit ? all.slice(-limit) : all;
}

export function clearDocumentLogs(): void {
  logStore.length = 0;
}

export function documentLogCount(): number {
  return logStore.length;
}
