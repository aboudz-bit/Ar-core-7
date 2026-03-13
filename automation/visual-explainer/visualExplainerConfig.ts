/**
 * Visual Explainer — Configuration
 *
 * SAFE MODE — all visual explanation generation is mock/in-memory.
 */

export interface VisualExplainerConfig {
  enabled: boolean;
  safeMode: boolean;
  maxSections: number;
  maxNodesPerDiagram: number;
  defaultFormat: 'text' | 'json' | 'diagram';
}

const visualExplainerConfig: VisualExplainerConfig = {
  enabled: false,
  safeMode: true,
  maxSections: 20,
  maxNodesPerDiagram: 50,
  defaultFormat: 'text',
};

export default visualExplainerConfig;
