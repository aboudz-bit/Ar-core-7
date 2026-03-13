/**
 * Visual Explainer — Pre-built Templates
 *
 * Static explanation templates for AR-CORE-7 architecture.
 * No runtime behavior. Data only.
 */

import type { ExplainerTemplate } from './visualExplainerTypes';

export const templates: Record<string, ExplainerTemplate> = {
  'ar-core-architecture': {
    id: 'ar-core-architecture',
    title: 'AR-CORE-7 Architecture',
    description: 'High-level overview of the AR-CORE-7 platform architecture.',
    sections: [
      { title: 'Frontend', content: 'Next.js app with React components for dashboard, AR viewer, and virtual try-on.', order: 1 },
      { title: 'API Layer', content: 'Next.js API routes handling auth, products, experiences, try-on jobs, and analytics.', order: 2 },
      { title: 'AR Pipeline', content: 'MediaPipe-based face/body tracking, garment warping, and composite rendering.', order: 3 },
      { title: 'Data Layer', content: 'Prisma ORM with PostgreSQL for companies, products, experiences, and assets.', order: 4 },
      { title: 'Merchant Dashboard', content: 'Company-scoped product management with garment specs, size charts, and try-on preview.', order: 5 },
    ],
    diagramNodes: [
      { id: 'fe', label: 'Frontend (Next.js)', type: 'action', description: 'React UI + AR components' },
      { id: 'api', label: 'API Routes', type: 'action', description: 'REST endpoints' },
      { id: 'ar', label: 'AR Pipeline', type: 'action', description: 'MediaPipe + warping' },
      { id: 'db', label: 'Database', type: 'data', description: 'Prisma + PostgreSQL' },
    ],
    diagramEdges: [
      { from: 'fe', to: 'api', label: 'fetch' },
      { from: 'api', to: 'db', label: 'prisma' },
      { from: 'fe', to: 'ar', label: 'camera feed' },
      { from: 'ar', to: 'api', label: 'try-on jobs' },
    ],
  },

  'automation-bridge': {
    id: 'automation-bridge',
    title: 'Automation Bridge Architecture',
    description: 'How the automation bridge connects providers to AR-CORE-7.',
    sections: [
      { title: 'Bridge Core', content: 'Central orchestrator managing agents, workflows, and task queue.', order: 1 },
      { title: 'Provider Adapters', content: 'Mock adapters for Claude, n8n, Paperclip, PinchTab, Dash, and custom providers.', order: 2 },
      { title: 'Queue System', content: 'Priority-based in-memory task queue with job lifecycle management.', order: 3 },
      { title: 'Safe Mode', content: 'All execution disabled by default. Dry-run only. No real API calls.', order: 4 },
    ],
    diagramNodes: [
      { id: 'bridge', label: 'Automation Bridge', type: 'start', description: 'Central orchestrator' },
      { id: 'queue', label: 'Task Queue', type: 'action', description: 'Priority job queue' },
      { id: 'agents', label: 'Agent Registry', type: 'action', description: 'Registered agents' },
      { id: 'providers', label: 'Provider Adapters', type: 'provider', description: 'Claude, n8n, etc.' },
    ],
    diagramEdges: [
      { from: 'bridge', to: 'queue', label: 'submit' },
      { from: 'bridge', to: 'agents', label: 'dispatch' },
      { from: 'agents', to: 'providers', label: 'send' },
      { from: 'queue', to: 'agents', label: 'dequeue' },
    ],
  },

  'provider-flow': {
    id: 'provider-flow',
    title: 'Provider Integration Flow',
    description: 'How events flow from the bridge through provider adapters.',
    sections: [
      { title: 'Event Submission', content: 'Bridge receives event from internal trigger or API call.', order: 1 },
      { title: 'Hook Matching', content: 'Integration manager matches event to registered hooks.', order: 2 },
      { title: 'Adapter Dispatch', content: 'Matching adapter sends event (mock in safe mode).', order: 3 },
      { title: 'Response Handling', content: 'Adapter returns mock response. No real data exchanged.', order: 4 },
    ],
    diagramNodes: [
      { id: 'trigger', label: 'Event Trigger', type: 'start', description: 'Internal or API trigger' },
      { id: 'manager', label: 'Integration Manager', type: 'action', description: 'Hook matching' },
      { id: 'adapter', label: 'Provider Adapter', type: 'provider', description: 'Mock send' },
      { id: 'response', label: 'Response', type: 'end', description: 'Mock result' },
    ],
    diagramEdges: [
      { from: 'trigger', to: 'manager', label: 'fireEvent' },
      { from: 'manager', to: 'adapter', label: 'dispatch' },
      { from: 'adapter', to: 'response', label: 'return' },
    ],
  },

  'browser-test-flow': {
    id: 'browser-test-flow',
    title: 'Browser Automation Test Flow',
    description: 'How PinchTab browser tasks would execute (mock only).',
    sections: [
      { title: 'Task Creation', content: 'BrowserTask created with action, target, and optional value.', order: 1 },
      { title: 'PinchTab Dispatch', content: 'Task sent to PinchTab adapter (mock in safe mode).', order: 2 },
      { title: 'Result Capture', content: 'BrowserTaskResult captured with success/failure and timing.', order: 3 },
    ],
    diagramNodes: [
      { id: 'create', label: 'Create Task', type: 'start', description: 'Define browser action' },
      { id: 'dispatch', label: 'PinchTab Adapter', type: 'provider', description: 'Mock browser control' },
      { id: 'result', label: 'Capture Result', type: 'end', description: 'BrowserTaskResult' },
    ],
    diagramEdges: [
      { from: 'create', to: 'dispatch', label: 'send' },
      { from: 'dispatch', to: 'result', label: 'return' },
    ],
  },
};

export function getTemplate(id: string): ExplainerTemplate | undefined {
  return templates[id];
}

export function listTemplates(): ExplainerTemplate[] {
  return Object.values(templates);
}
