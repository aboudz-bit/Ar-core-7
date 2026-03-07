import { writeFile, mkdir, unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { createHash, createHmac } from 'crypto';

// ============================================================
// Storage Provider Configuration
// ============================================================

export type StorageProvider = 'local' | 's3' | 'r2' | 'minio';

interface StorageConfig {
  provider: StorageProvider;
  bucket: string;
  region: string;
  endpoint: string | null;
  accessKeyId: string;
  secretAccessKey: string;
  cdnBaseUrl: string | null;
  signedUrlTtl: number; // seconds
  localUploadDir: string;
}

function getStorageConfig(): StorageConfig {
  return {
    provider: (process.env.STORAGE_PROVIDER as StorageProvider) || 'local',
    bucket: process.env.STORAGE_BUCKET || 'arcore7-assets',
    region: process.env.STORAGE_REGION || 'us-east-1',
    endpoint: process.env.STORAGE_ENDPOINT || null,
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || '',
    cdnBaseUrl: process.env.CDN_BASE_URL || null,
    signedUrlTtl: parseInt(process.env.SIGNED_URL_TTL || '3600'),
    localUploadDir: process.env.UPLOAD_DIR || './public/uploads',
  };
}

// ============================================================
// S3-Compatible Client (works with AWS S3, Cloudflare R2, MinIO)
// ============================================================

interface S3PutParams {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}

interface S3DeleteParams {
  bucket: string;
  key: string;
}

/**
 * Minimal S3-compatible upload using raw HTTP (no AWS SDK dependency).
 * Works with AWS S3, Cloudflare R2, and MinIO.
 */
async function s3Put(config: StorageConfig, params: S3PutParams): Promise<void> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const host = config.endpoint
    ? new URL(config.endpoint).host
    : `${params.bucket}.s3.${config.region}.amazonaws.com`;

  const endpoint = config.endpoint
    ? `${config.endpoint}/${params.bucket}/${params.key}`
    : `https://${host}/${params.key}`;

  const payloadHash = createHash('sha256').update(params.body).digest('hex');

  const headers: Record<string, string> = {
    'Host': host,
    'Content-Type': params.contentType,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-Sha256': payloadHash,
  };
  if (params.cacheControl) {
    headers['Cache-Control'] = params.cacheControl;
  }

  const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(';');
  const canonicalHeaders = Object.keys(headers).sort()
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join('\n') + '\n';

  const canonicalRequest = [
    'PUT',
    `/${params.key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const fetchHeaders: Record<string, string> = {
    ...headers,
    'Authorization': authorization,
  };

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: fetchHeaders,
    body: new Uint8Array(params.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`S3 upload failed (${response.status}): ${text}`);
  }
}

async function s3Delete(config: StorageConfig, params: S3DeleteParams): Promise<void> {
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const host = config.endpoint
    ? new URL(config.endpoint).host
    : `${params.bucket}.s3.${config.region}.amazonaws.com`;

  const endpoint = config.endpoint
    ? `${config.endpoint}/${params.bucket}/${params.key}`
    : `https://${host}/${params.key}`;

  const payloadHash = createHash('sha256').update('').digest('hex');

  const headers: Record<string, string> = {
    'Host': host,
    'X-Amz-Date': amzDate,
    'X-Amz-Content-Sha256': payloadHash,
  };

  const signedHeaders = Object.keys(headers).sort().map((k) => k.toLowerCase()).join(';');
  const canonicalHeaders = Object.keys(headers).sort()
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join('\n') + '\n';

  const canonicalRequest = [
    'DELETE',
    `/${params.key}`,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  await fetch(endpoint, {
    method: 'DELETE',
    headers: { ...headers, 'Authorization': authorization },
  });
}

function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  return createHmac('sha256', kService).update('aws4_request').digest();
}

/**
 * Generate a pre-signed URL for S3-compatible storage.
 */
function generateSignedUrl(config: StorageConfig, key: string, ttl?: number): string {
  const expiresIn = ttl || config.signedUrlTtl;
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const host = config.endpoint
    ? new URL(config.endpoint).host
    : `${config.bucket}.s3.${config.region}.amazonaws.com`;

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;

  const queryParams = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(credential)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=${expiresIn}`,
    `X-Amz-SignedHeaders=host`,
  ].sort().join('&');

  const canonicalRequest = [
    'GET',
    `/${key}`,
    queryParams,
    `host:${host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const signingKey = getSignatureKey(config.secretAccessKey, dateStamp, config.region, 's3');
  const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const baseUrl = config.endpoint
    ? `${config.endpoint}/${config.bucket}/${key}`
    : `https://${host}/${key}`;

  return `${baseUrl}?${queryParams}&X-Amz-Signature=${signature}`;
}

// ============================================================
// Cache Control Policies
// ============================================================

const CACHE_POLICIES: Record<string, string> = {
  MODEL_GLB: 'public, max-age=31536000, immutable',     // 1 year — models rarely change
  MODEL_GLTF: 'public, max-age=31536000, immutable',
  MODEL_USDZ: 'public, max-age=31536000, immutable',
  POSTER: 'public, max-age=604800, stale-while-revalidate=86400',  // 7 days
  THUMBNAIL: 'public, max-age=604800, stale-while-revalidate=86400',
  IMAGE_2D: 'public, max-age=604800, stale-while-revalidate=86400',
  TARGET_IMAGE: 'public, max-age=604800, stale-while-revalidate=86400',
  FACE_EFFECT: 'public, max-age=2592000, immutable',    // 30 days
  default: 'public, max-age=86400, stale-while-revalidate=3600',   // 1 day
};

function getCacheControl(assetType: string): string {
  return CACHE_POLICIES[assetType] || CACHE_POLICIES.default;
}

// ============================================================
// Unified Storage Interface
// ============================================================

/**
 * Build S3 key for an asset.
 * Pattern: company/{companyId}/products/{productId}/assets/{filename}
 */
export function buildStorageKey(companyId: string, productId: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `company/${companyId}/products/${productId}/assets/${timestamp}-${safeName}`;
}

/**
 * Build a storage sub-directory organized by company and product.
 * Pattern: {companyId}/products/{productId}
 */
export function buildProductPath(companyId: string, productId: string): string {
  return `${companyId}/products/${productId}`;
}

/**
 * Upload a file to the configured storage backend.
 * Returns the public URL or storage path.
 */
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  companyId: string,
  productId: string,
  mimeType: string,
  assetType: string = 'default'
): Promise<{ filePath: string; storageKey: string }> {
  const config = getStorageConfig();

  if (config.provider === 'local') {
    const subDir = buildProductPath(companyId, productId);
    const localPath = await saveFileLocal(buffer, fileName, subDir);
    return { filePath: localPath, storageKey: localPath };
  }

  // S3-compatible upload (s3, r2, minio)
  const storageKey = buildStorageKey(companyId, productId, fileName);
  await s3Put(config, {
    bucket: config.bucket,
    key: storageKey,
    body: buffer,
    contentType: mimeType,
    cacheControl: getCacheControl(assetType),
  });

  const filePath = getPublicUrl(storageKey);
  return { filePath, storageKey };
}

/**
 * Delete a file from storage.
 */
export async function deleteFileFromStorage(filePath: string, storageKey?: string): Promise<void> {
  const config = getStorageConfig();

  if (config.provider === 'local') {
    await deleteFileLocal(filePath);
    return;
  }

  const key = storageKey || filePath.replace(/^https?:\/\/[^/]+\//, '');
  await s3Delete(config, { bucket: config.bucket, key });
}

/**
 * Get the public (CDN) URL for a stored asset.
 */
export function getPublicUrl(storageKeyOrPath: string): string {
  const config = getStorageConfig();

  if (config.provider === 'local') {
    return storageKeyOrPath;
  }

  // CDN URL takes priority
  if (config.cdnBaseUrl) {
    return `${config.cdnBaseUrl}/${storageKeyOrPath}`;
  }

  // Fallback to direct S3 URL
  if (config.endpoint) {
    return `${config.endpoint}/${config.bucket}/${storageKeyOrPath}`;
  }

  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${storageKeyOrPath}`;
}

/**
 * Generate a signed URL for private asset access.
 */
export function getSignedUrl(storageKey: string, ttl?: number): string {
  const config = getStorageConfig();

  if (config.provider === 'local') {
    return storageKey; // local files are served directly
  }

  return generateSignedUrl(config, storageKey, ttl);
}

// ============================================================
// Local Storage (backward compatible)
// ============================================================

async function saveFileLocal(buffer: Buffer, fileName: string, subDir: string = ''): Promise<string> {
  const config = getStorageConfig();
  const dir = path.join(config.localUploadDir, subDir);
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

async function deleteFileLocal(filePath: string): Promise<void> {
  const fullPath = path.join('./public', filePath);
  try {
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  } catch (error) {
    console.error('File delete error:', error);
  }
}

// ============================================================
// Legacy exports (backward compatible with existing code)
// ============================================================

export async function saveFile(buffer: Buffer, fileName: string, subDir: string = ''): Promise<string> {
  return saveFileLocal(buffer, fileName, subDir);
}

export async function deleteFile(filePath: string): Promise<void> {
  return deleteFileLocal(filePath);
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

const VALID_ASSET_TYPES = [
  'MODEL_GLB', 'MODEL_GLTF', 'MODEL_USDZ', 'IMAGE_2D',
  'POSTER', 'THUMBNAIL', 'TARGET_IMAGE', 'FACE_EFFECT',
];

export function resolveAssetType(fileName: string, mimeType: string, explicitType?: string | null): string {
  // Only accept known asset types — prevents arbitrary type injection
  if (explicitType && VALID_ASSET_TYPES.includes(explicitType)) return explicitType;
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'glb') return 'MODEL_GLB';
  if (ext === 'gltf') return 'MODEL_GLTF';
  if (ext === 'usdz') return 'MODEL_USDZ';
  if (mimeType === 'model/gltf-binary') return 'MODEL_GLB';
  if (mimeType === 'model/gltf+json') return 'MODEL_GLTF';
  if (mimeType === 'model/vnd.usdz+zip') return 'MODEL_USDZ';
  if (mimeType.startsWith('image/')) return 'IMAGE_2D';
  if (mimeType === 'application/octet-stream') {
    if (ext === 'glb') return 'MODEL_GLB';
    if (ext === 'gltf') return 'MODEL_GLTF';
    if (ext === 'usdz') return 'MODEL_USDZ';
  }
  return 'IMAGE_2D';
}

export function isAllowedExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  const allowed = ['glb', 'gltf', 'usdz', 'jpg', 'jpeg', 'png', 'webp', 'svg'];
  return allowed.includes(ext);
}

const ALLOWED_MIME_TYPES = [
  'model/gltf-binary', 'model/gltf+json', 'model/vnd.usdz+zip',
  'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml',
  'application/octet-stream', // Binary fallback for 3D models
];

/** Validate both extension and MIME type to prevent masqueraded file uploads */
export function isAllowedFile(fileName: string, mimeType: string): boolean {
  if (!isAllowedExtension(fileName)) return false;
  // application/octet-stream is acceptable for 3D model binaries
  if (mimeType === 'application/octet-stream') {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    return ['glb', 'gltf', 'usdz'].includes(ext);
  }
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

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

/**
 * Get storage provider info for health checks.
 */
export function getStorageInfo(): { provider: string; bucket: string; cdnEnabled: boolean } {
  const config = getStorageConfig();
  return {
    provider: config.provider,
    bucket: config.bucket,
    cdnEnabled: !!config.cdnBaseUrl,
  };
}
