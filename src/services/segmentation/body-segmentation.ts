import type { BodyMeasurements } from '@/services/body/body-measurements';

export interface SegmentationResult {
  maskBuffer: Buffer;
  width: number;
  height: number;
  segmentationUsed: true;
  method: 'bodypix';
  partMasks: {
    torso: Buffer;
    leftArm: Buffer;
    rightArm: Buffer;
    head: Buffer;
  };
}

export interface SegmentationFallback {
  segmentationUsed: false;
  reason: string;
}

export type SegmentationOutput = SegmentationResult | SegmentationFallback;

let bodypixModel: import('@tensorflow-models/body-pix').BodyPix | null = null;
let modelLoadFailed = false;

async function loadModel(): Promise<import('@tensorflow-models/body-pix').BodyPix | null> {
  if (modelLoadFailed) return null;
  if (bodypixModel) return bodypixModel;

  try {
    await import('@tensorflow/tfjs-node');
    const bodyPix = await import('@tensorflow-models/body-pix');
    bodypixModel = await bodyPix.load({
      architecture: 'MobileNetV1',
      outputStride: 16,
      multiplier: 0.75,
      quantBytes: 2,
    });
    console.log('[BodyPix] Model loaded successfully');
    return bodypixModel;
  } catch (err) {
    modelLoadFailed = true;
    console.warn('[BodyPix] Failed to load model, will use landmark fallback:', err instanceof Error ? err.message : err);
    return null;
  }
}

const PART_IDS = {
  LEFT_FACE: 0,
  RIGHT_FACE: 1,
  TORSO_FRONT: 12,
  TORSO_BACK: 13,
  LEFT_UPPER_ARM_FRONT: 6,
  LEFT_UPPER_ARM_BACK: 7,
  LEFT_LOWER_ARM_FRONT: 8,
  LEFT_LOWER_ARM_BACK: 9,
  RIGHT_UPPER_ARM_FRONT: 2,
  RIGHT_UPPER_ARM_BACK: 3,
  RIGHT_LOWER_ARM_FRONT: 4,
  RIGHT_LOWER_ARM_BACK: 5,
  LEFT_HAND: 10,
  RIGHT_HAND: 11,
} as const;

const HEAD_PARTS = new Set([PART_IDS.LEFT_FACE, PART_IDS.RIGHT_FACE]);
const LEFT_ARM_PARTS = new Set([
  PART_IDS.LEFT_UPPER_ARM_FRONT, PART_IDS.LEFT_UPPER_ARM_BACK,
  PART_IDS.LEFT_LOWER_ARM_FRONT, PART_IDS.LEFT_LOWER_ARM_BACK,
  PART_IDS.LEFT_HAND,
]);
const RIGHT_ARM_PARTS = new Set([
  PART_IDS.RIGHT_UPPER_ARM_FRONT, PART_IDS.RIGHT_UPPER_ARM_BACK,
  PART_IDS.RIGHT_LOWER_ARM_FRONT, PART_IDS.RIGHT_LOWER_ARM_BACK,
  PART_IDS.RIGHT_HAND,
]);
const TORSO_PARTS = new Set([PART_IDS.TORSO_FRONT, PART_IDS.TORSO_BACK]);

function createPartMask(
  partData: Int32Array,
  width: number,
  height: number,
  partIds: Set<number>,
  dilateRadius: number = 3,
): Buffer {
  const mask = Buffer.alloc(width * height);
  for (let i = 0; i < partData.length; i++) {
    if (partIds.has(partData[i])) {
      mask[i] = 255;
    }
  }

  if (dilateRadius > 0) {
    const dilated = Buffer.alloc(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y * width + x] === 255) {
          for (let dy = -dilateRadius; dy <= dilateRadius; dy++) {
            for (let dx = -dilateRadius; dx <= dilateRadius; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (dx * dx + dy * dy <= dilateRadius * dilateRadius) {
                  dilated[ny * width + nx] = 255;
                }
              }
            }
          }
        }
      }
    }
    return dilated;
  }

  return mask;
}

export async function segmentBody(
  imageBuffer: Buffer,
  _measurements?: BodyMeasurements | null,
): Promise<SegmentationOutput> {
  const model = await loadModel();
  if (!model) {
    return { segmentationUsed: false, reason: 'BodyPix model not available' };
  }

  try {
    const tf = await import('@tensorflow/tfjs-node');
    const sharp = (await import('sharp')).default;

    const metadata = await sharp(imageBuffer).metadata();
    const origW = metadata.width || 800;
    const origH = metadata.height || 1000;

    const maxDim = 512;
    const scale = Math.min(maxDim / origW, maxDim / origH, 1.0);
    const procW = Math.round(origW * scale);
    const procH = Math.round(origH * scale);

    const rawPixels = await sharp(imageBuffer)
      .resize(procW, procH, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer();

    const input = tf.tensor3d(rawPixels as unknown as ArrayBuffer, [procH, procW, 3], 'int32');

    const segmentation = await model.segmentPersonParts(input, {
      flipHorizontal: false,
      internalResolution: 'medium',
      segmentationThreshold: 0.6,
    });

    input.dispose();

    const partData = segmentation.data as unknown as Int32Array;

    const headMaskRaw = createPartMask(partData, procW, procH, HEAD_PARTS, 5);
    const leftArmMaskRaw = createPartMask(partData, procW, procH, LEFT_ARM_PARTS, 4);
    const rightArmMaskRaw = createPartMask(partData, procW, procH, RIGHT_ARM_PARTS, 4);
    const torsoMaskRaw = createPartMask(partData, procW, procH, TORSO_PARTS, 2);

    const resizeMask = async (raw: Buffer): Promise<Buffer> => {
      return sharp(raw, { raw: { width: procW, height: procH, channels: 1 } })
        .resize(origW, origH, { fit: 'fill' })
        .png()
        .toBuffer();
    };

    const [headMask, leftArmMask, rightArmMask, torsoMask] = await Promise.all([
      resizeMask(headMaskRaw),
      resizeMask(leftArmMaskRaw),
      resizeMask(rightArmMaskRaw),
      resizeMask(torsoMaskRaw),
    ]);

    const ALL_OCCLUSION_PARTS = new Set([...HEAD_PARTS, ...LEFT_ARM_PARTS, ...RIGHT_ARM_PARTS]);
    const combinedOcclusionRaw = createPartMask(partData, procW, procH, ALL_OCCLUSION_PARTS, 5);

    const combinedMask = await sharp(combinedOcclusionRaw, { raw: { width: procW, height: procH, channels: 1 } })
      .resize(origW, origH, { fit: 'fill' })
      .png()
      .toBuffer();

    return {
      maskBuffer: combinedMask,
      width: origW,
      height: origH,
      segmentationUsed: true,
      method: 'bodypix',
      partMasks: {
        torso: torsoMask,
        leftArm: leftArmMask,
        rightArm: rightArmMask,
        head: headMask,
      },
    };
  } catch (err) {
    console.warn('[BodyPix] Segmentation failed:', err instanceof Error ? err.message : err);
    return { segmentationUsed: false, reason: `Segmentation error: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}

export function isSegmentationResult(output: SegmentationOutput): output is SegmentationResult {
  return output.segmentationUsed === true;
}
