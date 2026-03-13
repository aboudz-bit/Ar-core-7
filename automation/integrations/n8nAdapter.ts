/**
 * n8n Adapter — SAFE MODE / DRY RUN
 *
 * Mock adapter for n8n workflow automation integration.
 * No real webhook calls. Stub only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';

export function createN8nAdapter(): ProviderAdapter {
  return {
    name: 'n8n',
    connected: false,
    connect() {
      bridgeLog('info', 'n8nAdapter', '[DRY RUN] n8n connect — safe mode, no webhook registration');
      return { success: false, message: 'Safe mode — n8n adapter not connected' };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'n8nAdapter', '[DRY RUN] n8n disconnected');
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'n8nAdapter', `[DRY RUN] n8n.send("${event}") — no webhook fired`);
      return { success: false, message: `Safe mode — n8n event "${event}" not sent` };
    },
  };
}

/** Mock n8n-specific operations */
export const n8nOps = {
  triggerWorkflow(webhookId: string, data: Record<string, unknown>): { success: boolean; executionId: string | null } {
    bridgeLog('info', 'n8nAdapter', `[DRY RUN] triggerWorkflow(${webhookId}) — mock`);
    return { success: false, executionId: null };
  },
  getExecutionStatus(executionId: string): { success: boolean; status: string } {
    bridgeLog('info', 'n8nAdapter', `[DRY RUN] getExecutionStatus(${executionId}) — mock`);
    return { success: false, status: 'mock-not-available' };
  },
};
