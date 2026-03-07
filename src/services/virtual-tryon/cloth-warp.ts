/**
 * Cloth Warping Service (Section-based geometric warp)
 *
 * Splits a garment image into horizontal strips and scales each strip
 * independently to follow the body's width profile from shoulders → hips.
 * This makes the garment appear to conform to the body shape instead of
 * sitting as a flat rectangle.
 *
 * HONEST DISCLAIMER:
 * This is NOT physics-based cloth simulation or AI cloth deformation.
 * It is a geometric approximation that:
 *   - Splits the garment into horizontal sections
 *   - Scales each section width based on interpolated body width at that Y
 *   - Applies optional vertical curvature to follow the torso centerline
 *
 * It produces a meaningful visual improvement for front-facing poses
 * but does NOT model fabric drape, folds, wrinkles, or 3D cloth behavior.
 *
 * Production upgrade path:
 *   - TPS (Thin Plate Spline) warp with dense correspondences
 *   - VITON-HD / HR-VITON style ML warping network
 *   - 3D garment mesh deformation
 */

import type { BodyMeasurements } from '@/services/body/body-measurements';

/** MediaPipe Pose landmark indices we use for warping */
const LM = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

interface LandmarkPoint {
  x: number; // normalized 0–1
  y: number;
  z: number;
  visibility: number;
}

export interface WarpParams {
  /** Body measurements (from body-measurements service) */
  measurements: BodyMeasurements;
  /** Raw landmarks for fine-grained width interpolation */
  landmarks: LandmarkPoint[];
  /** Target garment total height in pixels */
  targetHeight: number;
  /** Image width for pixel conversion */
  imageWidth: number;
  /** Image height for pixel conversion */
  imageHeight: number;
  /** Number of horizontal strips to split into (more = smoother, slower) */
  stripCount?: number;
}

export interface WarpResult {
  /** The warped garment as a PNG buffer */
  buffer: Buffer;
  /** Width of the output canvas */
  canvasWidth: number;
  /** Height of the output canvas */
  canvasHeight: number;
  /** Per-strip width info for debugging */
  strips: Array<{ y: number; width: number; offsetX: number }>;
  /** Method description */
  method: 'section-geometric-warp';
}

/**
 * Compute the body width at a given normalized Y position by interpolating
 * between shoulder width and hip width, with optional curvature for the
 * natural torso taper (chest → waist → hip).
 *
 * The body profile is modeled as:
 *   - Shoulders (t=0): full shoulder width
 *   - Waist (t≈0.55): narrower (waist taper)
 *   - Hips (t=1): hip width
 *
 * This produces a subtle hourglass or V-taper shape depending on proportions.
 */
function bodyWidthAtT(
  t: number,
  shoulderWidthPx: number,
  hipWidthPx: number,
): number {
  // Clamp t to [0, 1]
  const tc = Math.max(0, Math.min(1, t));

  // Waist taper: narrowest point at ~55% down the torso
  // waistRatio < 1 means waist is narrower than linear interpolation
  const waistPosition = 0.55;
  const waistRatio = 0.85; // waist is ~85% of the linear interpolation

  // Simple two-segment interpolation with waist dip:
  // segment 1: shoulder → waist (0 → waistPosition)
  // segment 2: waist → hip (waistPosition → 1)
  const linearWidth = shoulderWidthPx + (hipWidthPx - shoulderWidthPx) * tc;

  // Apply Gaussian-like waist taper centered at waistPosition
  const waistDist = (tc - waistPosition) / 0.3; // normalized distance from waist
  const waistFactor = 1 - (1 - waistRatio) * Math.exp(-waistDist * waistDist);

  return linearWidth * waistFactor;
}

/**
 * Compute the body centerline X offset at a normalized Y position.
 * If the torso has a slight lean (shoulder center != hip center),
 * the garment strips follow that lean.
 */
function bodyCenterXAtT(
  t: number,
  shoulderCenterXPx: number,
  hipCenterXPx: number,
): number {
  const tc = Math.max(0, Math.min(1, t));
  return shoulderCenterXPx + (hipCenterXPx - shoulderCenterXPx) * tc;
}

/**
 * Warp a garment image to follow body contours.
 *
 * Algorithm:
 * 1. Split garment into N horizontal strips
 * 2. For each strip, compute the body width at that Y-level
 * 3. Resize the strip to match that width
 * 4. Position each strip on a canvas, centered on the body centerline
 * 5. Return the assembled warped garment
 *
 * @param garmentBuffer - Original garment image as PNG buffer
 * @param params - Warp parameters (measurements, landmarks, etc.)
 * @returns Warped garment buffer and metadata
 */
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
    stripCount = 12,
  } = params;

  // Get precise landmark positions for shoulder/hip centers
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const lh = landmarks[LM.LEFT_HIP];
  const rh = landmarks[LM.RIGHT_HIP];

  const shoulderCenterXPx = ((ls.x + rs.x) / 2) * imageWidth;
  const hipCenterXPx = ((lh.x + rh.x) / 2) * imageWidth;

  // Use measurement values (may include profile-based bodyBuildFactor)
  const shoulderW = measurements.shoulderWidthPx * 1.2; // garment is ~120% of shoulder width
  const hipW = measurements.hipWidthPx * 1.15;           // garment is ~115% of hip width

  // Get garment source dimensions
  const garmentMeta = await sharp(garmentBuffer).metadata();
  const srcW = garmentMeta.width || 200;
  const srcH = garmentMeta.height || 300;

  // Ensure reasonable strip count
  const strips = Math.max(4, Math.min(stripCount, Math.floor(targetHeight / 4)));
  const stripHeight = Math.max(1, Math.floor(targetHeight / strips));

  // Compute the max width across all strips (for the output canvas)
  const stripInfos: Array<{ t: number; width: number; centerX: number }> = [];
  let maxStripWidth = 0;

  for (let i = 0; i < strips; i++) {
    const t = i / (strips - 1); // 0 to 1
    const width = Math.max(20, Math.round(bodyWidthAtT(t, shoulderW, hipW)));
    const centerX = bodyCenterXAtT(t, shoulderCenterXPx, hipCenterXPx);
    stripInfos.push({ t, width, centerX });
    maxStripWidth = Math.max(maxStripWidth, width);
  }

  // Canvas width: enough to fit the widest strip + any center offset
  // We compute relative to a common center
  const avgCenterX = (shoulderCenterXPx + hipCenterXPx) / 2;
  let canvasWidth = maxStripWidth;

  // Account for centerline offset — if the body leans, canvas needs extra room
  const maxLeftExtent = Math.max(...stripInfos.map(s => s.width / 2 + Math.abs(s.centerX - avgCenterX)));
  canvasWidth = Math.max(canvasWidth, Math.round(maxLeftExtent * 2));
  canvasWidth = Math.max(canvasWidth, 60); // minimum

  const canvasHeight = stripHeight * strips;

  // Resize the garment source to match target height for strip extraction
  const garmentScaled = await sharp(garmentBuffer)
    .resize({
      width: srcW, // keep original width, we'll scale per strip
      height: canvasHeight,
      fit: 'fill',
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  // Process each strip: extract, resize width, position on canvas
  const stripLayers: Array<{ input: Buffer; left: number; top: number }> = [];
  const stripDebug: Array<{ y: number; width: number; offsetX: number }> = [];

  for (let i = 0; i < strips; i++) {
    const srcStripTop = i * stripHeight;
    const srcStripHeight = Math.min(stripHeight, canvasHeight - srcStripTop);
    if (srcStripHeight <= 0) continue;

    const info = stripInfos[i];

    // Extract the horizontal strip from the source garment
    const strip = await sharp(garmentScaled)
      .extract({
        left: 0,
        top: srcStripTop,
        width: srcW,
        height: srcStripHeight,
      })
      .resize({
        width: info.width,
        height: srcStripHeight,
        fit: 'fill',
      })
      .png()
      .toBuffer();

    // Position: center the strip relative to the canvas center
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

  // Assemble all strips onto a transparent canvas
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
  };
}
