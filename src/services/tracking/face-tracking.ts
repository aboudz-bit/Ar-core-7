/**
 * Face Tracking Service
 *
 * Clean abstraction over MediaPipe FaceMesh for real-time face landmark detection.
 * Used by FACE_TRYON experiences to position overlays on detected faces.
 *
 * Reference: https://github.com/google-ai-edge/mediapipe
 */

export interface FaceLandmark {
  x: number; // Normalized 0-1, left to right
  y: number; // Normalized 0-1, top to bottom
  z: number; // Depth estimate
}

export interface FaceTrackingResult {
  landmarks: FaceLandmark[];
  faceWidth: number;
  faceHeight: number;
  rotation: { pitch: number; yaw: number; roll: number };
  confidence: number;
}

export interface FaceTrackingConfig {
  maxFaces?: number;
  refineLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  smoothingFactor?: number;
}

const DEFAULT_CONFIG: Required<FaceTrackingConfig> = {
  maxFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  smoothingFactor: 0.3,
};

// Key MediaPipe Face Mesh landmark indices
export const FACE_LANDMARK_INDICES = {
  // Eye region (for eyewear placement)
  LEFT_EYE_OUTER: 33,
  LEFT_EYE_INNER: 133,
  RIGHT_EYE_OUTER: 263,
  RIGHT_EYE_INNER: 362,
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,

  // Nose (for glasses bridge)
  NOSE_BRIDGE_TOP: 6,
  NOSE_BRIDGE_MID: 197,
  NOSE_TIP: 1,

  // Ears (for glasses temples, earrings)
  LEFT_EAR: 234,
  RIGHT_EAR: 454,

  // Forehead (for hats, headwear)
  FOREHEAD_CENTER: 10,
  FOREHEAD_LEFT: 67,
  FOREHEAD_RIGHT: 297,

  // Chin/jaw (for necklaces, face shape)
  CHIN: 152,
  JAW_LEFT: 172,
  JAW_RIGHT: 397,

  // Lips (for cosmetics)
  UPPER_LIP_CENTER: 0,
  LOWER_LIP_CENTER: 17,
  MOUTH_LEFT: 61,
  MOUTH_RIGHT: 291,

  // Cheeks (for blush, cosmetics)
  LEFT_CHEEK: 50,
  RIGHT_CHEEK: 280,

  // Face oval key points (for face masks, beauty filters)
  FACE_OVAL: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109],
} as const;

/**
 * Estimate face rotation from landmarks.
 */
export function estimateFaceRotation(landmarks: FaceLandmark[]): { pitch: number; yaw: number; roll: number } {
  const nose = landmarks[FACE_LANDMARK_INDICES.NOSE_TIP];
  const forehead = landmarks[FACE_LANDMARK_INDICES.FOREHEAD_CENTER];
  const chin = landmarks[FACE_LANDMARK_INDICES.CHIN];
  const leftEar = landmarks[FACE_LANDMARK_INDICES.LEFT_EAR];
  const rightEar = landmarks[FACE_LANDMARK_INDICES.RIGHT_EAR];
  const leftEye = landmarks[FACE_LANDMARK_INDICES.LEFT_EYE_OUTER];
  const rightEye = landmarks[FACE_LANDMARK_INDICES.RIGHT_EYE_OUTER];

  const earMidX = (leftEar.x + rightEar.x) / 2;
  const yaw = (nose.x - earMidX) * 2;

  const faceMidY = (forehead.y + chin.y) / 2;
  const pitch = (nose.y - faceMidY) * 2;

  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  return { pitch, yaw, roll };
}

/**
 * Smooth landmarks using exponential moving average.
 */
export function smoothLandmarks(
  current: FaceLandmark[],
  previous: FaceLandmark[] | null,
  factor: number
): FaceLandmark[] {
  if (!previous || previous.length !== current.length) return current;
  return current.map((point, i) => ({
    x: previous[i].x + (point.x - previous[i].x) * factor,
    y: previous[i].y + (point.y - previous[i].y) * factor,
    z: previous[i].z + (point.z - previous[i].z) * factor,
  }));
}

/**
 * Compute face dimensions from landmarks.
 */
export function computeFaceDimensions(landmarks: FaceLandmark[]): { width: number; height: number } {
  const leftEye = landmarks[FACE_LANDMARK_INDICES.LEFT_EYE_OUTER];
  const rightEye = landmarks[FACE_LANDMARK_INDICES.RIGHT_EYE_OUTER];
  const forehead = landmarks[FACE_LANDMARK_INDICES.FOREHEAD_CENTER];
  const chin = landmarks[FACE_LANDMARK_INDICES.CHIN];

  const width = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);
  const height = Math.sqrt((chin.x - forehead.x) ** 2 + (chin.y - forehead.y) ** 2);

  return { width, height };
}

/**
 * Check if the user's browser supports the required APIs for face tracking.
 */
export function isFaceTrackingSupported(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined') return { supported: false, reason: 'Server-side rendering' };
  if (!navigator.mediaDevices?.getUserMedia) return { supported: false, reason: 'Camera API not available' };
  if (!window.WebAssembly) return { supported: false, reason: 'WebAssembly not supported' };
  return { supported: true };
}

/**
 * Load the MediaPipe Face Mesh library dynamically.
 * Returns null if loading fails.
 */
export async function loadFaceMesh(config: FaceTrackingConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const { loadFaceMeshLib } = await import('@/lib/mediapipe-loader');
  const FaceMesh = await loadFaceMeshLib();

  const faceMesh = new FaceMesh({
    locateFile: (file: string) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
  });

  faceMesh.setOptions({
    maxNumFaces: cfg.maxFaces,
    refineLandmarks: cfg.refineLandmarks,
    minDetectionConfidence: cfg.minDetectionConfidence,
    minTrackingConfidence: cfg.minTrackingConfidence,
  });

  return faceMesh;
}
