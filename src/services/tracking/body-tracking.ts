/**
 * Body Tracking Service
 *
 * Abstraction over MediaPipe Pose for real-time body/pose landmark detection.
 * Used by BODY_TRYON experiences for skeleton visualization and future garment attachment.
 *
 * Reference: https://github.com/google-ai-edge/mediapipe
 */

export interface BodyLandmark {
  x: number; // Normalized 0-1
  y: number; // Normalized 0-1
  z: number; // Depth estimate
  visibility: number; // 0-1 confidence that landmark is visible
}

export interface BodyTrackingResult {
  landmarks: BodyLandmark[];
  worldLandmarks: BodyLandmark[]; // 3D real-world coordinates in meters
  connections: [number, number][]; // Pairs of landmark indices to draw skeleton
}

export interface BodyTrackingConfig {
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

const DEFAULT_CONFIG: Required<BodyTrackingConfig> = {
  modelComplexity: 1,
  smoothLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

/**
 * MediaPipe Pose landmark indices.
 * 33 landmarks total covering the full body.
 */
export const BODY_LANDMARK_INDICES = {
  // Head
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,

  // Upper body
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

  // Lower body
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/**
 * Standard skeleton connections for drawing.
 * Each pair is [fromLandmarkIndex, toLandmarkIndex].
 */
export const SKELETON_CONNECTIONS: [number, number][] = [
  // Torso
  [11, 12], // shoulders
  [11, 23], // left shoulder to left hip
  [12, 24], // right shoulder to right hip
  [23, 24], // hips

  // Left arm
  [11, 13], // shoulder to elbow
  [13, 15], // elbow to wrist
  [15, 17], // wrist to pinky
  [15, 19], // wrist to index
  [15, 21], // wrist to thumb

  // Right arm
  [12, 14], // shoulder to elbow
  [14, 16], // elbow to wrist
  [16, 18], // wrist to pinky
  [16, 20], // wrist to index
  [16, 22], // wrist to thumb

  // Left leg
  [23, 25], // hip to knee
  [25, 27], // knee to ankle
  [27, 29], // ankle to heel
  [27, 31], // ankle to foot index

  // Right leg
  [24, 26], // hip to knee
  [26, 28], // knee to ankle
  [28, 30], // ankle to heel
  [28, 32], // ankle to foot index

  // Head
  [0, 1], [1, 2], [2, 3], // left eye
  [0, 4], [4, 5], [5, 6], // right eye
  [9, 10], // mouth
  [3, 7],  // left eye to left ear
  [6, 8],  // right eye to right ear
];

/**
 * Body region definitions for future garment attachment.
 */
export const BODY_REGIONS = {
  HEAD: { landmarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
  TORSO: { landmarks: [11, 12, 23, 24] },
  LEFT_ARM: { landmarks: [11, 13, 15, 17, 19, 21] },
  RIGHT_ARM: { landmarks: [12, 14, 16, 18, 20, 22] },
  LEFT_LEG: { landmarks: [23, 25, 27, 29, 31] },
  RIGHT_LEG: { landmarks: [24, 26, 28, 30, 32] },
  UPPER_BODY: { landmarks: [11, 12, 13, 14, 15, 16, 23, 24] },
  LOWER_BODY: { landmarks: [23, 24, 25, 26, 27, 28] },
} as const;

/**
 * Compute bounding box for a set of body landmarks.
 */
export function computeRegionBounds(landmarks: BodyLandmark[], indices: readonly number[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const idx of indices) {
    const lm = landmarks[idx];
    if (!lm || lm.visibility < 0.5) continue;
    minX = Math.min(minX, lm.x);
    minY = Math.min(minY, lm.y);
    maxX = Math.max(maxX, lm.x);
    maxY = Math.max(maxY, lm.y);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Smooth body landmarks using exponential moving average.
 */
export function smoothBodyLandmarks(
  current: BodyLandmark[],
  previous: BodyLandmark[] | null,
  factor: number
): BodyLandmark[] {
  if (!previous || previous.length !== current.length) return current;
  return current.map((point, i) => ({
    x: previous[i].x + (point.x - previous[i].x) * factor,
    y: previous[i].y + (point.y - previous[i].y) * factor,
    z: previous[i].z + (point.z - previous[i].z) * factor,
    visibility: point.visibility,
  }));
}

/**
 * Check if the browser supports body tracking.
 */
export function isBodyTrackingSupported(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') return { supported: false, reason: 'Server-side rendering' };
  if (!navigator.mediaDevices?.getUserMedia) return { supported: false, reason: 'Camera API not available' };
  if (!window.WebAssembly) return { supported: false, reason: 'WebAssembly not supported' };
  return { supported: true };
}

/**
 * Load MediaPipe Pose library dynamically.
 */
export async function loadPoseDetector(config: BodyTrackingConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const { Pose } = await import('@mediapipe/pose') as {
    Pose: new (opts: { locateFile: (file: string) => string }) => {
      setOptions: (opts: Record<string, unknown>) => void;
      onResults: (cb: (results: {
        poseLandmarks?: BodyLandmark[];
        poseWorldLandmarks?: BodyLandmark[];
      }) => void) => void;
      send: (input: { image: HTMLVideoElement }) => Promise<void>;
      close: () => void;
    };
  };

  const pose = new Pose({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
  });

  pose.setOptions({
    modelComplexity: cfg.modelComplexity,
    smoothLandmarks: cfg.smoothLandmarks,
    minDetectionConfidence: cfg.minDetectionConfidence,
    minTrackingConfidence: cfg.minTrackingConfidence,
  });

  return pose;
}
