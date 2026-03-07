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

/** Pixel-accurate distance accounting for different canvas width/height scales */
function distPx(a: LandmarkPoint, b: LandmarkPoint, canvasWidth: number, canvasHeight: number): number {
  const dx = (a.x - b.x) * canvasWidth;
  const dy = (a.y - b.y) * canvasHeight;
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

    shoulderWidthPx: distPx(ls, rs, canvasWidth, canvasHeight),
    hipWidthPx: distPx(lh, rh, canvasWidth, canvasHeight),
    torsoHeightPx: (() => {
      const dx = (shoulderMid.x - hipMid.x) * canvasWidth;
      const dy = (shoulderMid.y - hipMid.y) * canvasHeight;
      return Math.sqrt(dx * dx + dy * dy);
    })(),
    armLengthPx: armVisibility > 0.3
      ? ((distPx(ls, le, canvasWidth, canvasHeight) + distPx(le, lw, canvasWidth, canvasHeight))
        + (distPx(rs, re, canvasWidth, canvasHeight) + distPx(re, rw, canvasWidth, canvasHeight))) / 2
      : torsoHeight * canvasHeight * 0.9,
    chestCenterXPx: chestCenterX * canvasWidth,
    chestCenterYPx: chestCenterY * canvasHeight,

    confidence,
  };
}

// ---------------------------------------------------------------------------
// Body Profile — user-provided inputs for enhanced fitting
// ---------------------------------------------------------------------------

export interface BodyProfile {
  /** User height in centimeters */
  heightCm: number;
  /** User weight in kilograms */
  weightKg: number;
  /** Optional usual clothing size label (e.g. "M", "L", "42") */
  usualSize?: string;
}

export interface EnhancedBodyMeasurements extends BodyMeasurements {
  /** Estimated real-world shoulder width in cm (approximate) */
  shoulderWidthCm: number;
  /** Estimated real-world hip width in cm (approximate) */
  hipWidthCm: number;
  /** Estimated real-world torso height in cm (approximate) */
  torsoHeightCm: number;
  /** Scale multiplier derived from BMI-range heuristics */
  bodyBuildFactor: number;
  /** The profile that was used */
  profile: BodyProfile;
}

/**
 * Combine camera-based body measurements with user-provided height/weight
 * to produce enhanced, scale-aware measurements.
 *
 * IMPORTANT: This is an estimation system using statistical averages.
 * It does NOT provide medically accurate or tailor-grade measurements.
 *
 * How it works:
 * 1. Camera landmarks give us proportional ratios (e.g. shoulder-to-hip ratio).
 * 2. User height gives us a real-world reference to convert pixel ratios → cm.
 * 3. User weight (via BMI) gives us a body-build factor that adjusts width
 *    estimates, since a heavier person at the same height has wider proportions.
 */
export function enhanceWithProfile(
  measurements: BodyMeasurements,
  profile: BodyProfile,
  canvasHeight: number,
): EnhancedBodyMeasurements {
  // The full body in the camera frame occupies some fraction of canvas height.
  // We use torso as ~30% of total height (anatomical average) to derive a
  // pixel-per-cm factor from the user's stated height.
  const estimatedTorsoRealCm = profile.heightCm * 0.30;
  const pixelsPerCm = measurements.torsoHeightPx / estimatedTorsoRealCm;

  // BMI-based body build factor:
  //   BMI < 18.5 → slim (0.90)
  //   BMI 18.5–25 → average (1.0)
  //   BMI 25–30 → broad (1.08)
  //   BMI > 30 → wider (1.15)
  // This is a rough heuristic, not a precise model.
  const heightM = profile.heightCm / 100;
  const bmi = profile.weightKg / (heightM * heightM);
  let bodyBuildFactor: number;
  if (bmi < 18.5) {
    bodyBuildFactor = 0.90;
  } else if (bmi < 25) {
    bodyBuildFactor = 1.0;
  } else if (bmi < 30) {
    bodyBuildFactor = 1.08;
  } else {
    bodyBuildFactor = 1.15;
  }

  // Convert pixel measurements → approximate cm using the derived scale
  const shoulderWidthCm = pixelsPerCm > 0
    ? (measurements.shoulderWidthPx / pixelsPerCm) * bodyBuildFactor
    : profile.heightCm * 0.25 * bodyBuildFactor; // fallback: ~25% of height

  const hipWidthCm = pixelsPerCm > 0
    ? (measurements.hipWidthPx / pixelsPerCm) * bodyBuildFactor
    : profile.heightCm * 0.18 * bodyBuildFactor;

  const torsoHeightCm = estimatedTorsoRealCm;

  return {
    ...measurements,
    // Adjust pixel values by body build factor (wider/narrower garment)
    shoulderWidthPx: measurements.shoulderWidthPx * bodyBuildFactor,
    hipWidthPx: measurements.hipWidthPx * bodyBuildFactor,
    shoulderWidthCm,
    hipWidthCm,
    torsoHeightCm,
    bodyBuildFactor,
    profile,
  };
}
