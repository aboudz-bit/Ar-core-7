/**
 * Tracking Services
 *
 * Centralized exports for face and body tracking capabilities.
 * Uses MediaPipe as the primary real-time tracking engine.
 */

export {
  type FaceLandmark,
  type FaceTrackingResult,
  type FaceTrackingConfig,
  FACE_LANDMARK_INDICES,
  estimateFaceRotation,
  smoothLandmarks,
  computeFaceDimensions,
  isFaceTrackingSupported,
  loadFaceMesh,
} from './face-tracking';

export {
  type BodyLandmark,
  type BodyTrackingResult,
  type BodyTrackingConfig,
  BODY_LANDMARK_INDICES,
  SKELETON_CONNECTIONS,
  BODY_REGIONS,
  computeRegionBounds,
  smoothBodyLandmarks,
  isBodyTrackingSupported,
  loadPoseDetector,
} from './body-tracking';
