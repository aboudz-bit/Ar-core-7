'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { FaceTrackingResult, FaceLandmark } from './FaceTracker';

interface OverlayAsset {
  id: string;
  assetType: string;
  filePath: string;
  metadata: Record<string, unknown> | null;
}

interface TryOnOverlayRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackingResult: FaceTrackingResult | null;
  overlays: OverlayAsset[];
  placementMode: string;
  scale: number;
  enabled: boolean;
}

// Landmark indices
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_BRIDGE_TOP = 6;
const FOREHEAD_CENTER = 10;
const FOREHEAD_LEFT = 67;
const FOREHEAD_RIGHT = 297;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;

interface OverlayTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

function computeGlassesTransform(
  landmarks: FaceLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): OverlayTransform {
  const leftEye = landmarks[LEFT_EYE_OUTER];
  const rightEye = landmarks[RIGHT_EYE_OUTER];
  const noseBridge = landmarks[NOSE_BRIDGE_TOP];

  // Center point between eyes
  const centerX = ((leftEye.x + rightEye.x) / 2) * canvasWidth;
  const centerY = noseBridge.y * canvasHeight;

  // Width based on eye-to-eye distance (with padding for frames)
  const eyeDistance = Math.sqrt(
    ((rightEye.x - leftEye.x) * canvasWidth) ** 2 +
    ((rightEye.y - leftEye.y) * canvasHeight) ** 2
  );
  const width = eyeDistance * 1.8 * scale;
  const height = width * 0.45; // Typical glasses aspect ratio

  // Rotation from eye line
  const rotation = Math.atan2(
    (rightEye.y - leftEye.y) * canvasHeight,
    (rightEye.x - leftEye.x) * canvasWidth
  );

  return { x: centerX, y: centerY, width, height, rotation };
}

function computeHatTransform(
  landmarks: FaceLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): OverlayTransform {
  const forehead = landmarks[FOREHEAD_CENTER];
  const foreheadL = landmarks[FOREHEAD_LEFT];
  const foreheadR = landmarks[FOREHEAD_RIGHT];

  const centerX = forehead.x * canvasWidth;
  const centerY = forehead.y * canvasHeight - 20; // Offset above forehead

  const foreheadWidth = Math.sqrt(
    ((foreheadR.x - foreheadL.x) * canvasWidth) ** 2 +
    ((foreheadR.y - foreheadL.y) * canvasHeight) ** 2
  );
  const width = foreheadWidth * 2.2 * scale;
  const height = width * 0.7;

  const rotation = Math.atan2(
    (foreheadR.y - foreheadL.y) * canvasHeight,
    (foreheadR.x - foreheadL.x) * canvasWidth
  );

  return { x: centerX, y: centerY - height * 0.3, width, height, rotation };
}

function computeEarringTransform(
  landmarks: FaceLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  side: 'left' | 'right'
): OverlayTransform {
  const ear = side === 'left' ? landmarks[LEFT_EAR] : landmarks[RIGHT_EAR];

  const x = ear.x * canvasWidth;
  const y = (ear.y + 0.02) * canvasHeight; // Slightly below ear

  const width = 30 * scale;
  const height = 50 * scale;

  return { x, y, width, height, rotation: 0 };
}

function getTransformForPlacement(
  placement: string,
  landmarks: FaceLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  scale: number
): OverlayTransform {
  switch (placement) {
    case 'GLASSES':
      return computeGlassesTransform(landmarks, canvasWidth, canvasHeight, scale);
    case 'HAT':
      return computeHatTransform(landmarks, canvasWidth, canvasHeight, scale);
    case 'EARRING_LEFT':
      return computeEarringTransform(landmarks, canvasWidth, canvasHeight, scale, 'left');
    case 'EARRING_RIGHT':
      return computeEarringTransform(landmarks, canvasWidth, canvasHeight, scale, 'right');
    default:
      return computeGlassesTransform(landmarks, canvasWidth, canvasHeight, scale);
  }
}

/**
 * TryOnOverlayRenderer — renders overlay images/models on a canvas,
 * positioned according to face tracking landmarks.
 */
export function TryOnOverlayRenderer({
  canvasRef,
  videoRef,
  trackingResult,
  overlays,
  placementMode,
  scale,
  enabled,
}: TryOnOverlayRendererProps) {
  const overlayImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const rafRef = useRef<number>(0);

  // Pre-load overlay images
  useEffect(() => {
    const imageMap = overlayImagesRef.current;
    overlays.forEach((overlay) => {
      if (overlay.assetType === 'FACE_OVERLAY_IMAGE' && !imageMap.has(overlay.id)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = overlay.filePath;
        imageMap.set(overlay.id, img);
      }
    });
  }, [overlays]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
    }

    // Clear and draw mirrored video frame
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw overlay if face is tracked
    if (trackingResult && trackingResult.landmarks.length > 0) {
      const { landmarks } = trackingResult;

      overlays.forEach((overlay) => {
        if (overlay.assetType !== 'FACE_OVERLAY_IMAGE') return;

        const img = overlayImagesRef.current.get(overlay.id);
        if (!img || !img.complete) return;

        // Determine placement from overlay metadata or default
        const placement = (overlay.metadata?.placement as string) || placementMode;
        const transform = getTransformForPlacement(
          placement,
          landmarks,
          canvas.width,
          canvas.height,
          scale
        );

        // Mirror the x coordinate since we drew the video mirrored
        const mirroredX = canvas.width - transform.x;

        ctx.save();
        ctx.translate(mirroredX, transform.y);
        ctx.rotate(-transform.rotation); // Negate rotation for mirror
        ctx.drawImage(
          img,
          -transform.width / 2,
          -transform.height / 2,
          transform.width,
          transform.height
        );
        ctx.restore();
      });
    }

    rafRef.current = requestAnimationFrame(render);
  }, [canvasRef, videoRef, trackingResult, overlays, placementMode, scale, enabled]);

  useEffect(() => {
    if (enabled) {
      rafRef.current = requestAnimationFrame(render);
    }
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, render]);

  return null; // Headless — renders directly to the canvas ref
}
