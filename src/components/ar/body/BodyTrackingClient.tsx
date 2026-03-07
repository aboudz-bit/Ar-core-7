'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Eye, EyeOff, Tags } from 'lucide-react';
import { BodyTracker, useBodyCamera } from './BodyTracker';
import { BodySkeletonRenderer } from './BodySkeletonRenderer';
import type { BodyTrackingResult } from './BodyTracker';

interface BodyTrackingClientProps {
  experience: {
    id: string;
    name: string;
    slug: string;
    type: string;
    sceneConfig: Record<string, unknown> | null;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    brandPrimary: string;
    logoUrl: string | null;
  };
  branding: {
    hideBranding: boolean;
  };
}

type AppState = 'loading' | 'ready' | 'camera_error' | 'tracking' | 'no_body';

export function BodyTrackingClient({ experience, product, company, branding }: BodyTrackingClientProps) {
  const { videoRef, cameraReady, cameraError, startCamera, stopCamera } = useBodyCamera('user');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trackingResult, setTrackingResult] = useState<BodyTrackingResult | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');
  const [trackingEnabled, setTrackingEnabled] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  // Track analytics
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        productId: product?.id,
        experienceId: experience.id,
        eventType: 'body_tracking_view',
        sessionId: Math.random().toString(36).slice(2),
      }),
    }).catch(() => {});
  }, [company.id, product?.id, experience.id]);

  // Start camera on mount
  useEffect(() => { startCamera(); }, [startCamera]);

  // Update app state
  useEffect(() => {
    if (cameraError) {
      setAppState('camera_error');
    } else if (cameraReady && !trackingEnabled) {
      setAppState('ready');
      setTrackingEnabled(true);
    } else if (trackingEnabled && trackingResult) {
      setAppState('tracking');
    } else if (trackingEnabled && !trackingResult) {
      setAppState('no_body');
    }
  }, [cameraReady, cameraError, trackingEnabled, trackingResult]);

  const handleTrackingResults = useCallback((result: BodyTrackingResult | null) => {
    setTrackingResult(result);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    window.history.back();
  }, [stopCamera]);

  if (appState === 'camera_error') {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-6" />
        <h1 className="text-xl font-bold text-white mb-2">Camera Access Required</h1>
        <p className="text-sm text-white/60 mb-2 max-w-sm">
          Body tracking needs camera access to detect your pose and body landmarks.
        </p>
        <p className="text-xs text-white/40 mb-6 max-w-sm">{cameraError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: company.brandPrimary }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />

      {/* Body tracking engine (headless) */}
      <BodyTracker
        videoRef={videoRef}
        onResults={handleTrackingResults}
        enabled={trackingEnabled}
      />

      {/* Skeleton renderer */}
      <BodySkeletonRenderer
        canvasRef={canvasRef}
        videoRef={videoRef}
        trackingResult={trackingResult}
        enabled={trackingEnabled && cameraReady}
        showLandmarkDots={showDots}
        showLabels={showLabels}
      />

      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 w-11 h-11 bg-black/50 backdrop-blur-md text-white rounded-full flex items-center justify-center"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Mode badge */}
      <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
        Body Tracking
      </div>

      {/* Loading overlay */}
      {appState === 'loading' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
          <p className="text-white/80 text-sm font-medium">Initializing body tracking...</p>
          <p className="text-white/40 text-xs mt-2">Please allow camera access</p>
        </div>
      )}

      {/* No body detected hint */}
      {appState === 'no_body' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-xl text-center">
          <p className="text-amber-200 text-xs font-medium">Step back so your body is visible in the frame</p>
        </div>
      )}

      {/* Debug controls */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex gap-2">
        <button
          onClick={() => setShowDots((v) => !v)}
          className={`h-11 px-4 rounded-full backdrop-blur-md border flex items-center justify-center text-xs font-medium gap-1.5 ${
            showDots ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/50 border-white/10'
          }`}
        >
          {showDots ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          Landmarks
        </button>
        <button
          onClick={() => setShowLabels((v) => !v)}
          className={`h-11 px-4 rounded-full backdrop-blur-md border flex items-center justify-center text-xs font-medium gap-1.5 ${
            showLabels ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-white/50 border-white/10'
          }`}
        >
          <Tags className="w-3.5 h-3.5" />
          Labels
        </button>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/85 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">{product?.title || experience.name}</p>
            <p className="text-white/50 text-xs mt-0.5">{company.name}</p>
          </div>
          {/* Landmark count */}
          {trackingResult && (
            <div className="px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md text-white text-xs">
              {trackingResult.landmarks.filter((l) => l.visibility > 0.5).length} / 33 landmarks
            </div>
          )}
        </div>
        {!branding.hideBranding && (
          <p className="text-[10px] text-white/20 text-center mt-3">Powered by AR-core-7</p>
        )}
      </div>
    </div>
  );
}
