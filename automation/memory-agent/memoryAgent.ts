/**
 * Memory Agent — SAFE MODE / DRY RUN (Dash Ready)
 *
 * In-memory key-value store for automation context and session memory.
 * No persistence. No external calls. No file I/O.
 */

import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';

export interface MemoryEntry {
  key: string;
  value: unknown;
  source: string;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
}

const memory: Map<string, MemoryEntry> = new Map();

export function remember(key: string, value: unknown, source: string, tags: string[] = [], ttlMs?: number): MemoryEntry {
  const entry: MemoryEntry = {
    key,
    value,
    source,
    createdAt: new Date().toISOString(),
    expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : null,
    tags,
  };

  memory.set(key, entry);
  bridgeLog('info', 'memoryAgent', `[DRY RUN] Remember: "${key}" from ${source}`);
  return entry;
}

export function recall(key: string): MemoryEntry | undefined {
  const entry = memory.get(key);
  if (!entry) return undefined;

  // Check expiry
  if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
    memory.delete(key);
    return undefined;
  }

  return entry;
}

export function forget(key: string): boolean {
  return memory.delete(key);
}

export function search(tag: string): MemoryEntry[] {
  return Array.from(memory.values()).filter((e) => {
    if (e.expiresAt && new Date(e.expiresAt) < new Date()) return false;
    return e.tags.includes(tag);
  });
}

export function listMemory(): MemoryEntry[] {
  return Array.from(memory.values()).filter((e) => {
    if (e.expiresAt && new Date(e.expiresAt) < new Date()) return false;
    return true;
  });
}

export function clearMemory(): void {
  memory.clear();
  bridgeLog('info', 'memoryAgent', 'Memory cleared');
}

export function memorySize(): number {
  return memory.size;
}
