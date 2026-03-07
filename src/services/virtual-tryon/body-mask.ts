/**
 * Body Segmentation Mask Generator (Landmark-based approximation)
 *
 * Generates occlusion masks from MediaPipe Pose landmarks so that body parts
 * (neck, chin, forearms/hands) appear IN FRONT of the garment overlay, creating
 * a more natural layered look.
 *
 * HONEST DISCLAIMER:
 * This is NOT true semantic segmentation (e.g. DeepLab, BodyPix, SAM).
 * It is a geometric approximation that draws mask regions from landmark
 * positions. It works well for front-facing, clearly-visible poses and
 * produces a meaningful improvement over flat overlay, but it will not
 * handle complex poses, occlusions, or edge cases as accurately as a
 * real segmentation model would.
 *
 * Production upgrade path: Use a real segmentation model (SAM, BodyPix,
 * or a dedicated clothing segmentation API) to generate pixel-accurate masks.
 */

/** Landmark indices (MediaPipe Pose 33-point model) */
const LM = {
  NOSE: 0,
  LEFT_EYE: 2,
  RIGHT_EYE: 5,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
} as const;

interface Point {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface OcclusionRegion {
  /** Region type for debugging/metadata */
  type: 'neck' | 'left_forearm' | 'right_forearm' | 'head_chin';
  /** SVG path data for the mask polygon */
  svgPath: string;
  /** Bounding box (pixel coords) */
  bounds: { x: number; y: number; w: number; h: number };
  /** Minimum visibility of landmarks used */
  confidence: number;
}

export interface BodyMaskResult {
  /** Regions that should occlude (appear in front of) the garment */
  occlusionRegions: OcclusionRegion[];
  /** Whether any usable regions were generated */
  hasOcclusion: boolean;
  /** Method description */
  method: 'landmark-polygon';
}

function px(normalized: number, dimension: number): number {
  return Math.round(normalized * dimension);
}

function mid(a: Point, b: Point): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function visible(p: Point, threshold = 0.4): boolean {
  return p.visibility > threshold;
}

/**
 * Generate occlusion mask regions from body landmarks.
 *
 * The garment is composited FIRST, then these regions are extracted from
 * the original person image and composited ON TOP of the garment, creating
 * a natural layering effect (arms/neck/chin in front of garment).
 *
 * @param landmarks - 33 MediaPipe Pose landmarks (normalized 0–1)
 * @param imgWidth - Image width in pixels
 * @param imgHeight - Image height in pixels
 */
export function generateOcclusionMask(
  landmarks: Point[],
  imgWidth: number,
  imgHeight: number,
): BodyMaskResult {
  if (!landmarks || landmarks.length < 23) {
    return { occlusionRegions: [], hasOcclusion: false, method: 'landmark-polygon' };
  }

  const regions: OcclusionRegion[] = [];

  // -----------------------------------------------------------------------
  // 1. HEAD / CHIN region
  //    The chin and lower face should appear in front of a shirt's neckline.
  //    We create an oval/polygon from nose, ears, and shoulder midpoint area.
  // -----------------------------------------------------------------------
  const nose = landmarks[LM.NOSE];
  const leftEar = landmarks[LM.LEFT_EAR];
  const rightEar = landmarks[LM.RIGHT_EAR];
  const leftShoulder = landmarks[LM.LEFT_SHOULDER];
  const rightShoulder = landmarks[LM.RIGHT_SHOULDER];

  if (visible(nose) && visible(leftShoulder) && visible(rightShoulder)) {
    const shoulderMid = mid(leftShoulder, rightShoulder);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

    // Head width: use ears if visible, else ~60% of shoulder width
    const headHalfW = (visible(leftEar) && visible(rightEar))
      ? Math.abs(leftEar.x - rightEar.x) * 0.55
      : shoulderWidth * 0.30;

    // Neck width: ~40% of shoulder width
    const neckHalfW = shoulderWidth * 0.20;

    // Key Y positions
    const topY = nose.y - headHalfW * 0.3; // above nose
    const chinY = nose.y + (shoulderMid.y - nose.y) * 0.45; // chin area
    const neckBottomY = shoulderMid.y + (shoulderMid.y - nose.y) * 0.08; // just below shoulder line

    const cx = nose.x; // center X

    // Build polygon: head → chin → neck
    const points = [
      // Top of head (simplified arc)
      [cx - headHalfW * 0.7, topY],
      [cx, topY - headHalfW * 0.2],
      [cx + headHalfW * 0.7, topY],
      // Side of face right
      [cx + headHalfW, nose.y],
      [cx + headHalfW * 0.85, chinY],
      // Neck right
      [cx + neckHalfW, neckBottomY],
      // Neck bottom
      [cx, neckBottomY + neckHalfW * 0.1],
      // Neck left
      [cx - neckHalfW, neckBottomY],
      // Chin left
      [cx - headHalfW * 0.85, chinY],
      // Side of face left
      [cx - headHalfW, nose.y],
    ];

    const pxPoints = points.map(([x, y]) => [px(x, imgWidth), px(y, imgHeight)]);
    const svgPath = `M ${pxPoints[0][0]} ${pxPoints[0][1]} ` +
      pxPoints.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';

    const xs = pxPoints.map(p => p[0]);
    const ys = pxPoints.map(p => p[1]);
    const minX = Math.max(0, Math.min(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxX = Math.min(imgWidth, Math.max(...xs));
    const maxY = Math.min(imgHeight, Math.max(...ys));

    regions.push({
      type: 'head_chin',
      svgPath,
      bounds: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      confidence: Math.min(nose.visibility, leftShoulder.visibility, rightShoulder.visibility),
    });
  }

  // -----------------------------------------------------------------------
  // 2. NECK region (between chin and garment neckline)
  //    Narrow strip so the garment doesn't cover the neck unnaturally.
  // -----------------------------------------------------------------------
  if (visible(leftShoulder) && visible(rightShoulder)) {
    const shoulderMid = mid(leftShoulder, rightShoulder);
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const neckHalfW = shoulderWidth * 0.18;
    const neckTop = visible(nose)
      ? nose.y + (shoulderMid.y - nose.y) * 0.50
      : shoulderMid.y - shoulderWidth * 0.25;
    const neckBottom = shoulderMid.y + shoulderWidth * 0.05;

    const points = [
      [shoulderMid.x - neckHalfW, neckTop],
      [shoulderMid.x + neckHalfW, neckTop],
      [shoulderMid.x + neckHalfW * 1.2, neckBottom],
      [shoulderMid.x - neckHalfW * 1.2, neckBottom],
    ];

    const pxPoints = points.map(([x, y]) => [px(x, imgWidth), px(y, imgHeight)]);
    const svgPath = `M ${pxPoints[0][0]} ${pxPoints[0][1]} ` +
      pxPoints.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';

    const xs = pxPoints.map(p => p[0]);
    const ys = pxPoints.map(p => p[1]);

    regions.push({
      type: 'neck',
      svgPath,
      bounds: {
        x: Math.max(0, Math.min(...xs)),
        y: Math.max(0, Math.min(...ys)),
        w: Math.min(imgWidth, Math.max(...xs)) - Math.max(0, Math.min(...xs)),
        h: Math.min(imgHeight, Math.max(...ys)) - Math.max(0, Math.min(...ys)),
      },
      confidence: Math.min(leftShoulder.visibility, rightShoulder.visibility),
    });
  }

  // -----------------------------------------------------------------------
  // 3. FOREARM regions (elbow → wrist → hand)
  //    Arms that cross in front of the torso should appear over the garment.
  //    We create thick line polygons from elbow → wrist with hand area.
  // -----------------------------------------------------------------------
  const armPairs: Array<{
    side: 'left_forearm' | 'right_forearm';
    shoulder: Point; elbow: Point; wrist: Point;
    pinky: Point; index: Point; thumb: Point;
  }> = [
    {
      side: 'left_forearm',
      shoulder: landmarks[LM.LEFT_SHOULDER],
      elbow: landmarks[LM.LEFT_ELBOW],
      wrist: landmarks[LM.LEFT_WRIST],
      pinky: landmarks[LM.LEFT_PINKY],
      index: landmarks[LM.LEFT_INDEX],
      thumb: landmarks[LM.LEFT_THUMB],
    },
    {
      side: 'right_forearm',
      shoulder: landmarks[LM.RIGHT_SHOULDER],
      elbow: landmarks[LM.RIGHT_ELBOW],
      wrist: landmarks[LM.RIGHT_WRIST],
      pinky: landmarks[LM.RIGHT_PINKY],
      index: landmarks[LM.RIGHT_INDEX],
      thumb: landmarks[LM.RIGHT_THUMB],
    },
  ];

  for (const arm of armPairs) {
    if (!visible(arm.elbow) || !visible(arm.wrist)) continue;

    // Forearm thickness: ~8% of shoulder width or fallback
    const sw = visible(leftShoulder) && visible(rightShoulder)
      ? Math.abs(leftShoulder.x - rightShoulder.x)
      : 0.25;
    const thickness = sw * 0.10;

    // Direction perpendicular to elbow→wrist for thickness
    const dx = arm.wrist.x - arm.elbow.x;
    const dy = arm.wrist.y - arm.elbow.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.01) continue;
    const nx = -dy / len * thickness;
    const ny = dx / len * thickness;

    const points: number[][] = [
      // Elbow side
      [px(arm.elbow.x + nx, imgWidth), px(arm.elbow.y + ny, imgHeight)],
      [px(arm.elbow.x - nx, imgWidth), px(arm.elbow.y - ny, imgHeight)],
      // Wrist side
      [px(arm.wrist.x - nx, imgWidth), px(arm.wrist.y - ny, imgHeight)],
    ];

    // Add hand points if visible
    const handPoints: Point[] = [arm.pinky, arm.index, arm.thumb].filter(p => visible(p, 0.3));
    if (handPoints.length > 0) {
      for (const hp of handPoints) {
        points.push([px(hp.x, imgWidth), px(hp.y, imgHeight)]);
      }
    }

    // Close the polygon back through wrist other side
    points.push([px(arm.wrist.x + nx, imgWidth), px(arm.wrist.y + ny, imgHeight)]);

    const svgPath = `M ${points[0][0]} ${points[0][1]} ` +
      points.slice(1).map(([x, y]) => `L ${x} ${y}`).join(' ') + ' Z';

    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);

    regions.push({
      type: arm.side,
      svgPath,
      bounds: {
        x: Math.max(0, Math.min(...xs)),
        y: Math.max(0, Math.min(...ys)),
        w: Math.min(imgWidth, Math.max(...xs)) - Math.max(0, Math.min(...xs)),
        h: Math.min(imgHeight, Math.max(...ys)) - Math.max(0, Math.min(...ys)),
      },
      confidence: Math.min(arm.elbow.visibility, arm.wrist.visibility),
    });
  }

  return {
    occlusionRegions: regions,
    hasOcclusion: regions.length > 0,
    method: 'landmark-polygon',
  };
}

/**
 * Render occlusion regions to an SVG string that can be converted to a mask image.
 * White regions = body parts that should appear IN FRONT of the garment.
 * Black background = garment visible.
 */
export function renderOcclusionSVG(
  regions: OcclusionRegion[],
  imgWidth: number,
  imgHeight: number,
): string {
  const paths = regions
    .map(r => `<path d="${r.svgPath}" fill="white"/>`)
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}" viewBox="0 0 ${imgWidth} ${imgHeight}">
  <rect width="${imgWidth}" height="${imgHeight}" fill="black"/>
  ${paths}
</svg>`;
}
