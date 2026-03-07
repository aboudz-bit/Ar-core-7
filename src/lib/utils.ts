import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generateSlug(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateCompletenessScore(assets: { assetType: string }[]): number {
  const weights: Record<string, number> = {
    MODEL_GLB: 30,
    THUMBNAIL: 20,
    IMAGE_2D: 15,
    POSTER: 15,
    MODEL_USDZ: 10,
    TARGET_IMAGE: 10,
  };

  let score = 0;
  const types = new Set(assets.map((a) => a.assetType));
  for (const [type, weight] of Object.entries(weights)) {
    if (types.has(type)) {
      score += weight;
    }
  }
  return Math.min(score, 100);
}
