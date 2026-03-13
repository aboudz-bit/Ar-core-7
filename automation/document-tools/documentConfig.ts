/**
 * Document Tools — Configuration
 *
 * SAFE MODE — all document processing disabled.
 * No external uploads. No cloud calls. No heavy libs.
 */

export interface DocumentToolsConfig {
  enabled: boolean;
  safeMode: boolean;
  maxFileSizeMB: number;
  supportedTypes: readonly string[];
  allowExternalUpload: boolean;
  allowCloudCalls: boolean;
}

const documentConfig: DocumentToolsConfig = {
  enabled: false,
  safeMode: true,
  maxFileSizeMB: 10,
  supportedTypes: ['pdf', 'image', 'text', 'doc', 'custom'] as const,
  allowExternalUpload: false,
  allowCloudCalls: false,
};

export default documentConfig;
