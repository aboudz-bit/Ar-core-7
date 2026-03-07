import { prisma } from '@/lib/prisma';
import { saveFile, buildProductPath } from '@/lib/storage';
import { existsSync } from 'fs';
import { readFile, stat } from 'fs/promises';
import path from 'path';

/**
 * Image-to-3D Generation Service
 *
 * Integrates with TripoSR (primary) and InstantMesh (optional) to convert
 * product images into 3D GLB models automatically.
 *
 * Architecture:
 *   Upload image → Queue job → Worker calls TripoSR API → GLB saved → Asset created → Product becomes AR_READY
 */

export interface ImageTo3DConfig {
  enabled: boolean;
  provider: 'triposr' | 'instantmesh';
  triposrEndpoint: string;
  instantmeshEndpoint: string;
  maxImageSizeMb: number;
  timeoutMs: number;
  autoPublish: boolean;
}

export function getImageTo3DConfig(): ImageTo3DConfig {
  return {
    enabled: process.env.IMAGE_TO_3D_ENABLED === 'true',
    provider: (process.env.IMAGE_TO_3D_PROVIDER as 'triposr' | 'instantmesh') || 'triposr',
    triposrEndpoint: process.env.TRIPOSR_ENDPOINT || 'http://localhost:8080',
    instantmeshEndpoint: process.env.INSTANTMESH_ENDPOINT || 'http://localhost:8081',
    maxImageSizeMb: parseInt(process.env.MAX_IMAGE_SIZE_MB || '10'),
    timeoutMs: parseInt(process.env.IMAGE_TO_3D_TIMEOUT_MS || '120000'),
    autoPublish: process.env.IMAGE_TO_3D_AUTO_PUBLISH !== 'false',
  };
}

/**
 * Queue an image-to-3D generation job for a product.
 * Called after a product image is uploaded.
 */
export async function queueImageTo3DJob(
  productId: string,
  companyId: string,
  sourceAssetId: string,
  sourceImagePath: string
): Promise<string> {
  const config = getImageTo3DConfig();

  if (!config.enabled) {
    throw new Error('Image-to-3D generation is disabled. Set IMAGE_TO_3D_ENABLED=true');
  }

  // Validate image size — URL-relative paths need ./public prefix, absolute filesystem paths don't
  const fullPath = sourceImagePath.startsWith('/') && !sourceImagePath.startsWith('/home')
    ? path.join('./public', sourceImagePath)
    : sourceImagePath;

  // Prevent path traversal — ensure resolved path stays within public directory
  const resolvedPath = path.resolve(fullPath);
  const publicRoot = path.resolve('./public');
  if (resolvedPath.startsWith(publicRoot) === false && !resolvedPath.startsWith('/home')) {
    throw new Error('Invalid source image path: path traversal detected');
  }

  if (existsSync(fullPath)) {
    const stats = await stat(fullPath);
    const sizeMb = stats.size / (1024 * 1024);
    if (sizeMb > config.maxImageSizeMb) {
      throw new Error(`Image too large (${sizeMb.toFixed(1)}MB). Maximum is ${config.maxImageSizeMb}MB`);
    }
  }

  // Check for existing pending/processing jobs for this product
  const existingJob = await prisma.imageTo3DJob.findFirst({
    where: {
      productId,
      status: { in: ['pending', 'processing'] },
    },
  });

  if (existingJob) {
    return existingJob.id;
  }

  // Update product status to GENERATING_3D (after existing job check to avoid spurious state change)
  await prisma.product.update({
    where: { id: productId },
    data: { status: 'GENERATING_3D' },
  });

  const job = await prisma.imageTo3DJob.create({
    data: {
      productId,
      companyId,
      sourceAssetId,
      sourceImagePath,
      provider: config.provider,
      status: 'pending',
    },
  });

  // Process asynchronously
  processImageTo3DJob(job.id).catch((err) => {
    console.error(`Image-to-3D job ${job.id} failed:`, err);
  });

  return job.id;
}

/**
 * Process a single image-to-3D job.
 */
async function processImageTo3DJob(jobId: string): Promise<void> {
  const config = getImageTo3DConfig();

  await prisma.imageTo3DJob.update({
    where: { id: jobId },
    data: { status: 'processing', startedAt: new Date() },
  });

  const job = await prisma.imageTo3DJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  try {
    const startTime = Date.now();

    // Call the appropriate 3D generation service
    let glbBuffer: Buffer;
    if (config.provider === 'instantmesh') {
      glbBuffer = await callInstantMesh(job.sourceImagePath, config);
    } else {
      glbBuffer = await callTripoSR(job.sourceImagePath, config);
    }

    const inferenceTime = Date.now() - startTime;

    // Save the generated GLB file
    const subDir = buildProductPath(job.companyId, job.productId);
    const glbFileName = `generated-${Date.now()}.glb`;
    const glbPath = await saveFile(glbBuffer, glbFileName, subDir);

    // Create the ProductAsset record
    const asset = await prisma.productAsset.create({
      data: {
        productId: job.productId,
        assetType: 'MODEL_GLB',
        fileName: glbFileName,
        filePath: glbPath,
        fileSize: glbBuffer.length,
        mimeType: 'model/gltf-binary',
        source: 'ai_generated',
        isProcessed: true,
        processingStatus: 'completed',
        metadata: {
          generator: config.provider,
          inferenceTimeMs: inferenceTime,
          sourceImagePath: job.sourceImagePath,
        },
      },
    });

    // Update job as completed
    await prisma.imageTo3DJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        outputGlbPath: glbPath,
        outputAssetId: asset.id,
        completedAt: new Date(),
        metadata: {
          inferenceTimeMs: inferenceTime,
          modelSize: glbBuffer.length,
          provider: config.provider,
        },
      },
    });

    // Update product status to AR_READY
    await prisma.product.update({
      where: { id: job.productId },
      data: { status: 'AR_READY' },
    });

    // Auto-create experience if configured
    if (config.autoPublish) {
      await autoCreateExperience(job.productId, job.companyId);
    }

    console.log(`Image-to-3D job ${jobId} completed in ${inferenceTime}ms`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const job2 = await prisma.imageTo3DJob.findUnique({ where: { id: jobId } });

    if (job2 && job2.retryCount < job2.maxRetries) {
      // Retry with exponential backoff
      await prisma.imageTo3DJob.update({
        where: { id: jobId },
        data: {
          status: 'pending',
          retryCount: { increment: 1 },
          errorMessage: msg,
        },
      });

      const delay = Math.pow(2, job2.retryCount + 1) * 1000;
      setTimeout(() => processImageTo3DJob(jobId), delay);
    } else {
      // Final failure
      await prisma.imageTo3DJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: msg,
          completedAt: new Date(),
        },
      });

      const productId = job2?.productId || job.productId;
      await prisma.product.update({
        where: { id: productId },
        data: { status: 'GENERATION_FAILED' },
      });
    }
  }
}

/**
 * Call TripoSR API to generate a 3D model from an image.
 *
 * TripoSR expects:
 *   POST /generate
 *   Content-Type: multipart/form-data
 *   Body: { image: <file>, output_format: "glb" }
 *
 * Returns: GLB binary buffer
 */
async function callTripoSR(imagePath: string, config: ImageTo3DConfig): Promise<Buffer> {
  const fullPath = imagePath.startsWith('/') && !imagePath.startsWith('/home')
    ? path.join('./public', imagePath)
    : imagePath;

  if (!existsSync(fullPath)) {
    throw new Error(`Source image not found: ${fullPath}`);
  }

  const imageBuffer = await readFile(fullPath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(imagePath));
  formData.append('output_format', 'glb');
  formData.append('mc_resolution', '256');
  formData.append('render', 'false');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.triposrEndpoint}/generate`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'No response body');
      throw new Error(`TripoSR returned ${response.status}: ${text}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Call InstantMesh API to generate a 3D model from an image.
 *
 * InstantMesh expects:
 *   POST /generate
 *   Content-Type: multipart/form-data
 *   Body: { image: <file> }
 *
 * Returns: GLB binary buffer
 */
async function callInstantMesh(imagePath: string, config: ImageTo3DConfig): Promise<Buffer> {
  const fullPath = imagePath.startsWith('/') && !imagePath.startsWith('/home')
    ? path.join('./public', imagePath)
    : imagePath;

  if (!existsSync(fullPath)) {
    throw new Error(`Source image not found: ${fullPath}`);
  }

  const imageBuffer = await readFile(fullPath);
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: mimeType }), path.basename(imagePath));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.instantmeshEndpoint}/generate`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'No response body');
      throw new Error(`InstantMesh returned ${response.status}: ${text}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Automatically create and publish an AR experience when a product becomes AR_READY.
 */
async function autoCreateExperience(productId: string, companyId: string): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { experiences: true },
  });

  if (!product) return;

  // Check if a PRODUCT_VIEWER experience already exists
  const existingExperience = product.experiences.find(
    (e) => e.experienceType === 'PRODUCT_VIEWER'
  );

  if (existingExperience) {
    // Publish existing experience if not already published
    if (existingExperience.publishStatus !== 'PUBLISHED') {
      await prisma.experience.update({
        where: { id: existingExperience.id },
        data: { publishStatus: 'PUBLISHED' },
      });

      await prisma.publishRecord.create({
        data: {
          experienceId: existingExperience.id,
          companyId,
          publishStatus: 'PUBLISHED',
          publicUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/ar/${existingExperience.slug}`,
          publishedAt: new Date(),
          publishedBy: 'system',
        },
      });
    }
    return;
  }

  // Create a new experience
  const productSlug = product.title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 40);

  const slug = `${productSlug}-${Math.random().toString(36).substring(2, 8)}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const experience = await prisma.experience.create({
    data: {
      companyId,
      productId,
      name: `${product.title} - AR View`,
      slug,
      experienceType: 'PRODUCT_VIEWER',
      publishStatus: 'PUBLISHED',
      scale: product.scalePreset,
    },
  });

  await prisma.publishRecord.create({
    data: {
      experienceId: experience.id,
      companyId,
      publishStatus: 'PUBLISHED',
      publicUrl: `${appUrl}/ar/${slug}`,
      publishedAt: new Date(),
      publishedBy: 'system',
    },
  });

  console.log(`Auto-created AR experience for product ${productId}: /ar/${slug}`);
}

/**
 * Retry a failed job.
 */
export async function retryJob(jobId: string): Promise<void> {
  const job = await prisma.imageTo3DJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'failed') {
    throw new Error('Job not found or not in failed state');
  }

  await prisma.imageTo3DJob.update({
    where: { id: jobId },
    data: {
      status: 'pending',
      errorMessage: null,
      retryCount: 0,
      completedAt: null,
    },
  });

  processImageTo3DJob(jobId).catch((err) => {
    console.error(`Retry of job ${jobId} failed:`, err);
  });
}

/**
 * Get job status for a product.
 */
export async function getProductGenerationStatus(productId: string) {
  return prisma.imageTo3DJob.findFirst({
    where: { productId },
    orderBy: { createdAt: 'desc' },
  });
}
