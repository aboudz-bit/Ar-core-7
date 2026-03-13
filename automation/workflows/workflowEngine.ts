/**
 * Workflow Engine — SAFE MODE / DRY RUN
 *
 * Manages workflow definitions and simulates execution.
 * No real task execution. Mock only.
 */

import { Workflow, WorkflowStep, TaskStatus } from '../types/automationTypes';
import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';

const workflows: Map<string, Workflow> = new Map();

export function registerWorkflow(workflow: Workflow): void {
  bridgeLog('info', 'workflowEngine', `[DRY RUN] Register workflow: ${workflow.name}`);
  workflows.set(workflow.id, workflow);
}

export function getWorkflow(id: string): Workflow | undefined {
  return workflows.get(id);
}

export function listWorkflows(): Workflow[] {
  return Array.from(workflows.values());
}

export function removeWorkflow(id: string): boolean {
  return workflows.delete(id);
}

export interface WorkflowRunResult {
  workflowId: string;
  dryRun: boolean;
  steps: { stepId: string; status: TaskStatus; message: string }[];
}

/** Simulate running a workflow — always dry run */
export function runWorkflow(id: string): WorkflowRunResult {
  const workflow = workflows.get(id);
  if (!workflow) {
    return { workflowId: id, dryRun: true, steps: [{ stepId: 'N/A', status: 'failed', message: 'Workflow not found' }] };
  }

  bridgeLog('info', 'workflowEngine', `[DRY RUN] Executing workflow: ${workflow.name}`);

  const stepResults = workflow.steps.map((step: WorkflowStep) => {
    if (!automationConfig.enabled || automationConfig.safeMode) {
      return { stepId: step.stepId, status: 'skipped' as TaskStatus, message: `Safe mode — step "${step.taskName}" skipped` };
    }
    return { stepId: step.stepId, status: 'completed' as TaskStatus, message: `Step "${step.taskName}" completed` };
  });

  return { workflowId: id, dryRun: automationConfig.safeMode, steps: stepResults };
}
