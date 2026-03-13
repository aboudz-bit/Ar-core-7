/**
 * Visual Explainer — SAFE MODE / DRY RUN
 *
 * Generates structured visual explanations of automation flows.
 * No UI changes. No rendering. In-memory descriptions only.
 */

import automationConfig from '../config/automationConfig';
import { bridgeLog } from '../scripts/bridgeLogger';

export interface VisualNode {
  id: string;
  label: string;
  type: 'start' | 'action' | 'decision' | 'end';
  description: string;
}

export interface VisualEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowDiagram {
  id: string;
  title: string;
  nodes: VisualNode[];
  edges: VisualEdge[];
  createdAt: string;
}

const diagrams: Map<string, FlowDiagram> = new Map();

export function createDiagram(title: string, nodes: VisualNode[], edges: VisualEdge[]): FlowDiagram {
  const diagram: FlowDiagram = {
    id: `diagram-${Date.now()}`,
    title,
    nodes,
    edges,
    createdAt: new Date().toISOString(),
  };

  diagrams.set(diagram.id, diagram);
  bridgeLog('info', 'visualExplainer', `[DRY RUN] Created diagram: ${title}`);
  return diagram;
}

export function getDiagram(id: string): FlowDiagram | undefined {
  return diagrams.get(id);
}

export function listDiagrams(): FlowDiagram[] {
  return Array.from(diagrams.values());
}

export function clearDiagrams(): void {
  diagrams.clear();
}

/** Generate a simple text representation of a flow diagram */
export function diagramToText(id: string): string {
  const diagram = diagrams.get(id);
  if (!diagram) return 'Diagram not found';

  const lines = [`Flow: ${diagram.title}`, ''];
  for (const edge of diagram.edges) {
    const fromNode = diagram.nodes.find((n) => n.id === edge.from);
    const toNode = diagram.nodes.find((n) => n.id === edge.to);
    const edgeLabel = edge.label ? ` --[${edge.label}]--> ` : ' --> ';
    lines.push(`  ${fromNode?.label ?? edge.from}${edgeLabel}${toNode?.label ?? edge.to}`);
  }
  return lines.join('\n');
}
