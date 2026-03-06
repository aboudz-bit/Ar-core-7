import { writeFile, mkdir, unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';

/**
 * Build a storage sub-directory organized by company and product.
 * Pattern: {companyId}/products/{productId}
 * Falls back to products/{productId} if no companyId provided.
 */
export function buildProductPath(companyId: string, productId: string): string {
  return `${companyId}/products/${productId}`;
}

export async function saveFile(
  buffer: Buffer,
  fileName: string,
  subDir: string = ''
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, subDir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const finalName = `${timestamp}-${safeName}`;
  const filePath = path.join(dir, finalName);

  await writeFile(filePath, buffer);

  return `/uploads/${subDir ? subDir + '/' : ''}${finalName}`;
}

export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join('./public', filePath);
  try {
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (error) {
    console.error('File delete error:', error);
  }
}

export function getFileUrl(filePath: string): string {
  return filePath;
}

export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(mimeType);
}

export function validateFileSize(sizeBytes: number): boolean {
  const maxSize = (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024);
  return sizeBytes <= maxSize;
}

/** Resolve the AssetType from file extension and MIME type */
export function resolveAssetType(
  fileName: string,
  mimeType: string,
  explicitType?: string | null
): string {
  if (explicitType) return explicitType;

  const ext = fileName.toLowerCase().split('.').pop() || '';

  // 3D models
  if (ext === 'glb') return 'MODEL_GLB';
  if (ext === 'gltf') return 'MODEL_GLTF';
  if (ext === 'usdz') return 'MODEL_USDZ';

  // MIME-based detection
  if (mimeType === 'model/gltf-binary') return 'MODEL_GLB';
  if (mimeType === 'model/gltf+json') return 'MODEL_GLTF';
  if (mimeType === 'model/vnd.usdz+zip') return 'MODEL_USDZ';

  // Images default to IMAGE_2D
  if (mimeType.startsWith('image/')) return 'IMAGE_2D';

  // Fallback for .glb/.gltf that come as application/octet-stream
  if (mimeType === 'application/octet-stream') {
    if (ext === 'glb') return 'MODEL_GLB';
    if (ext === 'gltf') return 'MODEL_GLTF';
    if (ext === 'usdz') return 'MODEL_USDZ';
  }

  return 'IMAGE_2D';
}

/** Check if a file extension is allowed */
export function isAllowedExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const allowed = ['glb', 'gltf', 'usdz', 'jpg', 'jpeg', 'png', 'webp', 'svg'];
  return allowed.includes(ext);
}

/** Get human-readable asset type label */
export function getAssetTypeLabel(assetType: string): string {
  const labels: Record<string, string> = {
    MODEL_GLB: '3D Model (GLB)',
    MODEL_GLTF: '3D Model (glTF)',
    MODEL_USDZ: 'iOS Model (USDZ)',
    IMAGE_2D: 'Product Image',
    POSTER: 'Poster Image',
    TARGET_IMAGE: 'AR Target Image',
    THUMBNAIL: 'Thumbnail',
    FACE_EFFECT: 'Face Effect',
  };
  return labels[assetType] || assetType;
}
