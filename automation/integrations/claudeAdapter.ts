/**
 * Claude Adapter — SAFE MODE / DRY RUN
 *
 * Mock adapter for Claude AI integration.
 * No real API calls. No SDK usage. Stub only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';

export function createClaudeAdapter(): ProviderAdapter {
  return {
    name: 'claude',
    connected: false,
    connect() {
      bridgeLog('info', 'claudeAdapter', '[DRY RUN] Claude connect — safe mode, no API call');
      return { success: false, message: 'Safe mode — Claude adapter not connected' };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'claudeAdapter', '[DRY RUN] Claude disconnected');
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'claudeAdapter', `[DRY RUN] Claude.send("${event}") — mock response`);
      return { success: false, message: `Safe mode — Claude event "${event}" not sent` };
    },
  };
}

/** Mock Claude-specific operations */
export const claudeOps = {
  analyze(prompt: string): { success: boolean; response: string } {
    bridgeLog('info', 'claudeAdapter', `[DRY RUN] analyze — "${prompt.slice(0, 50)}..."`);
    return { success: false, response: '[Mock] Claude analysis not available in safe mode' };
  },
  recommend(context: Record<string, unknown>): { success: boolean; recommendation: string } {
    bridgeLog('info', 'claudeAdapter', '[DRY RUN] recommend — mock');
    return { success: false, recommendation: '[Mock] Claude recommendation not available in safe mode' };
  },
};
