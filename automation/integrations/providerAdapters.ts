/**
 * Provider Adapters — SAFE MODE / DRY RUN
 *
 * Adapter stubs for external automation providers.
 * No real connections. Mock only.
 */

import { ProviderName, IntegrationHook } from '../types/automationTypes';
import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';

export interface ProviderAdapter {
  name: ProviderName;
  connected: boolean;
  connect(): { success: boolean; message: string };
  disconnect(): void;
  send(event: string, payload: Record<string, unknown>): { success: boolean; message: string };
}

function createMockAdapter(name: ProviderName): ProviderAdapter {
  return {
    name,
    connected: false,
    connect() {
      bridgeLog('info', 'providerAdapters', `[DRY RUN] ${name} connect — safe mode, no real connection`);
      return { success: false, message: `Safe mode — ${name} adapter not connected` };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'providerAdapters', `[DRY RUN] ${name} disconnected`);
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'providerAdapters', `[DRY RUN] ${name}.send("${event}") — not delivered`);
      return { success: false, message: `Safe mode — event "${event}" not delivered to ${name}` };
    },
  };
}

/** Pre-built adapters for all supported providers */
export const adapters: Record<ProviderName, ProviderAdapter> = {
  claude: createMockAdapter('claude'),
  n8n: createMockAdapter('n8n'),
  paperclip: createMockAdapter('paperclip'),
  pinchtab: createMockAdapter('pinchtab'),
  dash: createMockAdapter('dash'),
};

export function getAdapter(name: ProviderName): ProviderAdapter {
  return adapters[name];
}

/** Integration hooks registry */
const hooks: IntegrationHook[] = [];

export function registerHook(hook: IntegrationHook): void {
  hooks.push(hook);
  bridgeLog('info', 'providerAdapters', `[DRY RUN] Registered hook: ${hook.event} → ${hook.provider}`);
}

export function listHooks(provider?: ProviderName): IntegrationHook[] {
  return provider ? hooks.filter((h) => h.provider === provider) : [...hooks];
}
