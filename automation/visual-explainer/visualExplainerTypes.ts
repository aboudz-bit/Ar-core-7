/**
 * Visual Explainer — Types
 *
 * Re-exports canonical types and adds explainer-specific types.
 */

export type {
  VisualExplainRequest,
  VisualExplainResult,
  VisualExplainSection,
  VisualDiagramNode,
  VisualDiagramEdge,
} from '../types/automationTypes';

/** Template descriptor for pre-built explanations */
export interface ExplainerTemplate {
  id: string;
  title: string;
  description: string;
  sections: { title: string; content: string; order: number }[];
  diagramNodes: { id: string; label: string; type: string; description: string }[];
  diagramEdges: { from: string; to: string; label?: string }[];
}

/** Render output format */
export type RenderFormat = 'text' | 'json' | 'markdown';
