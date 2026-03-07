/**
 * Clothing Try-On Service (Photo-based)
 *
 * Handles the async processing pipeline for photo-based virtual try-on.
 * User uploads a person photo + garment image, system generates a composited preview.
 *
 * Current implementation: Canvas-based image compositing (garment overlaid on person).
 * Production upgrade path: VITON-HD, Fashn, or similar ML-based try-on API.
 */

import { prisma } from '@/lib/prisma';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';

export type TryOnJobStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface CreateTryOnJobInput {
  companyId: string;
  experienceId?: string;
  personImagePath: string;
  garmentImagePath: string;
  provider?: string;
}

export interface TryOnJobResult {
  id: string;
  status: TryOnJobStatus;
  outputImagePath: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown> | null;
}

export async function createTryOnJob(input: CreateTryOnJobInput) {
  const job = await prisma.tryOnJob.create({
    data: {
      companyId: input.companyId,
      experienceId: input.experienceId || null,
      personImagePath: input.personImagePath,
      garmentImagePath: input.garmentImagePath,
      provider: input.provider || 'internal',
      status: 'UPLOADED',
    },
  });

  void processTryOnJob(job.id).catch((err) => {
    console.error(`[TryOnJob ${job.id}] Processing failed:`, err);
  });

  return job;
}

export async function getTryOnJobStatus(jobId: string): Promise<TryOnJobResult | null> {
  const job = await prisma.tryOnJob.findUnique({
    where: { id: jobId },
  });

  if (!job) return null;

  return {
    id: job.id,
    status: job.status as TryOnJobStatus,
    outputImagePath: job.outputImagePath,
    errorMessage: job.errorMessage,
    metadata: job.metadata as Record<string, unknown> | null,
  };
}

async function processTryOnJob(jobId: string) {
  const startTime = Date.now();

  await prisma.tryOnJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    const job = await prisma.tryOnJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    const sharp = (await import('sharp')).default;

    const personImage = sharp(job.personImagePath);
    const personMeta = await personImage.metadata();
    const pW = Math.max(personMeta.width || 800, 100);
    const pH = Math.max(personMeta.height || 1000, 100);

    const garmentW = Math.max(Math.round(pW * 0.6), 60);
    const garmentH = Math.max(Math.round(pH * 0.35), 35);

    const garmentResized = await sharp(job.garmentImagePath)
      .resize({
        width: garmentW,
        height: garmentH,
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const garmentMeta = await sharp(garmentResized).metadata();
    const gW = garmentMeta.width || Math.round(pW * 0.6);
    const gH = garmentMeta.height || Math.round(pH * 0.35);

    const overlayLeft = Math.round((pW - gW) / 2);
    const overlayTop = Math.round(pH * 0.25);

    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'tryon-output');
    await mkdir(outputDir, { recursive: true });

    const outputFileName = `tryon_${jobId}_${Date.now()}.png`;
    const outputFilePath = path.join(outputDir, outputFileName);
    const publicPath = `/uploads/tryon-output/${outputFileName}`;

    await personImage
      .composite([{
        input: garmentResized,
        left: overlayLeft,
        top: overlayTop,
        blend: 'over',
      }])
      .png()
      .toFile(outputFilePath);

    const processingTime = Date.now() - startTime;

    await prisma.tryOnJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETE',
        outputImagePath: publicPath,
        completedAt: new Date(),
        metadata: {
          processingTime,
          provider: job.provider,
          outputWidth: pW,
          outputHeight: pH,
          method: 'sharp-composite',
          note: 'Image compositing overlay — not AI-based virtual try-on. Garment is overlaid on person photo.',
        },
      },
    });

    console.log(`[TryOnJob ${jobId}] Completed in ${processingTime}ms — output: ${publicPath}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[TryOnJob ${jobId}] Failed:`, message);
    await prisma.tryOnJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        errorMessage: message,
        completedAt: new Date(),
      },
    });
  }
}

export async function listTryOnJobs(companyId: string, limit = 20) {
  return prisma.tryOnJob.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
