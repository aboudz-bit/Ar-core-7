'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

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

  const earMidX = (leftEar.x + rightEar.x) / 2;
  const yaw = (nose.x - earMidX) * 2;

  const faceMidY = (forehead.y + chin.y) / 2;
  const pitch = (nose.y - faceMidY) * 2;

  const leftEye = landmarks[LEFT_EYE_OUTER];
  const rightEye = landmarks[RIGHT_EYE_OUTER];
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  return { pitch, yaw, roll };
}

export function FaceTracker({ videoRef, onResults, enabled, smoothingFactor = 0.3 }: FaceTrackerProps) {
  const faceMeshRef = useRef<unknown>(null);
  const rafRef = useRef<number>(0);
  const prevResultRef = useRef<FaceTrackingResult | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onResultsRef = useRef(onResults);
  onResultsRef.current = onResults;
  const smoothingRef = useRef(smoothingFactor);
  smoothingRef.current = smoothingFactor;

  useEffect(() => {
    if (!enabled) {
      onResults(null);
      return;
    }

    let cancelled = false;

    function processFrame() {
      if (cancelled || !enabledRef.current) return;

      const video = videoRef.current;
      const faceMesh = faceMeshRef.current;
      if (!video || !faceMesh || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(processFrame);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (faceMesh as any).send({ image: video }).then(() => {
        if (!cancelled) rafRef.current = requestAnimationFrame(processFrame);
      }).catch(() => {
        if (!cancelled) rafRef.current = requestAnimationFrame(processFrame);
      });
    }

    async function initFaceMesh() {
      try {
        console.log('[FaceTracker] Loading MediaPipe FaceMesh from CDN...');
        const { loadFaceMeshLib } = await import('@/lib/mediapipe-loader');
        const FaceMesh = await loadFaceMeshLib();
        console.log('[FaceTracker] FaceMesh constructor loaded');

        if (cancelled) return;

        const faceMesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
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
            onResultsRef.current(null);
            return;
          }

          const rawLandmarks = results.multiFaceLandmarks[0];
          const prev = prevResultRef.current?.landmarks || null;
          const factor = smoothingRef.current;
          const smoothed = (prev && prev.length === rawLandmarks.length)
            ? rawLandmarks.map((point, i) => ({
                x: prev[i].x + (point.x - prev[i].x) * factor,
                y: prev[i].y + (point.y - prev[i].y) * factor,
                z: prev[i].z + (point.z - prev[i].z) * factor,
              }))
            : rawLandmarks;

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
          const result: FaceTrackingResult = { landmarks: smoothed, faceWidth, faceHeight, rotation };
          prevResultRef.current = result;
          onResultsRef.current(result);
        });

        console.log('[FaceTracker] Initializing FaceMesh WASM...');
        await faceMesh.initialize();
        console.log('[FaceTracker] FaceMesh WASM initialized, starting frame loop');

        if (cancelled) {
          faceMesh.close?.();
          return;
        }

        faceMeshRef.current = faceMesh;
        rafRef.current = requestAnimationFrame(processFrame);
      } catch (err) {
        console.error('[FaceTracker] Failed to initialize MediaPipe Face Mesh:', err);
        onResultsRef.current(null);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return null;
}

export function useTryOnCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      console.log('[Camera] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      console.log('[Camera] getUserMedia resolved, tracks:', stream.getVideoTracks().length);

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        console.error('[Camera] videoRef.current is null — video element not mounted');
        setCameraError('Video element not available');
        return;
      }

      video.srcObject = stream;
      console.log('[Camera] srcObject set, waiting for loadedmetadata...');

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

      console.log('[Camera] Metadata loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);

      try {
        await video.play();
      } catch (playErr) {
        console.warn('[Camera] play() threw (may be auto-playing already):', playErr);
      }

      console.log('[Camera] Video playing, readyState:', video.readyState);
      setCameraReady(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      console.error('[Camera] Failed:', message, err);
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
    return () => { stopCamera(); };
  }, [stopCamera]);

  return { videoRef, cameraReady, cameraError, startCamera, stopCamera };
}
