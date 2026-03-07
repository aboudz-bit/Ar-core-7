import type { BodyMeasurements } from '@/services/body/body-measurements';

const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface WarpParams {
  measurements: BodyMeasurements;
  landmarks: LandmarkPoint[];
  targetHeight: number;
  imageWidth: number;
  imageHeight: number;
  stripCount?: number;
  drapeFactor?: number;
}

export interface WarpResult {
  buffer: Buffer;
  canvasWidth: number;
  canvasHeight: number;
  strips: Array<{ y: number; width: number; offsetX: number }>;
  method: 'section-geometric-warp';
  stripCount: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function cubicInterpolate(y0: number, y1: number, y2: number, y3: number, t: number): number {
  const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
  const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const c = -0.5 * y0 + 0.5 * y2;
  const d = y1;
  return a * t * t * t + b * t * t + c * t + d;
}

function bodyWidthAtT(
  t: number,
  shoulderWidthPx: number,
  hipWidthPx: number,
  drapeFactor: number,
): number {
  const tc = Math.max(0, Math.min(1, t));

  const waistPosition = 0.55;
  const waistRatio = 0.82;

  const shoulderBulge = 1.0 + 0.04 * smoothstep(0, 0.12, tc) * (1 - smoothstep(0.12, 0.25, tc));

  const linearWidth = shoulderWidthPx + (hipWidthPx - shoulderWidthPx) * tc;

  const waistDist = (tc - waistPosition) / 0.25;
  const waistFactor = 1 - (1 - waistRatio) * Math.exp(-waistDist * waistDist);

  return linearWidth * waistFactor * shoulderBulge * drapeFactor;
}

function bodyCenterXAtT(
  t: number,
  shoulderCenterXPx: number,
  hipCenterXPx: number,
): number {
  const tc = Math.max(0, Math.min(1, t));
  const mid = shoulderCenterXPx + (hipCenterXPx - shoulderCenterXPx) * tc;
  const curvature = Math.sin(tc * Math.PI) * 0.005 * Math.abs(hipCenterXPx - shoulderCenterXPx);
  return mid + curvature;
}

export async function warpGarment(
  garmentBuffer: Buffer,
  params: WarpParams,
): Promise<WarpResult> {
  const sharp = (await import('sharp')).default;

  const {
    measurements,
    landmarks,
    targetHeight,
    imageWidth,
    imageHeight,
    stripCount = 24,
    drapeFactor = 1.0,
  } = params;

  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];

  const shoulderCenterXPx = ((ls.x + rs.x) / 2) * imageWidth;
  const hipCenterXPx = ((lh.x + rh.x) / 2) * imageWidth;

  const shoulderW = measurements.shoulderWidthPx * 1.2;
  const hipW = measurements.hipWidthPx * 1.15;

  const garmentMeta = await sharp(garmentBuffer).metadata();
  const srcW = garmentMeta.width || 200;
  const srcH = garmentMeta.height || 300;

  const strips = Math.max(6, Math.min(stripCount, Math.floor(targetHeight / 3)));
  const stripHeight = Math.max(1, Math.floor(targetHeight / strips));

  const rawWidths: number[] = [];
  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    rawWidths.push(Math.max(20, bodyWidthAtT(t, shoulderW, hipW, drapeFactor)));
  }

  const smoothedWidths: number[] = [];
  if (strips < 6) {
    smoothedWidths.push(...rawWidths);
  } else {
    const windowSize = 3;
    for (let i = 0; i < strips; i++) {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - windowSize); j <= Math.min(strips - 1, i + windowSize); j++) {
        const weight = 1.0 / (1 + Math.abs(j - i));
        sum += rawWidths[j] * weight;
        count += weight;
      }
      const smoothed = sum / count;

      const i0 = Math.max(0, i - 1);
      const i1 = i;
      const i2 = Math.min(strips - 1, i + 1);
      const i3 = Math.min(strips - 1, i + 2);
      const cubicSmoothed = cubicInterpolate(rawWidths[i0], rawWidths[i1], rawWidths[i2], rawWidths[i3], 0.5);

      const blended = smoothed * 0.6 + cubicSmoothed * 0.4;
      smoothedWidths.push(Math.max(20, Math.round(blended)));
    }
  }

  const stripInfos: Array<{ t: number; width: number; centerX: number }> = [];
  let maxStripWidth = 0;

  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1);
    const width = smoothedWidths[i];
    const centerX = bodyCenterXAtT(t, shoulderCenterXPx, hipCenterXPx);
    stripInfos.push({ t, width, centerX });
    maxStripWidth = Math.max(maxStripWidth, width);
  }

  const avgCenterX = (shoulderCenterXPx + hipCenterXPx) / 2;
  let canvasWidth = maxStripWidth;

  const maxLeftExtent = Math.max(...stripInfos.map(s => s.width / 2 + Math.abs(s.centerX - avgCenterX)));
  canvasWidth = Math.max(canvasWidth, Math.round(maxLeftExtent * 2));
  canvasWidth = Math.max(canvasWidth, 60);

  const canvasHeight = stripHeight * strips;

  const garmentScaled = await sharp(garmentBuffer)
    .resize({
      width: srcW,
      height: canvasHeight,
      fit: 'fill',
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const stripLayers: Array<{ input: Buffer; left: number; top: number }> = [];
  const stripDebug: Array<{ y: number; width: number; offsetX: number }> = [];

  for (let i = 0; i < strips; i++) {
    const srcStripTop = i * stripHeight;
    const srcStripHeight = Math.min(stripHeight, canvasHeight - srcStripTop);
    if (srcStripHeight <= 0) continue;

    const info = stripInfos[i];

    const overlapTop = Math.max(0, srcStripTop - 1);
    const overlapHeight = Math.min(srcStripHeight + 2, canvasHeight - overlapTop);

    const strip = await sharp(garmentScaled)
      .extract({
        left: 0,
        top: overlapTop,
        width: srcW,
        height: overlapHeight,
      })
      .resize({
        width: info.width,
        height: overlapHeight,
        fit: 'fill',
        kernel: 'lanczos3',
      })
      .extract({
        left: 0,
        top: srcStripTop - overlapTop,
        width: info.width,
        height: srcStripHeight,
      })
      .png()
      .toBuffer();

    const canvasCenterX = Math.round(canvasWidth / 2);
    const centerOffset = Math.round(info.centerX - avgCenterX);
    const left = Math.max(0, Math.min(canvasWidth - info.width, canvasCenterX - Math.round(info.width / 2) + centerOffset));

    stripLayers.push({
      input: strip,
      left,
      top: srcStripTop,
    });

    stripDebug.push({
      y: srcStripTop,
      width: info.width,
      offsetX: centerOffset,
    });
  }

  const warped = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(stripLayers.map(layer => ({
      input: layer.input,
      left: layer.left,
      top: layer.top,
      blend: 'over' as const,
    })))
    .png()
    .toBuffer();

  return {
    buffer: warped,
    canvasWidth,
    canvasHeight,
    strips: stripDebug,
    method: 'section-geometric-warp',
    stripCount: strips,
  };
}
