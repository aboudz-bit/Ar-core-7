/**
 * Document Tools — Type Definitions
 *
 * SAFE MODE — no runtime behavior. Types only.
 */

/** Supported document types */
export type DocumentType = 'pdf' | 'image' | 'text' | 'doc' | 'custom';

/** A document file descriptor */
export interface DocumentFile {
  id: string;
  name: string;
  type: DocumentType;
  mimeType: string;
  size: number;
  createdAt: string;
}

/** Document metadata */
export interface DocumentMeta {
  documentId: string;
  title: string;
  author: string | null;
  pageCount: number | null;
  language: string | null;
  tags: string[];
  custom: Record<string, unknown>;
}

/** Extracted text content from a document */
export interface DocumentText {
  documentId: string;
  fullText: string;
  pages: DocumentPage[];
}

/** A single page of extracted content */
export interface DocumentPage {
  pageNumber: number;
  text: string;
  wordCount: number;
}

/** Result of a document operation */
export interface DocumentResult<T = unknown> {
  success: boolean;
  documentId: string;
  operation: string;
  data: T | null;
  error: string | null;
  dryRun: boolean;
  timestamp: string;
}
