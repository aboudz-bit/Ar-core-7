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

// ---------------------------------------------------------------------------
// Extended types — Phase 2
// ---------------------------------------------------------------------------

/** Execution mode across the entire automation bridge */
export type ExecutionMode = 'dry-run' | 'safe' | 'live';

/** Workflow job — a running instance of a workflow */
export interface WorkflowJob {
  id: string;
  workflowId: string;
  status: TaskStatus;
  mode: ExecutionMode;
  startedAt: string;
  completedAt: string | null;
  stepResults: { stepId: string; status: TaskStatus; message: string }[];
  error: string | null;
}

/** Agent task — a task assigned to a specific agent */
export interface AgentTask {
  id: string;
  agentId: string;
  taskName: string;
  provider: ProviderName;
  status: TaskStatus;
  payload: Record<string, unknown>;
  result: unknown | null;
  dryRun: boolean;
  createdAt: string;
  completedAt: string | null;
}

/** Provider request — outbound message to a provider */
export interface ProviderRequest {
  id: string;
  provider: ProviderName;
  event: string;
  payload: Record<string, unknown>;
  sentAt: string;
  mode: ExecutionMode;
}

/** Provider response — inbound response from a provider */
export interface ProviderResponse {
  requestId: string;
  provider: ProviderName;
  success: boolean;
  data: unknown | null;
  error: string | null;
  receivedAt: string;
}

/** Browser automation task (PinchTab ready) */
export interface BrowserTask {
  id: string;
  action: 'navigate' | 'screenshot' | 'click' | 'type' | 'evaluate' | 'wait';
  target: string;
  value?: string;
  timeout?: number;
  dryRun: boolean;
}

/** Browser task result */
export interface BrowserTaskResult {
  taskId: string;
  success: boolean;
  action: BrowserTask['action'];
  result: unknown | null;
  error: string | null;
  durationMs: number;
  dryRun: boolean;
}

/** Visual explainer request */
export interface VisualExplainRequest {
  id: string;
  subject: string;
  sections: VisualExplainSection[];
  format: 'text' | 'json' | 'diagram';
}

/** Visual explainer result */
export interface VisualExplainResult {
  requestId: string;
  subject: string;
  output: string;
  sections: VisualExplainSection[];
  diagram: { nodes: VisualDiagramNode[]; edges: VisualDiagramEdge[] } | null;
  createdAt: string;
}

/** A section within a visual explanation */
export interface VisualExplainSection {
  title: string;
  content: string;
  order: number;
}

/** Node in a visual diagram */
export interface VisualDiagramNode {
  id: string;
  label: string;
  type: 'start' | 'action' | 'decision' | 'end' | 'provider' | 'data';
  description: string;
  meta?: Record<string, unknown>;
}

/** Edge in a visual diagram */
export interface VisualDiagramEdge {
  from: string;
  to: string;
  label?: string;
  condition?: string;
}

/** Memory query request */
export interface MemoryQuery {
  key?: string;
  tags?: string[];
  source?: string;
  limit?: number;
  includeExpired?: boolean;
}

/** Memory query result */
export interface MemoryResult {
  entries: MemoryEntry[];
  total: number;
  query: MemoryQuery;
}

/** Memory entry (canonical definition) */
export interface MemoryEntry {
  key: string;
  value: unknown;
  source: string;
  createdAt: string;
  expiresAt: string | null;
  tags: string[];
}
