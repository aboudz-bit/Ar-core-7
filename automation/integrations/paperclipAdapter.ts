/**
 * Paperclip Adapter — SAFE MODE / DRY RUN
 *
 * Mock adapter for Paperclip document/asset management integration.
 * No real API calls. Stub only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';

export function createPaperclipAdapter(): ProviderAdapter {
  return {
    name: 'paperclip',
    connected: false,
    connect() {
      bridgeLog('info', 'paperclipAdapter', '[DRY RUN] Paperclip connect — safe mode');
      return { success: false, message: 'Safe mode — Paperclip adapter not connected' };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'paperclipAdapter', '[DRY RUN] Paperclip disconnected');
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'paperclipAdapter', `[DRY RUN] Paperclip.send("${event}") — mock`);
      return { success: false, message: `Safe mode — Paperclip event "${event}" not sent` };
    },
  };
}

export const paperclipOps = {
  uploadAsset(assetId: string, data: Record<string, unknown>): { success: boolean; url: string | null } {
    bridgeLog('info', 'paperclipAdapter', `[DRY RUN] uploadAsset(${assetId}) — mock`);
    return { success: false, url: null };
  },
  getAsset(assetId: string): { success: boolean; data: Record<string, unknown> | null } {
    bridgeLog('info', 'paperclipAdapter', `[DRY RUN] getAsset(${assetId}) — mock`);
    return { success: false, data: null };
  },
};
