/**
 * Body Measurements Service
 *
 * Computes real-time body measurements from MediaPipe Pose landmarks (33 points).
 * Returns both normalized (0–1) and pixel values based on canvas dimensions.
 */

/** MediaPipe Pose landmark indices */
const LANDMARK = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

interface LandmarkPoint {
  x: number; // normalized 0–1
  y: number; // normalized 0–1
  z: number;
  visibility: number;
}

export interface BodyMeasurements {
  /** Normalized values (0–1 relative to canvas) */
  shoulderWidth: number;
  hipWidth: number;
  torsoHeight: number;
  armLength: number;
  chestCenterX: number;
  chestCenterY: number;

  /** Pixel values */
  shoulderWidthPx: number;
  hipWidthPx: number;
  torsoHeightPx: number;
  armLengthPx: number;
  chestCenterXPx: number;
  chestCenterYPx: number;

  /** Confidence: minimum visibility across key landmarks */
  confidence: number;
}

function dist(a: LandmarkPoint, b: LandmarkPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpoint(a: LandmarkPoint, b: LandmarkPoint): { x: number; y: number } {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Compute body measurements from MediaPipe Pose landmarks.
 *
 * @param landmarks - Array of 33 MediaPipe Pose landmarks (normalized 0–1)
 * @param canvasWidth - Canvas width in pixels
 * @param canvasHeight - Canvas height in pixels
 * @returns BodyMeasurements or null if key landmarks are not visible
 */
export function computeBodyMeasurements(
  landmarks: LandmarkPoint[],
  canvasWidth: number,
  canvasHeight: number,
): BodyMeasurements | null {
  if (!landmarks || landmarks.length < 25) return null;

  const ls = landmarks[LANDMARK.LEFT_SHOULDER];
  const rs = landmarks[LANDMARK.RIGHT_SHOULDER];
  const le = landmarks[LANDMARK.LEFT_ELBOW];
  const re = landmarks[LANDMARK.RIGHT_ELBOW];
  const lw = landmarks[LANDMARK.LEFT_WRIST];
  const rw = landmarks[LANDMARK.RIGHT_WRIST];
  const lh = landmarks[LANDMARK.LEFT_HIP];
  const rh = landmarks[LANDMARK.RIGHT_HIP];

  // Check that core landmarks (shoulders + hips) are visible enough
  const coreVisibility = Math.min(ls.visibility, rs.visibility, lh.visibility, rh.visibility);
  if (coreVisibility < 0.3) return null;

  // Shoulder width
  const shoulderWidth = dist(ls, rs);

  // Hip width
  const hipWidth = dist(lh, rh);

  // Torso height: midpoint of shoulders → midpoint of hips
  const shoulderMid = midpoint(ls, rs);
  const hipMid = midpoint(lh, rh);
  const torsoHeight = Math.sqrt(
    (shoulderMid.x - hipMid.x) ** 2 + (shoulderMid.y - hipMid.y) ** 2,
  );

  // Arm length: average of both arms (shoulder→elbow + elbow→wrist)
  const armVisibility = Math.min(le.visibility, re.visibility, lw.visibility, rw.visibility);
  let armLength: number;
  if (armVisibility > 0.3) {
    const leftArm = dist(ls, le) + dist(le, lw);
    const rightArm = dist(rs, re) + dist(re, rw);
    armLength = (leftArm + rightArm) / 2;
  } else {
    // Estimate from torso if arms not visible
    armLength = torsoHeight * 0.9;
  }

  // Chest center (midpoint of shoulders)
  const chestCenterX = shoulderMid.x;
  const chestCenterY = shoulderMid.y;

  // Overall confidence
  const confidence = armVisibility > 0.3
    ? Math.min(coreVisibility, armVisibility)
    : coreVisibility;

  return {
    shoulderWidth,
    hipWidth,
    torsoHeight,
    armLength,
    chestCenterX,
    chestCenterY,

    shoulderWidthPx: shoulderWidth * canvasWidth,
    hipWidthPx: hipWidth * canvasWidth,
    torsoHeightPx: torsoHeight * canvasHeight,
    armLengthPx: armLength * canvasHeight,
    chestCenterXPx: chestCenterX * canvasWidth,
    chestCenterYPx: chestCenterY * canvasHeight,

    confidence,
  };
}
