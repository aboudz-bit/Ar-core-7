import { prisma } from '@/lib/prisma';

/**
 * Model Optimization Pipeline
 *
 * Processes uploaded 3D models through validation and optimization steps.
 * Designed to be extensible for future try-on/occlusion asset generation.
 *
 * Pipeline steps:
 * 1. Validate GLB structure
 * 2. Compress textures (if gltf-transform available)
 * 3. Generate poster image
 * 4. Generate optimized output
 * 5. [Future] Generate LOD variants
 * 6. [Future] Generate try-on reference assets
 */

export interface PipelineResult {
  success: boolean;
  optimizations: {
    validated: boolean;
    texturesCompressed: boolean;
    posterGenerated: boolean;
    optimizedOutputGenerated: boolean;
    lodGenerated: boolean;
    sizeReduction: number; // percentage
  };
  outputPath?: string;
  error?: string;
}

/**
 * Queue a model for optimization processing.
 * Creates a job record and processes asynchronously.
 */
export async function queueModelOptimization(
  assetId: string,
  productId: string,
  companyId: string,
  inputPath: string
): Promise<string> {
  const job = await prisma.modelOptimizationJob.create({
    data: {
      assetId,
      productId,
      companyId,
      inputPath,
      status: 'pending',
    },
  });

  // Process asynchronously
  processOptimizationJob(job.id).catch((err) => {
    console.error(`Optimization job ${job.id} failed:`, err);
  });

  return job.id;
}

/**
 * Process an optimization job.
 */
async function processOptimizationJob(jobId: string): Promise<void> {
  await prisma.modelOptimizationJob.update({
    where: { id: jobId },
    data: { status: 'processing', startedAt: new Date() },
  });

  const job = await prisma.modelOptimizationJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  try {
    const result = await runPipeline(job.inputPath);

    await prisma.modelOptimizationJob.update({
      where: { id: jobId },
      data: {
        status: result.success ? 'completed' : 'failed',
        outputPath: result.outputPath || null,
        optimizations: result.optimizations as object,
        errorMessage: result.error || null,
        completedAt: new Date(),
      },
    });

    // Update asset processing status
    await prisma.productAsset.update({
      where: { id: job.assetId },
      data: {
        isProcessed: result.success,
        processingStatus: result.success ? 'optimized' : 'failed',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    await prisma.modelOptimizationJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: msg,
        completedAt: new Date(),
      },
    });
  }
}

/**
 * Run the optimization pipeline on a model file.
 * Currently performs validation and basic checks.
 * gltf-transform integration is ready to plug in.
 */
async function runPipeline(inputPath: string): Promise<PipelineResult> {
  const optimizations = {
    validated: false,
    texturesCompressed: false,
    posterGenerated: false,
    optimizedOutputGenerated: false,
    lodGenerated: false,
    sizeReduction: 0,
  };

  // Step 1: Validate GLB structure
  const isValid = await validateGlb(inputPath);
  optimizations.validated = isValid;

  if (!isValid) {
    return {
      success: false,
      optimizations,
      error: 'GLB validation failed — file may be corrupted or not a valid glTF binary',
    };
  }

  // Step 2: Texture compression (requires gltf-transform)
  // When gltf-transform is installed:
  // const compressed = await compressTextures(inputPath);
  // optimizations.texturesCompressed = compressed;
  optimizations.texturesCompressed = false; // placeholder

  // Step 3: Poster generation (requires headless renderer)
  // When available: generate a 1024x1024 poster from the model
  optimizations.posterGenerated = false; // placeholder

  // Step 4: Optimized output
  optimizations.optimizedOutputGenerated = false; // placeholder

  // Step 5: LOD generation (future)
  optimizations.lodGenerated = false;

  return {
    success: true,
    optimizations,
    outputPath: inputPath, // same as input until optimization is wired
  };
}

/**
 * Basic GLB validation — checks magic number and version.
 */
async function validateGlb(filePath: string): Promise<boolean> {
  // Skip validation for remote files (S3, CDN)
  if (filePath.startsWith('http')) return true;

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    // URL-relative paths (e.g. /uploads/...) need ./public prefix
    const fullPath = filePath.startsWith('/') && !filePath.startsWith('/home')
      ? path.default.join('./public', filePath)
      : filePath;

    // Prevent path traversal — ensure resolved path stays within expected directories
    const resolvedPath = path.default.resolve(fullPath);
    const publicRoot = path.default.resolve('./public');
    if (!resolvedPath.startsWith(publicRoot) && !resolvedPath.startsWith('/home')) {
      console.error('Path traversal attempt blocked in validateGlb:', filePath);
      return false;
    }

    const buffer = await fs.default.readFile(fullPath);

    // GLB magic number: 0x46546C67 ('glTF')
    if (buffer.length < 12) return false;
    const magic = buffer.readUInt32LE(0);
    if (magic !== 0x46546C67) return false;

    // Version should be 2
    const version = buffer.readUInt32LE(4);
    if (version !== 2) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Get job status.
 */
export async function getJobStatus(jobId: string) {
  return prisma.modelOptimizationJob.findUnique({
    where: { id: jobId },
  });
}

/**
 * List pending optimization jobs.
 */
export async function getPendingJobs() {
  return prisma.modelOptimizationJob.findMany({
    where: { status: 'pending' },
    orderBy: { createdAt: 'asc' },
    take: 10,
  });
}
