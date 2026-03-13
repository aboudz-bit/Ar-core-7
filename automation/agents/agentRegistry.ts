/**
 * Agent Registry — SAFE MODE / DRY RUN
 *
 * Registers and manages automation agent descriptors.
 * No real agent execution. Mock only.
 */

import { AgentDescriptor, ProviderName } from '../types/automationTypes';
import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';

const agents: Map<string, AgentDescriptor> = new Map();

export function registerAgent(agent: AgentDescriptor): void {
  if (!automationConfig.enabled || automationConfig.safeMode) {
    bridgeLog('info', 'agentRegistry', `[DRY RUN] Register agent: ${agent.name}`);
    agents.set(agent.id, { ...agent, active: false });
    return;
  }
  agents.set(agent.id, agent);
}

export function getAgent(id: string): AgentDescriptor | undefined {
  return agents.get(id);
}

export function listAgents(provider?: ProviderName): AgentDescriptor[] {
  const all = Array.from(agents.values());
  return provider ? all.filter((a) => a.provider === provider) : all;
}

export function removeAgent(id: string): boolean {
  return agents.delete(id);
}

export function clearAgents(): void {
  agents.clear();
}
