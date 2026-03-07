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
import { computeBodyMeasurements, enhanceWithProfile, type BodyProfile } from '@/services/body/body-measurements';
import { generateOcclusionMask, renderOcclusionSVG } from './body-mask';
import { warpGarment } from './cloth-warp';

export type TryOnJobStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface CreateTryOnJobInput {
  companyId: string;
  experienceId?: string;
  personImagePath: string;
  garmentImagePath: string;
  provider?: string;
  /** Optional body landmarks (normalized 0–1) for measurement-based placement */
  bodyLandmarks?: Array<{ x: number; y: number; z: number; visibility: number }>;
  /** Optional user-provided body profile for enhanced fitting */
  bodyProfile?: BodyProfile;
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
      metadata: (input.bodyLandmarks || input.bodyProfile)
        ? JSON.parse(JSON.stringify({
            ...(input.bodyLandmarks ? { bodyLandmarks: input.bodyLandmarks } : {}),
            ...(input.bodyProfile ? { bodyProfile: input.bodyProfile } : {}),
          }))
        : undefined,
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

    // Try measurement-based placement if landmarks are stored in metadata
    const meta = job.metadata as Record<string, unknown> | null;
    const storedLandmarks = meta?.bodyLandmarks as
      Array<{ x: number; y: number; z: number; visibility: number }> | undefined;
    const storedProfile = meta?.bodyProfile as BodyProfile | undefined;

    let baseMeasurements = storedLandmarks
      ? computeBodyMeasurements(storedLandmarks, pW, pH)
      : null;

    // Enhance with user profile (height/weight) if available
    const bodyMeasurements = baseMeasurements && storedProfile
      ? enhanceWithProfile(baseMeasurements, storedProfile, pH)
      : baseMeasurements;

    // If we only have a profile (no landmarks), use height/weight to
    // estimate proportional placement better than pure fixed fallback.
    let profileOnlyFactor = 1.0;
    if (!bodyMeasurements && storedProfile) {
      const heightM = storedProfile.heightCm / 100;
      const bmi = storedProfile.weightKg / (heightM * heightM);
      if (bmi < 18.5) profileOnlyFactor = 0.90;
      else if (bmi < 25) profileOnlyFactor = 1.0;
      else if (bmi < 30) profileOnlyFactor = 1.08;
      else profileOnlyFactor = 1.15;
    }

    let garmentW: number;
    let garmentH: number;
    let overlayLeft: number;
    let overlayTop: number;
    let placementMethod: string;

    if (bodyMeasurements) {
      // SMART PLACEMENT: scale and position based on body measurements
      // (already adjusted by bodyBuildFactor if profile was provided)
      garmentW = Math.max(Math.round(bodyMeasurements.shoulderWidthPx * 1.2), 60);
      garmentH = Math.max(Math.round(bodyMeasurements.torsoHeightPx * 1.3), 35);
      overlayLeft = Math.round(bodyMeasurements.chestCenterXPx - garmentW / 2);
      overlayTop = Math.round(bodyMeasurements.chestCenterYPx + bodyMeasurements.torsoHeightPx * 0.35 - garmentH / 2);
      placementMethod = storedProfile ? 'body-measurements+profile' : 'body-measurements';
    } else {
      // FALLBACK: fixed proportional placement, adjusted by profile if available
      garmentW = Math.max(Math.round(pW * 0.6 * profileOnlyFactor), 60);
      garmentH = Math.max(Math.round(pH * 0.35), 35);
      overlayLeft = Math.round((pW - garmentW) / 2);
      overlayTop = Math.round(pH * 0.25);
      placementMethod = storedProfile ? 'fixed-proportional+profile' : 'fixed-proportional';
    }

    // Clamp to image bounds
    overlayLeft = Math.max(0, Math.min(overlayLeft, pW - garmentW));
    overlayTop = Math.max(0, Math.min(overlayTop, pH - garmentH));

    // --- CLOTH WARPING ---
    // If we have landmarks + measurements, warp the garment to follow body contour.
    // Otherwise, fall back to flat rectangular resize.
    let garmentResized: Buffer = Buffer.alloc(0);
    let warpApplied = false;

    if (bodyMeasurements && storedLandmarks && storedLandmarks.length >= 25) {
      try {
        const warpResult = await warpGarment(
          await sharp(job.garmentImagePath).png().toBuffer(),
          {
            measurements: bodyMeasurements,
            landmarks: storedLandmarks,
            targetHeight: garmentH,
            imageWidth: pW,
            imageHeight: pH,
            stripCount: 12,
          },
        );

        garmentResized = warpResult.buffer;
        // Update dimensions to match the warped output
        garmentW = warpResult.canvasWidth;
        garmentH = warpResult.canvasHeight;
        // Re-center the garment overlay based on warped width
        overlayLeft = Math.round(bodyMeasurements.chestCenterXPx - garmentW / 2);
        overlayLeft = Math.max(0, Math.min(overlayLeft, pW - garmentW));
        overlayTop = Math.max(0, Math.min(overlayTop, pH - garmentH));
        warpApplied = true;
      } catch (warpErr) {
        console.warn(`[TryOnJob ${jobId}] Cloth warp failed, falling back to flat resize:`, warpErr);
        // Fall through to flat resize below
      }
    }

    if (!warpApplied) {
      garmentResized = await sharp(job.garmentImagePath)
        .resize({
          width: garmentW,
          height: garmentH,
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
    }

    const garmentMeta = await sharp(garmentResized).metadata();
    const gW = garmentMeta.width || garmentW;
    const gH = garmentMeta.height || garmentH;

    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'tryon-output');
    await mkdir(outputDir, { recursive: true });

    const outputFileName = `tryon_${jobId}_${Date.now()}.png`;
    const outputFilePath = path.join(outputDir, outputFileName);
    const publicPath = `/uploads/tryon-output/${outputFileName}`;

    // Build composite layers
    const compositeLayers: Array<{ input: Buffer; left: number; top: number; blend: string }> = [];

    // Layer 1: garment on top of person
    compositeLayers.push({
      input: garmentResized,
      left: overlayLeft,
      top: overlayTop,
      blend: 'over',
    });

    // Layer 2: occlusion mask — body regions (head/neck/arms) ON TOP of garment
    // This creates the illusion of natural layering.
    let occlusionApplied = false;
    if (storedLandmarks && storedLandmarks.length >= 23) {
      const maskResult = generateOcclusionMask(storedLandmarks, pW, pH);

      if (maskResult.hasOcclusion) {
        try {
          // Render the mask SVG: white = body in front, black = garment visible
          const svgMask = renderOcclusionSVG(maskResult.occlusionRegions, pW, pH);
          const svgBuffer = Buffer.from(svgMask);

          // Convert SVG mask to a grayscale alpha channel
          const maskImage = await sharp(svgBuffer)
            .resize(pW, pH)
            .grayscale()
            .png()
            .toBuffer();

          // Extract person pixels and apply the mask as alpha:
          // Only head/neck/arm regions from the original person image survive
          const personPixels = await sharp(job.personImagePath)
            .resize(pW, pH, { fit: 'fill' })
            .ensureAlpha()
            .png()
            .toBuffer();

          // Composite: use the mask to cut out only the occlusion regions
          // from the person image, then layer those on top of the garment
          const occlusionLayer = await sharp(personPixels)
            .composite([{
              input: maskImage,
              blend: 'dest-in' as never, // keep person pixels only where mask is white
            }])
            .png()
            .toBuffer();

          compositeLayers.push({
            input: occlusionLayer,
            left: 0,
            top: 0,
            blend: 'over',
          });

          occlusionApplied = true;
        } catch (maskErr) {
          // If masking fails, fall back to simple overlay (no crash)
          console.warn(`[TryOnJob ${jobId}] Occlusion mask failed, using simple overlay:`, maskErr);
        }
      }
    }

    await personImage
      .composite(compositeLayers as Parameters<typeof personImage.composite>[0])
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
          placementMethod,
          ...(bodyMeasurements && {
            shoulderWidthPx: bodyMeasurements.shoulderWidthPx,
            torsoHeightPx: bodyMeasurements.torsoHeightPx,
            confidence: bodyMeasurements.confidence,
          }),
          ...(storedProfile && {
            profileHeightCm: storedProfile.heightCm,
            profileWeightKg: storedProfile.weightKg,
            profileUsualSize: storedProfile.usualSize || null,
          }),
          clothWarp: warpApplied,
          occlusionMask: occlusionApplied,
          note: 'Estimation-based compositing with section-geometric cloth warping and landmark-polygon occlusion masking — not AI deformation or pixel-accurate segmentation. Results are approximate.',
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
