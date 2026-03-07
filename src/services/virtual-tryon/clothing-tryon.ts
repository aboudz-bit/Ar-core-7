import { prisma } from '@/lib/prisma';
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { computeBodyMeasurements, enhanceWithProfile, type BodyProfile } from '@/services/body/body-measurements';
import { generateOcclusionMask, renderOcclusionSVG } from './body-mask';
import { getWarpEngine } from './warp-engine';
import { recommendSize, type SizeRecommendation } from '@/services/size-recommendation/size-engine';
import { segmentBody, isSegmentationResult } from '@/services/segmentation/body-segmentation';

export type TryOnJobStatus = 'UPLOADED' | 'PROCESSING' | 'COMPLETE' | 'FAILED';

export interface CreateTryOnJobInput {
  companyId: string;
  experienceId?: string;
  personImagePath: string;
  garmentImagePath: string;
  provider?: string;
  bodyLandmarks?: Array<{ x: number; y: number; z: number; visibility: number }>;
  bodyProfile?: BodyProfile;
  garmentCategory?: string;
  fitType?: string;
  drapeFactor?: number;
  sizeChart?: Record<string, Record<string, number | undefined>>;
  garmentLength?: number;
  sleeveLength?: number;
  shoulderSpec?: number;
  chestSpec?: number;
  sizingSystem?: string;
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
      metadata: (input.bodyLandmarks || input.bodyProfile || input.garmentCategory || input.fitType || input.drapeFactor !== undefined || input.sizeChart || input.garmentLength || input.sleeveLength || input.shoulderSpec || input.chestSpec || input.sizingSystem)
        ? JSON.parse(JSON.stringify({
            ...(input.bodyLandmarks ? { bodyLandmarks: input.bodyLandmarks } : {}),
            ...(input.bodyProfile ? { bodyProfile: input.bodyProfile } : {}),
            ...(input.garmentCategory ? { garmentCategory: input.garmentCategory } : {}),
            ...(input.fitType ? { fitType: input.fitType } : {}),
            ...(input.drapeFactor !== undefined ? { drapeFactor: input.drapeFactor } : {}),
            ...(input.sizeChart ? { sizeChart: input.sizeChart } : {}),
            ...(input.garmentLength ? { garmentLength: input.garmentLength } : {}),
            ...(input.sleeveLength ? { sleeveLength: input.sleeveLength } : {}),
            ...(input.shoulderSpec ? { shoulderSpec: input.shoulderSpec } : {}),
            ...(input.chestSpec ? { chestSpec: input.chestSpec } : {}),
            ...(input.sizingSystem ? { sizingSystem: input.sizingSystem } : {}),
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

    const meta = job.metadata as Record<string, unknown> | null;
    const storedLandmarks = meta?.bodyLandmarks as
      Array<{ x: number; y: number; z: number; visibility: number }> | undefined;
    const storedProfile = meta?.bodyProfile as BodyProfile | undefined;
    const drapeFactor = typeof meta?.drapeFactor === 'number' ? meta.drapeFactor : 1.0;

    let baseMeasurements = storedLandmarks
      ? computeBodyMeasurements(storedLandmarks, pW, pH)
      : null;

    const bodyMeasurements = baseMeasurements && storedProfile
      ? enhanceWithProfile(baseMeasurements, storedProfile, pH)
      : baseMeasurements;

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
      garmentW = Math.max(Math.round(bodyMeasurements.shoulderWidthPx * 1.2), 60);
      garmentH = Math.max(Math.round(bodyMeasurements.torsoHeightPx * 1.3), 35);
      overlayLeft = Math.round(bodyMeasurements.chestCenterXPx - garmentW / 2);
      overlayTop = Math.round(bodyMeasurements.chestCenterYPx + bodyMeasurements.torsoHeightPx * 0.35 - garmentH / 2);
      placementMethod = storedProfile ? 'body-measurements+profile' : 'body-measurements';
    } else {
      garmentW = Math.max(Math.round(pW * 0.6 * profileOnlyFactor), 60);
      garmentH = Math.max(Math.round(pH * 0.35), 35);
      overlayLeft = Math.round((pW - garmentW) / 2);
      overlayTop = Math.round(pH * 0.25);
      placementMethod = storedProfile ? 'fixed-proportional+profile' : 'fixed-proportional';
    }

    overlayLeft = Math.max(0, Math.min(overlayLeft, pW - garmentW));
    overlayTop = Math.max(0, Math.min(overlayTop, pH - garmentH));

    let garmentResized: Buffer = Buffer.alloc(0);
    let warpApplied = false;
    let warpEngineName = 'none';

    if (bodyMeasurements && storedLandmarks && storedLandmarks.length >= 25) {
      try {
        const engine = getWarpEngine('geometric');
        const garmentBuf = await sharp(job.garmentImagePath).png().toBuffer();

        const warpResult = await engine.warp({
          personImageBuffer: await sharp(job.personImagePath).png().toBuffer(),
          garmentImageBuffer: garmentBuf,
          landmarks: storedLandmarks,
          measurements: bodyMeasurements,
          targetHeight: garmentH,
          imageWidth: pW,
          imageHeight: pH,
          drapeFactor,
        });

        garmentResized = warpResult.buffer;
        garmentW = warpResult.canvasWidth;
        garmentH = warpResult.canvasHeight;
        overlayLeft = Math.round(bodyMeasurements.chestCenterXPx - garmentW / 2);
        overlayLeft = Math.max(0, Math.min(overlayLeft, pW - garmentW));
        overlayTop = Math.max(0, Math.min(overlayTop, pH - garmentH));
        warpApplied = true;
        warpEngineName = warpResult.engineName;
      } catch (warpErr) {
        console.warn(`[TryOnJob ${jobId}] Warp engine failed, falling back to flat resize:`, warpErr);
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

    const outputDir = path.join(process.cwd(), 'public', 'uploads', 'tryon-output');
    await mkdir(outputDir, { recursive: true });

    const outputFileName = `tryon_${jobId}_${Date.now()}.png`;
    const outputFilePath = path.join(outputDir, outputFileName);
    const publicPath = `/uploads/tryon-output/${outputFileName}`;

    const compositeLayers: Array<{ input: Buffer; left: number; top: number; blend: string }> = [];

    compositeLayers.push({
      input: garmentResized,
      left: overlayLeft,
      top: overlayTop,
      blend: 'over',
    });

    let occlusionApplied = false;
    let segmentationUsed = false;

    if (storedLandmarks && storedLandmarks.length >= 23) {
      const personBuffer = await sharp(job.personImagePath)
        .resize(pW, pH, { fit: 'fill' })
        .ensureAlpha()
        .png()
        .toBuffer();

      const segResult = await segmentBody(personBuffer, bodyMeasurements);

      if (isSegmentationResult(segResult)) {
        try {
          const occlusionLayer = await sharp(personBuffer)
            .composite([{
              input: segResult.maskBuffer,
              blend: 'dest-in' as never,
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
          segmentationUsed = true;
        } catch (segErr) {
          console.warn(`[TryOnJob ${jobId}] Segmentation compositing failed, trying landmark fallback:`, segErr);
        }
      }

      if (!segmentationUsed) {
        const maskResult = generateOcclusionMask(storedLandmarks, pW, pH);

        if (maskResult.hasOcclusion) {
          try {
            const svgMask = renderOcclusionSVG(maskResult.occlusionRegions, pW, pH);
            const svgBuffer = Buffer.from(svgMask);

            const maskImage = await sharp(svgBuffer)
              .resize(pW, pH)
              .grayscale()
              .png()
              .toBuffer();

            const occlusionLayer = await sharp(personBuffer)
              .composite([{
                input: maskImage,
                blend: 'dest-in' as never,
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
            console.warn(`[TryOnJob ${jobId}] Occlusion mask failed, using simple overlay:`, maskErr);
          }
        }
      }
    }

    await personImage
      .composite(compositeLayers as Parameters<typeof personImage.composite>[0])
      .png()
      .toFile(outputFilePath);

    const processingTime = Date.now() - startTime;

    const validCategories = ['t-shirt', 'shirt', 'jacket', 'hoodie', 'sweater', 'thobe', 'abaya', 'dress', 'polo', 'other'] as const;
    const validFitTypes = ['slim', 'regular', 'oversized', 'loose'] as const;
    const rawCategory = (meta?.garmentCategory as string) || undefined;
    const rawFitType = (meta?.fitType as string) || undefined;
    const storedCategory = rawCategory && (validCategories as readonly string[]).includes(rawCategory)
      ? (rawCategory as import('@/services/size-recommendation/size-engine').GarmentCategory)
      : undefined;
    const storedFitType = rawFitType && (validFitTypes as readonly string[]).includes(rawFitType)
      ? (rawFitType as import('@/services/size-recommendation/size-engine').FitType)
      : undefined;

    const validSizingSystems = ['letter', 'numeric', 'custom'] as const;
    const rawSizingSystem = (meta?.sizingSystem as string) || undefined;
    const storedSizingSystem = rawSizingSystem && (validSizingSystems as readonly string[]).includes(rawSizingSystem)
      ? (rawSizingSystem as import('@/services/size-recommendation/size-engine').SizingSystem)
      : undefined;

    const storedSizeChart = meta?.sizeChart as Record<string, Record<string, number | undefined>> | undefined;
    const storedGarmentLength = typeof meta?.garmentLength === 'number' ? meta.garmentLength : undefined;
    const storedSleeveLength = typeof meta?.sleeveLength === 'number' ? meta.sleeveLength : undefined;
    const storedShoulderSpec = typeof meta?.shoulderSpec === 'number' ? meta.shoulderSpec : undefined;
    const storedChestSpec = typeof meta?.chestSpec === 'number' ? meta.chestSpec : undefined;

    let sizeRecommendation: SizeRecommendation | null = null;
    try {
      sizeRecommendation = recommendSize({
        bodyMeasurements: bodyMeasurements || undefined,
        userProfile: storedProfile
          ? { heightCm: storedProfile.heightCm, weightKg: storedProfile.weightKg, usualSize: storedProfile.usualSize }
          : undefined,
        garmentMetadata: (storedCategory || storedFitType || storedSizeChart || storedSizingSystem || storedGarmentLength || storedSleeveLength || storedShoulderSpec || storedChestSpec)
          ? {
              category: storedCategory,
              fitType: storedFitType,
              sizeChart: storedSizeChart,
              sizingSystem: storedSizingSystem,
              garmentLength: storedGarmentLength,
              sleeveLength: storedSleeveLength,
              shoulderSpec: storedShoulderSpec,
              chestSpec: storedChestSpec,
            }
          : undefined,
      });
    } catch (sizeErr) {
      console.warn(`[TryOnJob ${jobId}] Size recommendation failed:`, sizeErr);
    }

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
          segmentationUsed,
          warpEngine: warpEngineName,
          drapeFactor,
          ...(sizeRecommendation && { sizeRecommendation: JSON.parse(JSON.stringify(sizeRecommendation)) }),
          note: 'Estimation-based compositing with section-geometric cloth warping, ' +
            (segmentationUsed ? 'BodyPix segmentation masking' : 'landmark-polygon occlusion masking') +
            ', and category-aware size recommendation. Results are approximate.',
        },
      },
    });

    console.log(`[TryOnJob ${jobId}] Completed in ${processingTime}ms — output: ${publicPath} (segmentation: ${segmentationUsed}, warp: ${warpEngineName})`);
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
