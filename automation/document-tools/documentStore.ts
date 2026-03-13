/**
 * Document Store — SAFE MODE / DRY RUN
 *
 * In-memory document storage. No file I/O. No persistence.
 */

import { DocumentFile, DocumentMeta, DocumentResult } from './documentTypes';
import { documentLog } from './documentLogger';

interface StoredDocument {
  file: DocumentFile;
  meta: DocumentMeta;
}

const store: Map<string, StoredDocument> = new Map();
let counter = 0;

export function saveDocument(
  name: string,
  type: DocumentFile['type'],
  mimeType: string,
  size: number,
  meta?: Partial<DocumentMeta>,
): DocumentResult<DocumentFile> {
  const id = `doc-${++counter}`;
  const file: DocumentFile = {
    id,
    name,
    type,
    mimeType,
    size,
    createdAt: new Date().toISOString(),
  };

  const fullMeta: DocumentMeta = {
    documentId: id,
    title: meta?.title ?? name,
    author: meta?.author ?? null,
    pageCount: meta?.pageCount ?? null,
    language: meta?.language ?? null,
    tags: meta?.tags ?? [],
    custom: meta?.custom ?? {},
  };

  store.set(id, { file, meta: fullMeta });
  documentLog('info', `[DRY RUN] Saved document: ${name} (${type})`);

  return {
    success: true,
    documentId: id,
    operation: 'save',
    data: file,
    error: null,
    dryRun: true,
    timestamp: new Date().toISOString(),
  };
}

export function getDocument(id: string): StoredDocument | undefined {
  return store.get(id);
}

export function listDocuments(): StoredDocument[] {
  return Array.from(store.values());
}

export function clearDocuments(): void {
  store.clear();
  counter = 0;
  documentLog('info', 'Document store cleared');
}

export function documentCount(): number {
  return store.size;
}
