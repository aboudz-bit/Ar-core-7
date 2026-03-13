/**
 * OpenAI Adapter — SAFE MODE / DRY RUN
 *
 * Mock adapter for optional OpenAI integration.
 * No real API calls. No SDK usage. Stub only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import type { ProviderAdapter } from './providerAdapters';
import type { ProviderName } from '../types/automationTypes';

/** OpenAI uses the 'custom' provider name slot since it's not a core provider */
const PROVIDER_LABEL = 'openai';

export function createOpenaiAdapter(): ProviderAdapter {
  return {
    name: 'claude' as ProviderName, // placeholder — openai not in core ProviderName union
    connected: false,
    connect() {
      bridgeLog('info', 'openaiAdapter', '[DRY RUN] OpenAI connect — safe mode, no API call');
      return { success: false, message: 'Safe mode — OpenAI adapter not connected' };
    },
    disconnect() {
      this.connected = false;
      bridgeLog('info', 'openaiAdapter', '[DRY RUN] OpenAI disconnected');
    },
    send(event: string, payload: Record<string, unknown>) {
      bridgeLog('info', 'openaiAdapter', `[DRY RUN] OpenAI.send("${event}") — mock`);
      return { success: false, message: `Safe mode — OpenAI event "${event}" not sent` };
    },
  };
}

export const openaiOps = {
  complete(prompt: string): { success: boolean; response: string } {
    bridgeLog('info', 'openaiAdapter', `[DRY RUN] complete — "${prompt.slice(0, 50)}..."`);
    return { success: false, response: '[Mock] OpenAI completion not available in safe mode' };
  },
  embed(text: string): { success: boolean; embedding: number[] } {
    bridgeLog('info', 'openaiAdapter', '[DRY RUN] embed — mock');
    return { success: false, embedding: [] };
  },
};
