import { writeFile, mkdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || './public/uploads';

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
