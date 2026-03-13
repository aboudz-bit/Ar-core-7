/**
 * PDF Adapter — SAFE MODE / DRY RUN
 *
 * Simulates PDF operations. No real processing. Mock only.
 * No external libs required.
 */

import { DocumentResult, DocumentPage, DocumentText } from './documentTypes';
import documentConfig from './documentConfig';
import { documentLog } from './documentLogger';

function mockResult<T>(documentId: string, operation: string, data: T): DocumentResult<T> {
  return {
    success: true,
    documentId,
    operation,
    data,
    error: null,
    dryRun: true,
    timestamp: new Date().toISOString(),
  };
}

export function loadPDF(documentId: string, fileName: string): DocumentResult<{ pageCount: number }> {
  documentLog('info', `[DRY RUN] loadPDF: ${fileName}`);
  return mockResult(documentId, 'loadPDF', { pageCount: 5 });
}

export function splitPDF(documentId: string, ranges: string[]): DocumentResult<{ parts: string[] }> {
  documentLog('info', `[DRY RUN] splitPDF: ${ranges.join(', ')}`);
  return mockResult(documentId, 'splitPDF', { parts: ranges.map((r) => `${documentId}_part_${r}`) });
}

export function mergePDF(documentIds: string[]): DocumentResult<{ mergedId: string }> {
  const mergedId = `merged-${Date.now()}`;
  documentLog('info', `[DRY RUN] mergePDF: ${documentIds.length} documents → ${mergedId}`);
  return mockResult(mergedId, 'mergePDF', { mergedId });
}

export function extractText(documentId: string): DocumentResult<DocumentText> {
  documentLog('info', `[DRY RUN] extractText from PDF: ${documentId}`);
  const pages: DocumentPage[] = Array.from({ length: 3 }, (_, i) => ({
    pageNumber: i + 1,
    text: `[Mock PDF page ${i + 1} text for document ${documentId}]`,
    wordCount: 10,
  }));

  return mockResult(documentId, 'extractText', {
    documentId,
    fullText: pages.map((p) => p.text).join('\n'),
    pages,
  });
}

export function extractPages(documentId: string, pageNumbers: number[]): DocumentResult<DocumentPage[]> {
  documentLog('info', `[DRY RUN] extractPages: pages ${pageNumbers.join(', ')} from ${documentId}`);
  const pages = pageNumbers.map((n) => ({
    pageNumber: n,
    text: `[Mock page ${n} content for ${documentId}]`,
    wordCount: 7,
  }));
  return mockResult(documentId, 'extractPages', pages);
}
