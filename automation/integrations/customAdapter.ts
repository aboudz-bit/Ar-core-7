/**
 * Custom Adapter — SAFE MODE / DRY RUN
 *
 * Generic adapter factory for user-defined provider integrations.
 * No real connections. Template for extending the integration layer.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';
import type { ProviderName } from '../types/automationTypes';

export interface CustomAdapterConfig {
  label: string;
  providerSlot: ProviderName;
  baseUrl?: string;
  headers?: Record<string, string>;
}

export function createCustomAdapter(config: CustomAdapterConfig): ProviderAdapter {
  const { label, providerSlot } = config;

  return {
    name: providerSlot,
    connected: false,
    connect() {
      bridgeLog('info', 'customAdapter', `[DRY RUN] ${label} connect — safe mode`);
      return { success: false, message: `Safe mode — ${label} adapter not connected` };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'customAdapter', `[DRY RUN] ${label} disconnected`);
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'customAdapter', `[DRY RUN] ${label}.send("${event}") — mock`);
      return { success: false, message: `Safe mode — ${label} event "${event}" not sent` };
    },
  };
}
