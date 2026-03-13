/**
 * AR-CORE-7 Automation Bridge — Core Types
 *
 * Shared type definitions for agents, workflows, integrations, and queue.
 * SAFE MODE — no runtime behavior.
 */

/** Supported external providers */
export type ProviderName = 'claude' | 'n8n' | 'paperclip' | 'pinchtab' | 'dash';

/** Automation task status */
export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped';

/** A single automation task descriptor */
export interface AutomationTask {
  id: string;
  name: string;
  provider: ProviderName;
  status: TaskStatus;
  payload: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
  result: unknown | null;
  error: string | null;
  dryRun: boolean;
}

/** Workflow definition — a sequence of tasks */
export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  createdAt: string;
}

export interface WorkflowStep {
  stepId: string;
  taskName: string;
  provider: ProviderName;
  dependsOn: string[];
  config: Record<string, unknown>;
}

/** Agent descriptor */
export interface AgentDescriptor {
  id: string;
  name: string;
  provider: ProviderName;
  capabilities: string[];
  active: boolean;
}

/** Queue item */
export interface QueueItem {
  id: string;
  task: AutomationTask;
  priority: number;
  addedAt: string;
}

/** Integration hook */
export interface IntegrationHook {
  id: string;
  provider: ProviderName;
  event: string;
  endpoint: string;
  active: boolean;
}

/** Bridge event log entry */
export interface BridgeLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  meta?: Record<string, unknown>;
}
