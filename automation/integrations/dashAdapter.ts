/**
 * Dash Adapter — SAFE MODE / DRY RUN
 *
 * Mock adapter for Dash memory/knowledge-graph integration.
 * No real API calls. Stub only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';

export function createDashAdapter(): ProviderAdapter {
  return {
    name: 'dash',
    connected: false,
    connect() {
      bridgeLog('info', 'dashAdapter', '[DRY RUN] Dash connect — safe mode, no knowledge-graph call');
      return { success: false, message: 'Safe mode — Dash adapter not connected' };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'dashAdapter', '[DRY RUN] Dash disconnected');
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'dashAdapter', `[DRY RUN] Dash.send("${event}") — mock`);
      return { success: false, message: `Safe mode — Dash event "${event}" not sent` };
    },
  };
}

export const dashOps = {
  store(key: string, value: unknown): { success: boolean; message: string } {
    bridgeLog('info', 'dashAdapter', `[DRY RUN] store("${key}") — mock`);
    return { success: false, message: 'Safe mode — Dash store not available' };
  },
  retrieve(key: string): { success: boolean; value: unknown } {
    bridgeLog('info', 'dashAdapter', `[DRY RUN] retrieve("${key}") — mock`);
    return { success: false, value: null };
  },
  query(q: string): { success: boolean; results: unknown[] } {
    bridgeLog('info', 'dashAdapter', `[DRY RUN] query("${q}") — mock`);
    return { success: false, results: [] };
  },
};
