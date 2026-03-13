/**
 * Automation Bridge — SAFE MODE / DRY RUN
 *
 * Central bridge orchestrator. Connects agents, workflows, queue, and providers.
 * All execution is mock-only when safeMode is true (default).
 */

import automationConfig from '../config/automationConfig';
import { bridgeLog } from './bridgeLogger';
import { listAgents, getAgent } from '../agents/agentRegistry';
import { getWorkflow, runWorkflow } from '../workflows/workflowEngine';
import { enqueue, processQueue, listQueue } from '../queue/taskQueue';
import { getAdapter } from '../integrations/providerAdapters';
import type { AutomationTask, ProviderName, TaskStatus } from '../types/automationTypes';

export interface BridgeStatus {
  enabled: boolean;
  safeMode: boolean;
  agentCount: number;
  queueSize: number;
  providers: { name: ProviderName; connected: boolean }[];
}

/** Get current bridge status */
export function getBridgeStatus(): BridgeStatus {
  const providerNames: ProviderName[] = ['claude', 'n8n', 'paperclip', 'pinchtab', 'dash'];
  return {
    enabled: automationConfig.enabled,
    safeMode: automationConfig.safeMode,
    agentCount: listAgents().length,
    queueSize: listQueue().length,
    providers: providerNames.map((name) => ({
      name,
      connected: getAdapter(name).connected,
    })),
  };
}

/** Submit a task through the bridge */
export function submitTask(
  name: string,
  provider: ProviderName,
  payload: Record<string, unknown>,
  priority: number = 0,
): { success: boolean; message: string; taskId?: string } {
  if (!automationConfig.enabled) {
    bridgeLog('warn', 'automationBridge', `Bridge disabled — task "${name}" rejected`);
    return { success: false, message: 'Automation bridge is disabled' };
  }

  const task: AutomationTask = {
    id: `task-${Date.now()}`,
    name,
    provider,
    status: 'pending',
    payload,
    createdAt: new Date().toISOString(),
    completedAt: null,
    result: null,
    error: null,
    dryRun: automationConfig.safeMode,
  };

  const queued = enqueue(task, priority);
  bridgeLog('info', 'automationBridge', `[DRY RUN] Task submitted: ${name} → queue (${queued.id})`);
  return { success: true, message: `Task queued as ${queued.id} (dry run)`, taskId: queued.id };
}

/** Execute a workflow through the bridge */
export function executeWorkflow(workflowId: string): {
  success: boolean;
  message: string;
  result?: ReturnType<typeof runWorkflow>;
} {
  if (!automationConfig.enabled) {
    return { success: false, message: 'Automation bridge is disabled' };
  }

  const workflow = getWorkflow(workflowId);
  if (!workflow) {
    return { success: false, message: `Workflow "${workflowId}" not found` };
  }

  bridgeLog('info', 'automationBridge', `[DRY RUN] Executing workflow: ${workflow.name}`);
  const result = runWorkflow(workflowId);
  return { success: true, message: `Workflow executed (dry run)`, result };
}

/** Send an event to a provider through the bridge */
export function sendToProvider(
  provider: ProviderName,
  event: string,
  payload: Record<string, unknown>,
): { success: boolean; message: string } {
  if (!automationConfig.enabled) {
    return { success: false, message: 'Automation bridge is disabled' };
  }

  const adapter = getAdapter(provider);
  return adapter.send(event, payload);
}

/** Process all queued tasks */
export function flushQueue(): { processed: number; results: { id: string; status: TaskStatus }[] } {
  bridgeLog('info', 'automationBridge', '[DRY RUN] Flushing queue');
  return processQueue();
}
