'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface BodyLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface BodyTrackingResult {
  landmarks: BodyLandmark[];
  worldLandmarks: BodyLandmark[];
}

interface BodyTrackerProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onResults: (result: BodyTrackingResult | null) => void;
  enabled: boolean;
}

export function BodyTracker({ videoRef, onResults, enabled }: BodyTrackerProps) {
  const poseRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;

  useEffect(() => {
    if (!enabled) {
      onResults(null);
      return;
    }

    let cancelled = false;

    function processFrame() {
      if (cancelled || !enabledRef.current) return;

      const video = videoRef.current;
      const pose = poseRef.current;
      if (!video || !pose || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pose as any).send({ image: video }).then(() => {
        if (!cancelled) rafRef.current = requestAnimationFrame(processFrame);
      }).catch(() => {
        if (!cancelled) rafRef.current = requestAnimationFrame(processFrame);
      });
    }

    async function initPose() {
      try {
        console.log('[BodyTracker] Loading MediaPipe Pose from CDN...');
        const { loadPoseLib } = await import('@/lib/mediapipe-loader');
        const Pose = await loadPoseLib();
        console.log('[BodyTracker] Pose constructor loaded');

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

        pose.onResults((results: {
          poseLandmarks?: BodyLandmark[];
          poseWorldLandmarks?: BodyLandmark[];
        }) => {
          if (cancelled) return;

          if (!results.poseLandmarks || results.poseLandmarks.length === 0) {
            onResultsRef.current(null);
            return;
          }

          onResultsRef.current({
            landmarks: results.poseLandmarks,
            worldLandmarks: results.poseWorldLandmarks || [],
          });
        });

        console.log('[BodyTracker] Initializing Pose WASM...');
        await pose.initialize();
        console.log('[BodyTracker] Pose WASM initialized, starting frame loop');

        if (cancelled) {
          pose.close?.();
          return;
        }

        poseRef.current = pose;
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('[BodyTracker] Failed to initialize MediaPipe Pose:', err);
        onResultsRef.current(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return null;
}

export function useBodyCamera(facingMode: 'user' | 'environment' = 'user') {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      console.log('[BodyCamera] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      console.log('[BodyCamera] getUserMedia resolved, tracks:', stream.getVideoTracks().length);

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        console.error('[BodyCamera] videoRef.current is null — video element not mounted');
        setCameraError('Video element not available');
        return;
      }

      video.srcObject = stream;
      console.log('[BodyCamera] srcObject set, waiting for loadedmetadata...');

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video load timeout (10s)')), 10000);

        function onLoaded() {
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
          resolve();
        }
        function onError() {
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('error', onError);
          reject(new Error('Video element error event'));
        }

        if (video.readyState >= 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          video.addEventListener('loadedmetadata', onLoaded);
          video.addEventListener('error', onError);
        }
      });

      console.log('[BodyCamera] Metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);

      try {
        await video.play();
      } catch (playErr) {
        console.warn('[BodyCamera] play() threw (may be auto-playing already):', playErr);
      }

      console.log('[BodyCamera] Video playing, readyState:', video.readyState);
      setCameraReady(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      console.error('[BodyCamera] Failed:', message, err);
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
