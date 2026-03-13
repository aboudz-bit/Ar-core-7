/**
 * Text Adapter — SAFE MODE / DRY RUN
 *
 * Simulates text document operations. No real processing. Mock only.
 */

import { DocumentResult } from './documentTypes';
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

export function parseText(documentId: string, content?: string): DocumentResult<{ text: string; lineCount: number }> {
  documentLog('info', `[DRY RUN] parseText: ${documentId}`);
  const mockText = content ?? `[Mock text content for document ${documentId}]`;
  return mockResult(documentId, 'parseText', {
    text: mockText,
    lineCount: mockText.split('\n').length,
  });
}

export function extractLines(
  documentId: string,
  startLine: number,
  endLine: number,
): DocumentResult<{ lines: string[]; count: number }> {
  documentLog('info', `[DRY RUN] extractLines: ${documentId} lines ${startLine}–${endLine}`);
  const lines = Array.from({ length: endLine - startLine + 1 }, (_, i) =>
    `[Mock line ${startLine + i} of ${documentId}]`,
  );
  return mockResult(documentId, 'extractLines', { lines, count: lines.length });
}

export function searchText(
  documentId: string,
  query: string,
): DocumentResult<{ matches: { line: number; text: string }[]; total: number }> {
  documentLog('info', `[DRY RUN] searchText: "${query}" in ${documentId}`);
  const mockMatch = { line: 1, text: `[Mock match for "${query}" in ${documentId}]` };
  return mockResult(documentId, 'searchText', { matches: [mockMatch], total: 1 });
}
