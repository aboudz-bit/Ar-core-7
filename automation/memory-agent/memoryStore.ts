/**
 * Memory Store — SAFE MODE / DRY RUN
 *
 * Low-level in-memory storage backing the memory agent.
 * Separated from memoryAgent.ts for cleaner architecture.
 */

import memoryConfig from './memoryConfig';
import type { MemoryEntry } from '../types/automationTypes';

const store: Map<string, MemoryEntry> = new Map();

/** Check if an entry has expired */
function isExpired(entry: MemoryEntry): boolean {
  return entry.expiresAt !== null && new Date(entry.expiresAt) < new Date();
}

/** Set an entry (overwrites if key exists) */
export function set(key: string, entry: MemoryEntry): boolean {
  if (store.size >= memoryConfig.maxEntries && !store.has(key)) {
    return false; // capacity exceeded
  }
  store.set(key, entry);
  return true;
}

/** Get an entry by key (returns undefined if expired) */
export function get(key: string): MemoryEntry | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (isExpired(entry)) {
    store.delete(key);
    return undefined;
  }
  return entry;
}

/** Delete an entry */
export function del(key: string): boolean {
  return store.delete(key);
}

/** Check if key exists and is not expired */
export function has(key: string): boolean {
  return get(key) !== undefined;
}

/** Get all non-expired entries */
export function getAll(): MemoryEntry[] {
  const entries: MemoryEntry[] = [];
  const expired: string[] = [];
  store.forEach((entry, key) => {
    if (isExpired(entry)) {
      expired.push(key);
    } else {
      entries.push(entry);
    }
  });
  expired.forEach((key) => store.delete(key));
  return entries;
}

/** Get store size (including possibly expired) */
export function size(): number {
  return store.size;
}

/** Clear all entries */
export function clear(): void {
  store.clear();
}

/** Purge expired entries and return count removed */
export function purgeExpired(): number {
  let removed = 0;
  const expired: string[] = [];
  store.forEach((entry, key) => {
    if (isExpired(entry)) expired.push(key);
  });
  expired.forEach((key) => { store.delete(key); removed++; });
  return removed;
}
