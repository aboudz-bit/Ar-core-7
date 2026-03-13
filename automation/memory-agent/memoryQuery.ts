/**
 * Memory Query — SAFE MODE
 *
 * Structured query engine for the memory store.
 * Supports filtering by key, tags, source, and limit.
 */

import { getAll, get } from './memoryStore';
import type { MemoryQuery, MemoryResult, MemoryEntry } from '../types/automationTypes';
import { bridgeLog } from '../scripts/bridgeLogger';

/** Execute a memory query */
export function executeQuery(query: MemoryQuery): MemoryResult {
  let entries: MemoryEntry[];

  // Fast path: exact key lookup
  if (query.key) {
    const entry = get(query.key);
    entries = entry ? [entry] : [];
  } else {
    entries = getAll();
  }

  // Filter by tags
  if (query.tags && query.tags.length > 0) {
    entries = entries.filter((e) =>
      query.tags!.every((tag) => e.tags.includes(tag)),
    );
  }

  // Filter by source
  if (query.source) {
    entries = entries.filter((e) => e.source === query.source);
  }

  const total = entries.length;

  // Apply limit
  if (query.limit && query.limit > 0) {
    entries = entries.slice(0, query.limit);
  }

  bridgeLog('info', 'memoryQuery', `[DRY RUN] Query matched ${total} entries (returned ${entries.length})`);

  return { entries, total, query };
}
