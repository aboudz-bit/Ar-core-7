/**
 * Memory Agent — Types
 *
 * Re-exports canonical types and adds memory-specific types.
 */

export type { MemoryEntry, MemoryQuery, MemoryResult } from '../types/automationTypes';

/** Memory store statistics */
export interface MemoryStats {
  totalEntries: number;
  activeTags: string[];
  sources: string[];
  expiredCount: number;
}

/** Memory index entry for fast tag/source lookup */
export interface MemoryIndexEntry {
  key: string;
  tags: string[];
  source: string;
  createdAt: string;
}
