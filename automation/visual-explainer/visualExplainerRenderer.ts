/**
 * Visual Explainer — Renderer
 *
 * Converts explanation results into text, JSON, or markdown output.
 * SAFE MODE — no UI rendering. Text generation only.
 */

import type { VisualExplainResult } from '../types/automationTypes';
import type { RenderFormat } from './visualExplainerTypes';
import { bridgeLog } from '../scripts/bridgeLogger';

/** Render explanation to plain text */
function renderText(result: VisualExplainResult): string {
  const lines: string[] = [
    `=== ${result.subject} ===`,
    '',
  ];

  for (const section of result.sections) {
    lines.push(`[${section.order}] ${section.title}`);
    lines.push(`    ${section.content}`);
    lines.push('');
  }

  if (result.diagram) {
    lines.push('--- Diagram ---');
    for (const edge of result.diagram.edges) {
      const fromNode = result.diagram.nodes.find((n) => n.id === edge.from);
      const toNode = result.diagram.nodes.find((n) => n.id === edge.to);
      const edgeLabel = edge.label ? ` --[${edge.label}]--> ` : ' --> ';
      lines.push(`  ${fromNode?.label ?? edge.from}${edgeLabel}${toNode?.label ?? edge.to}`);
    }
  }

  return lines.join('\n');
}

/** Render explanation to markdown */
function renderMarkdown(result: VisualExplainResult): string {
  const lines: string[] = [
    `# ${result.subject}`,
    '',
  ];

  for (const section of result.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
    lines.push('');
  }

  if (result.diagram) {
    lines.push('## Diagram');
    lines.push('');
    lines.push('```');
    for (const edge of result.diagram.edges) {
      const fromNode = result.diagram.nodes.find((n) => n.id === edge.from);
      const toNode = result.diagram.nodes.find((n) => n.id === edge.to);
      const edgeLabel = edge.label ? ` --[${edge.label}]--> ` : ' --> ';
      lines.push(`${fromNode?.label ?? edge.from}${edgeLabel}${toNode?.label ?? edge.to}`);
    }
    lines.push('```');
  }

  return lines.join('\n');
}

/** Render explanation to JSON string */
function renderJSON(result: VisualExplainResult): string {
  return JSON.stringify(result, null, 2);
}

/** Render explanation in the specified format */
export function render(result: VisualExplainResult, format: RenderFormat = 'text'): string {
  bridgeLog('info', 'visualExplainerRenderer', `[DRY RUN] Rendering as ${format}: ${result.subject}`);

  switch (format) {
    case 'markdown': return renderMarkdown(result);
    case 'json': return renderJSON(result);
    case 'text':
    default: return renderText(result);
  }
}
