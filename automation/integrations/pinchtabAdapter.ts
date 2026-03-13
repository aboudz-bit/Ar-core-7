/**
 * PinchTab Adapter — SAFE MODE / DRY RUN
 *
 * Mock adapter for PinchTab browser automation integration.
 * No real browser control. Stub only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';

export function createPinchtabAdapter(): ProviderAdapter {
  return {
    name: 'pinchtab',
    connected: false,
    connect() {
      bridgeLog('info', 'pinchtabAdapter', '[DRY RUN] PinchTab connect — safe mode, no browser hook');
      return { success: false, message: 'Safe mode — PinchTab adapter not connected' };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'pinchtabAdapter', '[DRY RUN] PinchTab disconnected');
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'pinchtabAdapter', `[DRY RUN] PinchTab.send("${event}") — mock`);
      return { success: false, message: `Safe mode — PinchTab event "${event}" not sent` };
    },
  };
}

export const pinchtabOps = {
  navigate(url: string): { success: boolean; message: string } {
    bridgeLog('info', 'pinchtabAdapter', `[DRY RUN] navigate(${url}) — mock`);
    return { success: false, message: 'Safe mode — browser navigation not available' };
  },
  screenshot(): { success: boolean; path: string | null } {
    bridgeLog('info', 'pinchtabAdapter', '[DRY RUN] screenshot() — mock');
    return { success: false, path: null };
  },
  runScript(script: string): { success: boolean; result: unknown } {
    bridgeLog('info', 'pinchtabAdapter', '[DRY RUN] runScript() — mock');
    return { success: false, result: null };
  },
};
