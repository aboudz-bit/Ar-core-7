/**
 * Memory Index — SAFE MODE
 *
 * In-memory secondary index for fast lookup by tag and source.
 * Rebuilt from memory store contents on demand.
 */

import { getAll } from './memoryStore';
import type { MemoryEntry } from '../types/automationTypes';
import type { MemoryIndexEntry, MemoryStats } from './memoryTypes';

/** Build index entries from current store */
export function buildIndex(): MemoryIndexEntry[] {
  return getAll().map((entry) => ({
    key: entry.key,
    tags: entry.tags,
    source: entry.source,
    createdAt: entry.createdAt,
  }));
}

/** Find keys matching a tag */
export function findByTag(tag: string): string[] {
  return getAll()
    .filter((e) => e.tags.includes(tag))
    .map((e) => e.key);
}

/** Find keys matching a source */
export function findBySource(source: string): string[] {
  return getAll()
    .filter((e) => e.source === source)
    .map((e) => e.key);
}

/** Get all unique tags across all entries */
export function allTags(): string[] {
  const tags = new Set<string>();
  for (const entry of getAll()) {
    for (const tag of entry.tags) tags.add(tag);
  }
  return Array.from(tags);
}

/** Get all unique sources */
export function allSources(): string[] {
  const sources = new Set<string>();
  for (const entry of getAll()) sources.add(entry.source);
  return Array.from(sources);
}

/** Get memory stats */
export function getStats(): MemoryStats {
  const entries = getAll();
  return {
    totalEntries: entries.length,
    activeTags: allTags(),
    sources: allSources(),
    expiredCount: 0, // already purged by getAll
  };
}
