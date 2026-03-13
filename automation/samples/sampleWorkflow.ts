/**
 * Sample Workflow — DRY RUN DEMO
 *
 * Example showing how a workflow would be registered and simulated.
 * This file is for reference only — not imported anywhere.
 */

import { registerWorkflow, runWorkflow } from '../workflows/workflowEngine';
import { registerAgent } from '../agents/agentRegistry';
import { enqueue, processQueue } from '../queue/taskQueue';
import type { Workflow, AgentDescriptor, AutomationTask } from '../types/automationTypes';

/** Example: register a sample agent */
const sampleAgent: AgentDescriptor = {
  id: 'agent-claude-1',
  name: 'Claude Try-On Assistant',
  provider: 'claude',
  capabilities: ['size-recommendation', 'garment-analysis'],
  active: false,
};

/** Example: register a sample workflow */
const sampleWorkflow: Workflow = {
  id: 'wf-tryon-pipeline',
  name: 'Virtual Try-On Pipeline',
  description: 'End-to-end try-on: upload → process → recommend → output',
  steps: [
    { stepId: 's1', taskName: 'Upload garment', provider: 'n8n', dependsOn: [], config: {} },
    { stepId: 's2', taskName: 'Process body scan', provider: 'claude', dependsOn: ['s1'], config: {} },
    { stepId: 's3', taskName: 'Generate recommendation', provider: 'dash', dependsOn: ['s2'], config: {} },
    { stepId: 's4', taskName: 'Render output', provider: 'paperclip', dependsOn: ['s3'], config: {} },
  ],
  createdAt: new Date().toISOString(),
};

/** Example: enqueue a task */
const sampleTask: AutomationTask = {
  id: 'task-1',
  name: 'Analyze garment specs',
  provider: 'claude',
  status: 'pending',
  payload: { productId: 'mp-001', action: 'analyze' },
  createdAt: new Date().toISOString(),
  completedAt: null,
  result: null,
  error: null,
  dryRun: true,
};

export function runSampleDemo() {
  registerAgent(sampleAgent);
  registerWorkflow(sampleWorkflow);
  enqueue(sampleTask, 10);

  const workflowResult = runWorkflow(sampleWorkflow.id);
  const queueResult = processQueue();

  return {
    message: 'Sample demo executed in DRY RUN mode',
    workflowResult,
    queueResult,
  };
}
