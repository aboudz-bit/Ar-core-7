/**
 * Memory Agent — Configuration
 *
 * SAFE MODE — in-memory only. No persistence. No external calls.
 */

export interface MemoryAgentConfig {
  enabled: boolean;
  safeMode: boolean;
  maxEntries: number;
  defaultTtlMs: number | null;
  allowPersistence: boolean;
  allowExternalSync: boolean;
}

const memoryConfig: MemoryAgentConfig = {
  enabled: false,
  safeMode: true,
  maxEntries: 1000,
  defaultTtlMs: null,
  allowPersistence: false,
  allowExternalSync: false,
};

export default memoryConfig;
