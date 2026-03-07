'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { BodyLandmark } from '@/services/tracking/body-tracking';

export interface BodyTrackingResult {
  landmarks: BodyLandmark[];
  worldLandmarks: BodyLandmark[];
}

interface BodyTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onResults: (result: BodyTrackingResult | null) => void;
  enabled: boolean;
}

/**
 * BodyTracker — loads MediaPipe Pose and runs real-time body landmark detection.
 * Headless component that manages the MediaPipe lifecycle and animation loop.
 */
export function BodyTracker({ videoRef, onResults, enabled }: BodyTrackerProps) {
  const poseRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);

  const processFrame = useCallback(async () => {
    if (!enabled || !videoRef.current || !poseRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2) {
      rafRef.current = requestAnimationFrame(processFrame);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pose = poseRef.current as any;
      await pose.send({ image: video });
    } catch {
      // Frame processing error, skip
    }

    rafRef.current = requestAnimationFrame(processFrame);
  }, [enabled, videoRef]);

  useEffect(() => {
    if (!enabled) {
      onResults(null);
      return;
    }

    let cancelled = false;

    async function initPose() {
      try {
        // Load MediaPipe Pose from CDN via script injection
        const { loadPoseLib } = await import('@/lib/mediapipe-loader');
        const Pose = await loadPoseLib();

        if (cancelled) return;

        const pose = new Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults((results) => {
          if (cancelled) return;

          if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
            onResults(null);
            return;
          }

          onResults({
            landmarks: results.poseLandmarks,
            worldLandmarks: results.poseWorldLandmarks || [],
          });
        });

        poseRef.current = pose;
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('Failed to initialize MediaPipe Pose:', err);
        onResults(null);
      }
    }

    initPose();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      if (poseRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (poseRef.current as any).close?.();
        poseRef.current = null;
      }
    };
  }, [enabled, onResults, processFrame]);

  return null;
}

/**
 * Hook to manage camera stream for body tracking.
 * Uses the back camera by default for full-body capture.
 */
export function useBodyCamera(facingMode: 'user' | 'environment' = 'user') {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
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
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  return { videoRef, cameraReady, cameraError, startCamera, stopCamera };
}
