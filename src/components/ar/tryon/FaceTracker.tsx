'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Face landmark point from MediaPipe Face Mesh.
 * Each point has x, y (normalized 0-1) and z (depth estimate).
 */
export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceTrackingResult {
  landmarks: FaceLandmark[];
  faceWidth: number;
  faceHeight: number;
  rotation: { pitch: number; yaw: number; roll: number };
}

interface FaceTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onResults: (result: FaceTrackingResult | null) => void;
  enabled: boolean;
  smoothingFactor?: number;
}

// MediaPipe key landmark indices
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
const NOSE_TIP = 1;
const FOREHEAD = 10;
const CHIN = 152;
const LEFT_EAR = 234;
const RIGHT_EAR = 454;

function estimateRotation(landmarks: FaceLandmark[]): { pitch: number; yaw: number; roll: number } {
  const nose = landmarks[NOSE_TIP];
  const forehead = landmarks[FOREHEAD];
  const chin = landmarks[CHIN];
  const leftEar = landmarks[LEFT_EAR];
  const rightEar = landmarks[RIGHT_EAR];

  // Yaw: horizontal rotation based on nose position relative to ears
  const earMidX = (leftEar.x + rightEar.x) / 2;
  const yaw = (nose.x - earMidX) * 2;

  // Pitch: vertical rotation based on nose-forehead-chin alignment
  const faceMidY = (forehead.y + chin.y) / 2;
  const pitch = (nose.y - faceMidY) * 2;

  // Roll: head tilt based on eye line angle
  const leftEye = landmarks[LEFT_EYE_OUTER];
  const rightEye = landmarks[RIGHT_EYE_OUTER];
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  return { pitch, yaw, roll };
}

/**
 * FaceTracker — loads MediaPipe Face Mesh and runs real-time face detection
 * on the provided video element. Calls onResults with landmark data each frame.
 *
 * This is a headless component (no visual output). It manages the MediaPipe
 * lifecycle and animation loop.
 */
export function FaceTracker({ videoRef, onResults, enabled, smoothingFactor = 0.3 }: FaceTrackerProps) {
  const faceMeshRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const prevResultRef = useRef<FaceTrackingResult | null>(null);

  const smoothLandmarks = useCallback((
    current: FaceLandmark[],
    previous: FaceLandmark[] | null,
    factor: number
  ): FaceLandmark[] => {
    if (!previous) return current;
    return current.map((point, i) => ({
      x: previous[i].x + (point.x - previous[i].x) * factor,
      y: previous[i].y + (point.y - previous[i].y) * factor,
      z: previous[i].z + (point.z - previous[i].z) * factor,
    }));
  }, []);

  const processFrame = useCallback(async () => {
    if (!enabled || !videoRef.current || !faceMeshRef.current) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const faceMesh = faceMeshRef.current as any;
      await faceMesh.send({ image: video });
    } catch {
      // Frame processing error, skip and continue
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [enabled, videoRef]);

  useEffect(() => {
    if (!enabled) {
      onResults(null);
      return;
    }

    let cancelled = false;

    async function initFaceMesh() {
      try {
        // Dynamically load MediaPipe Face Mesh from CDN
        const { FaceMesh } = await import('@mediapipe/face_mesh') as {
          FaceMesh: new (config: { locateFile: (file: string) => string }) => {
            setOptions: (opts: Record<string, unknown>) => void;
            onResults: (cb: (results: { multiFaceLandmarks?: FaceLandmark[][] }) => void) => void;
            send: (input: { image: HTMLVideoElement }) => Promise<void>;
            close: () => void;
          };
        };

        if (cancelled) return;

        const faceMesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: { multiFaceLandmarks?: FaceLandmark[][] }) => {
          if (cancelled) return;

          if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
            prevResultRef.current = null;
            onResults(null);
            return;
          }

          const rawLandmarks = results.multiFaceLandmarks[0];
          const smoothed = smoothLandmarks(
            rawLandmarks,
            prevResultRef.current?.landmarks || null,
            smoothingFactor
          );

          const leftEye = smoothed[LEFT_EYE_OUTER];
          const rightEye = smoothed[RIGHT_EYE_OUTER];
          const faceWidth = Math.sqrt(
            (rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2
          );

          const forehead = smoothed[FOREHEAD];
          const chin = smoothed[CHIN];
          const faceHeight = Math.sqrt(
            (chin.x - forehead.x) ** 2 + (chin.y - forehead.y) ** 2
          );

          const rotation = estimateRotation(smoothed);

          const result: FaceTrackingResult = {
            landmarks: smoothed,
            faceWidth,
            faceHeight,
            rotation,
          };

          prevResultRef.current = result;
          onResults(result);
        });

        faceMeshRef.current = faceMesh;

        // Start processing loop
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('Failed to initialize MediaPipe Face Mesh:', err);
        onResults(null);
      }
    }

    initFaceMesh();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (faceMeshRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (faceMeshRef.current as any).close?.();
        faceMeshRef.current = null;
      }
    };
  }, [enabled, onResults, smoothingFactor, smoothLandmarks, processFrame]);

  return null; // Headless component
}

/**
 * Hook to manage camera stream for try-on.
 * Returns video ref and stream state.
 */
export function useTryOnCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setCameraError(message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return { videoRef, cameraReady, cameraError, startCamera, stopCamera };
}
