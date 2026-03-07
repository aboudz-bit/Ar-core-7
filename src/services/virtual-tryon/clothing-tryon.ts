/**
 * Clothing Try-On Service (Photo-based)
 *
 * Handles the async processing pipeline for photo-based virtual try-on.
 * User uploads a person photo + garment image, system generates a try-on preview.
 *
 * Architecture references: VITON-HD, VITON
 * - https://github.com/shadow2496/VITON-HD
 * - https://github.com/xthan/VITON
 *
 * In this phase, we implement the pipeline structure with a placeholder processor.
 * The actual ML inference can be swapped in via the `provider` field.
 */

import { prisma } from '@/lib/prisma';

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

/**
 * Create a new try-on job and enqueue it for processing.
 */
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

  // Fire and forget — queue the processing
  void processTryOnJob(job.id).catch((err) => {
    console.error(`[TryOnJob ${job.id}] Processing failed:`, err);
  });

  return job;
}

/**
 * Get the status and result of a try-on job.
 */
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

/**
 * Process a try-on job.
 * This is where the actual ML inference would happen.
 * Currently implements a placeholder that generates a composite preview.
 */
async function processTryOnJob(jobId: string) {
  await prisma.tryOnJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  try {
    const job = await prisma.tryOnJob.findUnique({ where: { id: jobId } });
    if (!job) throw new Error('Job not found');

    // In production, this would call an ML inference endpoint:
    // - VITON-HD model API
    // - Custom TryOn model server
    // - Third-party virtual try-on API (e.g., Revery, Fashn)
    //
    // For now, we validate inputs and mark as complete with a placeholder.
    const { createReadStream } = await import('fs');
    const personExists = await new Promise((resolve) => {
      const stream = createReadStream(job.personImagePath);
      stream.on('open', () => { stream.destroy(); resolve(true); });
      stream.on('error', () => resolve(false));
    });

    if (!personExists) throw new Error('Person image not found');

    const garmentExists = await new Promise((resolve) => {
      const stream = createReadStream(job.garmentImagePath);
      stream.on('open', () => { stream.destroy(); resolve(true); });
      stream.on('error', () => resolve(false));
    });

    if (!garmentExists) throw new Error('Garment image not found');

    // Placeholder: In production, call ML model and save output image
    // const outputPath = await runVirtualTryOn(job.personImagePath, job.garmentImagePath);
    //
    // For now, we mark the job as complete with the person image as a preview stand-in.
    // When a real model is integrated, replace this with actual output.
    const outputPath = job.personImagePath; // Placeholder

    await prisma.tryOnJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETE',
        outputImagePath: outputPath,
        completedAt: new Date(),
        metadata: {
          processingTime: Date.now() - (job.startedAt?.getTime() || Date.now()),
          provider: job.provider,
          note: 'Placeholder output — integrate ML model for real try-on results',
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
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

/**
 * List try-on jobs for a company.
 */
export async function listTryOnJobs(companyId: string, limit = 20) {
  return prisma.tryOnJob.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
