/**
 * Integration Manager — SAFE MODE / DRY RUN
 *
 * Central registry for all provider integrations.
 * Manages adapter lifecycle and routes events to the correct provider.
 */

import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderName, IntegrationHook } from '../types/automationTypes';
import type { ProviderAdapter } from './providerAdapters';

const adapterRegistry: Map<string, ProviderAdapter> = new Map();
const hookRegistry: IntegrationHook[] = [];

/** Register an adapter */
export function registerAdapter(adapter: ProviderAdapter): void {
  adapterRegistry.set(adapter.name, adapter);
  bridgeLog('info', 'integrationManager', `[DRY RUN] Registered adapter: ${adapter.name}`);
}

/** Get a registered adapter */
export function getRegisteredAdapter(name: string): ProviderAdapter | undefined {
  return adapterRegistry.get(name);
}

/** List all registered adapters */
export function listAdapters(): ProviderAdapter[] {
  return Array.from(adapterRegistry.values());
}

/** Connect all registered adapters (mock in safe mode) */
export function connectAll(): { provider: string; success: boolean; message: string }[] {
  return listAdapters().map((adapter) => {
    const result = adapter.connect();
    return { provider: adapter.name, ...result };
  });
}

/** Disconnect all registered adapters */
export function disconnectAll(): void {
  listAdapters().forEach((adapter) => adapter.disconnect());
  bridgeLog('info', 'integrationManager', '[DRY RUN] All adapters disconnected');
}

/** Register an integration hook */
export function addHook(hook: IntegrationHook): void {
  hookRegistry.push(hook);
  bridgeLog('info', 'integrationManager', `[DRY RUN] Hook registered: ${hook.event} → ${hook.provider}`);
}

/** Fire an event — routes to matching hooks (mock in safe mode) */
export function fireEvent(event: string, payload: Record<string, unknown>): {
  event: string;
  dispatched: { provider: string; success: boolean }[];
} {
  const matching = hookRegistry.filter((h) => h.event === event && h.active);
  const dispatched = matching.map((hook) => {
    const adapter = adapterRegistry.get(hook.provider);
    if (!adapter) return { provider: hook.provider, success: false };
    const result = adapter.send(event, payload);
    return { provider: hook.provider, success: result.success };
  });

  bridgeLog('info', 'integrationManager', `[DRY RUN] Event "${event}" → ${dispatched.length} hooks`);
  return { event, dispatched };
}

/** List all hooks, optionally filtered by provider */
export function listRegisteredHooks(provider?: ProviderName): IntegrationHook[] {
  return provider ? hookRegistry.filter((h) => h.provider === provider) : [...hookRegistry];
}
