/**
 * Memory Logger — SAFE MODE
 *
 * Separate logging for the memory agent layer.
 * In-memory only. No file I/O.
 */

import memoryConfig from './memoryConfig';

export interface MemoryLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  key?: string;
}

const logStore: MemoryLogEntry[] = [];
const MAX_ENTRIES = 200;

export function memoryLog(level: MemoryLogEntry['level'], message: string, key?: string): void {
  if (!memoryConfig.enabled && level === 'debug') return;

  const entry: MemoryLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    key,
  };

  logStore.push(entry);
  if (logStore.length > MAX_ENTRIES) logStore.shift();
}

export function getMemoryLogs(limit?: number): MemoryLogEntry[] {
  const all = [...logStore];
  return limit ? all.slice(-limit) : all;
}

export function clearMemoryLogs(): void {
  logStore.length = 0;
}
