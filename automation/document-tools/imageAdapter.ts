/**
 * Image Adapter — SAFE MODE / DRY RUN
 *
 * Simulates image document operations. No real processing. Mock only.
 */

import { DocumentResult } from './documentTypes';
import { documentLog } from './documentLogger';

export interface ImageMeta {
  width: number;
  height: number;
  format: string;
  colorSpace: string;
  dpi: number | null;
}

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

export function readImage(documentId: string, fileName: string): DocumentResult<ImageMeta> {
  documentLog('info', `[DRY RUN] readImage: ${fileName}`);
  return mockResult(documentId, 'readImage', {
    width: 1920,
    height: 1080,
    format: fileName.split('.').pop() || 'unknown',
    colorSpace: 'sRGB',
    dpi: 72,
  });
}

export function convertImage(
  documentId: string,
  targetFormat: string,
): DocumentResult<{ convertedId: string; format: string }> {
  documentLog('info', `[DRY RUN] convertImage: ${documentId} → ${targetFormat}`);
  return mockResult(documentId, 'convertImage', {
    convertedId: `${documentId}_converted_${targetFormat}`,
    format: targetFormat,
  });
}

export function getImageMetadata(documentId: string): DocumentResult<ImageMeta> {
  documentLog('info', `[DRY RUN] getImageMetadata: ${documentId}`);
  return mockResult(documentId, 'getImageMetadata', {
    width: 1920,
    height: 1080,
    format: 'jpeg',
    colorSpace: 'sRGB',
    dpi: 72,
  });
}
