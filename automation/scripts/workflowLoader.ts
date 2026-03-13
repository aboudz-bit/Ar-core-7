/**
 * Workflow Loader — SAFE MODE / DRY RUN
 *
 * Loads workflow definitions from JSON descriptors.
 * No file I/O in safe mode — uses in-memory samples only.
 */

import { registerWorkflow } from '../workflows/workflowEngine';
import { bridgeLog } from './bridgeLogger';
import automationConfig from '../config/automationConfig';
import type { Workflow, WorkflowStep, ProviderName } from '../types/automationTypes';

/** Parse a raw JSON object into a Workflow */
export function parseWorkflowJSON(raw: Record<string, unknown>): Workflow | null {
  try {
    const id = raw.id as string;
    const name = raw.name as string;
    const description = (raw.description as string) || '';
    const rawSteps = raw.steps as Record<string, unknown>[];

    if (!id || !name || !Array.isArray(rawSteps)) return null;

    const steps: WorkflowStep[] = rawSteps.map((s, i) => ({
      stepId: (s.stepId as string) || `step-${i}`,
      taskName: (s.taskName as string) || `Step ${i}`,
      provider: (s.provider as ProviderName) || 'claude',
      dependsOn: (s.dependsOn as string[]) || [],
      config: (s.config as Record<string, unknown>) || {},
    }));

    return { id, name, description, steps, createdAt: new Date().toISOString() };
  } catch {
    return null;
  }
}

/** Load and register a workflow from a JSON descriptor */
export function loadWorkflow(raw: Record<string, unknown>): { success: boolean; message: string } {
  const workflow = parseWorkflowJSON(raw);
  if (!workflow) {
    return { success: false, message: 'Invalid workflow JSON' };
  }

  registerWorkflow(workflow);
  bridgeLog('info', 'workflowLoader', `[DRY RUN] Loaded workflow: ${workflow.name}`);
  return { success: true, message: `Workflow "${workflow.name}" loaded` };
}

/** Load multiple workflows from an array of JSON descriptors */
export function loadWorkflows(rawList: Record<string, unknown>[]): { loaded: number; errors: number } {
  let loaded = 0;
  let errors = 0;

  for (const raw of rawList) {
    const result = loadWorkflow(raw);
    if (result.success) loaded++;
    else errors++;
  }

  bridgeLog('info', 'workflowLoader', `[DRY RUN] Bulk load complete: ${loaded} loaded, ${errors} errors`);
  return { loaded, errors };
}
