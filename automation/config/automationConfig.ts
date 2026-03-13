/**
 * AR-CORE-7 Automation Bridge Configuration
 *
 * SAFE MODE — all features disabled by default.
 * No runtime changes. No real execution. Mock/dry-run only.
 */

export interface AutomationConfig {
  /** Master kill switch — must be true for any automation to run */
  enabled: boolean;

  /** Safe mode / dry run — when true, nothing executes for real */
  safeMode: boolean;

  /** Enable automation bridge (Claude, n8n, Paperclip) */
  allowAutomation: boolean;

  /** Enable visual explainer layer */
  allowVisualExplainer: boolean;

  /** Enable memory agent (Dash ready) */
  allowMemoryAgent: boolean;

  /** Enable browser adapter (PinchTab ready) */
  allowBrowserAdapter: boolean;

  /** Enable document tools layer */
  allowDocumentTools: boolean;

  /** Supported document tool types */
  supportedDocumentTools: readonly string[];

  /** Supported automation providers */
  supportedProviders: readonly string[];

  /** Log level */
  logLevel: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

const automationConfig: AutomationConfig = {
  enabled: false,
  safeMode: true,
  allowAutomation: false,
  allowVisualExplainer: false,
  allowMemoryAgent: false,
  allowBrowserAdapter: false,
  allowDocumentTools: false,

  supportedDocumentTools: ['pdf', 'image', 'text', 'doc', 'custom'] as const,
  supportedProviders: ['claude', 'n8n', 'paperclip', 'pinchtab', 'dash'] as const,

  logLevel: 'silent',
};

export default automationConfig;
