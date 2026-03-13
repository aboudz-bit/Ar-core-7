/**
 * Document Parser — SAFE MODE / DRY RUN
 *
 * Detects document type and returns mock parse results.
 * No real file reading. No heavy libs.
 */

import { DocumentType, DocumentResult, DocumentText, DocumentPage } from './documentTypes';
import documentConfig from './documentConfig';
import { documentLog } from './documentLogger';

/** Detect document type from MIME type or extension */
export function detectType(mimeType: string, fileName?: string): DocumentType {
  if (mimeType === 'application/pdf' || fileName?.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('text/') || fileName?.endsWith('.txt') || fileName?.endsWith('.md')) return 'text';
  if (
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName?.endsWith('.doc') ||
    fileName?.endsWith('.docx')
  ) return 'doc';
  return 'custom';
}

/** Parse a document — returns mock result in safe mode */
export function parseDocument(
  documentId: string,
  mimeType: string,
  fileName?: string,
): DocumentResult<DocumentText> {
  if (!documentConfig.enabled || documentConfig.safeMode) {
    const type = detectType(mimeType, fileName);
    documentLog('info', `[DRY RUN] Parse document: ${fileName ?? documentId} (${type})`);

    const mockPage: DocumentPage = {
      pageNumber: 1,
      text: `[Mock content for ${type} document "${fileName ?? documentId}"]`,
      wordCount: 8,
    };

    const mockText: DocumentText = {
      documentId,
      fullText: mockPage.text,
      pages: [mockPage],
    };

    return {
      success: true,
      documentId,
      operation: 'parse',
      data: mockText,
      error: null,
      dryRun: true,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    success: false,
    documentId,
    operation: 'parse',
    data: null,
    error: 'Document parsing not enabled',
    dryRun: false,
    timestamp: new Date().toISOString(),
  };
}
