'use client';

import { useEffect, useRef } from 'react';
import { SKELETON_CONNECTIONS } from '@/services/tracking/body-tracking';
import type { BodyTrackingResult } from './BodyTracker';
import type { BodyLandmark } from '@/services/tracking/body-tracking';

interface BodySkeletonRendererProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  trackingResult: BodyTrackingResult | null;
  enabled: boolean;
  showLandmarkDots?: boolean;
  showConnections?: boolean;
  showLabels?: boolean;
  mirrorVideo?: boolean;
}

// Color scheme for different body regions
const REGION_COLORS: Record<string, string> = {
  head: '#60a5fa',       // blue
  torso: '#f59e0b',      // amber
  left_arm: '#10b981',   // emerald
  right_arm: '#8b5cf6',  // violet
  left_leg: '#ef4444',   // red
  right_leg: '#ec4899',  // pink
};

function getConnectionColor(from: number, to: number): string {
  // Head
  if (from <= 10 && to <= 10) return REGION_COLORS.head;
  // Left arm
  if ([11, 13, 15, 17, 19, 21].includes(from) && [11, 13, 15, 17, 19, 21].includes(to)) return REGION_COLORS.left_arm;
  // Right arm
  if ([12, 14, 16, 18, 20, 22].includes(from) && [12, 14, 16, 18, 20, 22].includes(to)) return REGION_COLORS.right_arm;
  // Left leg
  if ([23, 25, 27, 29, 31].includes(from) && [23, 25, 27, 29, 31].includes(to)) return REGION_COLORS.left_leg;
  // Right leg
  if ([24, 26, 28, 30, 32].includes(from) && [24, 26, 28, 30, 32].includes(to)) return REGION_COLORS.right_leg;
  // Torso
  return REGION_COLORS.torso;
}

function getLandmarkColor(index: number): string {
  if (index <= 10) return REGION_COLORS.head;
  if ([11, 13, 15, 17, 19, 21].includes(index)) return REGION_COLORS.left_arm;
  if ([12, 14, 16, 18, 20, 22].includes(index)) return REGION_COLORS.right_arm;
  if ([23, 25, 27, 29, 31].includes(index)) return REGION_COLORS.left_leg;
  if ([24, 26, 28, 30, 32].includes(index)) return REGION_COLORS.right_leg;
  return REGION_COLORS.torso;
}

/**
 * BodySkeletonRenderer — renders body skeleton debug visualization on a canvas.
 * Draws connections between landmarks and optionally landmark dots and labels.
 */
export function BodySkeletonRenderer({
  canvasRef,
  videoRef,
  trackingResult,
  enabled,
  showLandmarkDots = true,
  showConnections = true,
  showLabels = false,
  mirrorVideo = true,
}: BodySkeletonRendererProps) {
  const rafRef = useRef<number>(0);
  const trackingResultRef = useRef(trackingResult);
  trackingResultRef.current = trackingResult;

  useEffect(() => {
    if (!enabled) return;

    function render() {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Match canvas to video dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
      }

      const w = canvas.width;
      const h = canvas.height;

      // Draw video frame (optionally mirrored for front camera)
      ctx.save();
      if (mirrorVideo) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, w, h);
      ctx.restore();

      // Draw skeleton if body is detected
      const result = trackingResultRef.current;
      if (result && result.landmarks.length > 0) {
        const { landmarks } = result;

        // Helper to get canvas coordinates (with optional mirror)
        const toCanvas = (lm: BodyLandmark) => ({
          x: mirrorVideo ? w - lm.x * w : lm.x * w,
          y: lm.y * h,
        });

        // Draw connections
        if (showConnections) {
          for (const [from, to] of SKELETON_CONNECTIONS) {
            const a = landmarks[from];
            const b = landmarks[to];
            if (!a || !b || a.visibility < 0.5 || b.visibility < 0.5) continue;

            const ptA = toCanvas(a);
            const ptB = toCanvas(b);

            ctx.beginPath();
            ctx.moveTo(ptA.x, ptA.y);
            ctx.lineTo(ptB.x, ptB.y);
            ctx.strokeStyle = getConnectionColor(from, to);
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }

        // Draw landmark dots
        if (showLandmarkDots) {
          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            if (lm.visibility < 0.5) continue;

            const pt = toCanvas(lm);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = getLandmarkColor(i);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Labels
            if (showLabels) {
              ctx.font = '10px monospace';
              ctx.fillStyle = '#fff';
              ctx.fillText(String(i), pt.x + 8, pt.y + 4);
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(render);
    }

    rafRef.current = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [enabled, canvasRef, videoRef, showLandmarkDots, showConnections, showLabels, mirrorVideo]);

  return null;
}
