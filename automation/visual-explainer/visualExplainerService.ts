/**
 * Visual Explainer — Service Layer
 *
 * Generates explanations from templates or custom requests.
 * SAFE MODE — in-memory only.
 */

import { bridgeLog } from '../scripts/bridgeLogger';
import visualExplainerConfig from './visualExplainerConfig';
import { getTemplate, listTemplates } from './visualExplainerTemplates';
import { createDiagram, listDiagrams, getDiagram } from './visualExplainer';
import type { VisualExplainRequest, VisualExplainResult, VisualExplainSection, VisualDiagramNode, VisualDiagramEdge } from '../types/automationTypes';
import type { VisualNode, VisualEdge } from './visualExplainer';

let requestCounter = 0;

/** Generate an explanation from a template */
export function explainFromTemplate(templateId: string): VisualExplainResult | null {
  const template = getTemplate(templateId);
  if (!template) return null;

  const sections: VisualExplainSection[] = template.sections.map((s) => ({
    title: s.title,
    content: s.content,
    order: s.order,
  }));

  const nodes: VisualNode[] = template.diagramNodes.map((n) => ({
    id: n.id,
    label: n.label,
    type: n.type as VisualNode['type'],
    description: n.description,
  }));

  const edges: VisualEdge[] = template.diagramEdges.map((e) => ({
    from: e.from,
    to: e.to,
    label: e.label,
  }));

  const diagram = createDiagram(template.title, nodes, edges);

  bridgeLog('info', 'visualExplainerService', `[DRY RUN] Generated explanation from template: ${templateId}`);

  return {
    requestId: `vxr-${++requestCounter}`,
    subject: template.title,
    output: sections.map((s) => `## ${s.title}\n${s.content}`).join('\n\n'),
    sections,
    diagram: {
      nodes: template.diagramNodes.map((n) => ({ ...n, type: n.type as VisualDiagramNode['type'] })),
      edges: template.diagramEdges,
    },
    createdAt: new Date().toISOString(),
  };
}

/** Generate explanation from a custom request */
export function explainCustom(request: VisualExplainRequest): VisualExplainResult {
  bridgeLog('info', 'visualExplainerService', `[DRY RUN] Custom explanation: ${request.subject}`);

  return {
    requestId: request.id,
    subject: request.subject,
    output: request.sections.map((s) => `## ${s.title}\n${s.content}`).join('\n\n'),
    sections: request.sections,
    diagram: null,
    createdAt: new Date().toISOString(),
  };
}

/** List available template IDs */
export function listAvailableTemplates(): string[] {
  return listTemplates().map((t) => t.id);
}
