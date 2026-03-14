'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, ExternalLink, Loader2, SwitchCamera } from 'lucide-react';
import { FaceTracker, useTryOnCamera } from './FaceTracker';
import { TryOnOverlayRenderer } from './TryOnOverlayRenderer';
import type { FaceTrackingResult } from './FaceTracker';

interface TryOnOverlay {
  id: string;
  assetType: string;
  filePath: string;
  metadata: Record<string, unknown> | null;
}

interface TryOnClientProps {
  experience: {
    id: string;
    name: string;
    slug: string;
    type: string;
    scale: number;
    sceneConfig: Record<string, unknown> | null;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    thumbnailUrl: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    brandPrimary: string;
    logoUrl: string | null;
  };
  overlays: TryOnOverlay[];
  branding: {
    hideBranding: boolean;
    logoUrl: string | null;
  };
}

type AppState = 'loading' | 'ready' | 'camera_error' | 'tracking' | 'no_face';

export function TryOnClient({ experience, product, company, overlays, branding }: TryOnClientProps) {
  const { videoRef, cameraReady, cameraError, startCamera, stopCamera, switchCamera, facingMode } = useTryOnCamera();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [trackingResult, setTrackingResult] = useState<FaceTrackingResult | null>(null);
  const [appState, setAppState] = useState<AppState>('loading');
  const [scale, setScale] = useState(experience.scale || 1.0);
  const [trackingEnabled, setTrackingEnabled] = useState(false);

  // Determine placement mode from experience config or product category
  const placementMode = (experience.sceneConfig?.placementMode as string) ||
    (product?.category?.toLowerCase().includes('eyewear') ? 'GLASSES' :
     product?.category?.toLowerCase().includes('hat') ? 'HAT' : 'GLASSES');

  // Track analytics
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        productId: product?.id,
        experienceId: experience.id,
        eventType: 'tryon_view',
        sessionId: Math.random().toString(36).slice(2),
      }),
    }).catch(() => {});
  }, [company.id, product?.id, experience.id]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
  }, [startCamera]);

  // Update app state based on camera/tracking
  useEffect(() => {
    if (cameraError) {
      setAppState('camera_error');
    } else if (cameraReady && !trackingEnabled) {
      setAppState('ready');
      setTrackingEnabled(true);
    } else if (trackingEnabled && trackingResult) {
      setAppState('tracking');
    } else if (trackingEnabled && !trackingResult) {
      setAppState('no_face');
    }
  }, [cameraReady, cameraError, trackingEnabled, trackingResult]);

  // Timeout: if still in 'loading' after 15s, transition to no_face so the UI isn't stuck
  useEffect(() => {
    if (appState !== 'loading') return;
    const timeout = setTimeout(() => {
      setAppState((s) => (s === 'loading' ? 'no_face' : s));
      if (!trackingEnabled) setTrackingEnabled(true);
    }, 15000);
    return () => clearTimeout(timeout);
  }, [appState, trackingEnabled]);

  const handleTrackingResults = useCallback((result: FaceTrackingResult | null) => {
    setTrackingResult(result);
  }, []);

  const handleClose = useCallback(() => {
    stopCamera();
    window.history.back();
  }, [stopCamera]);

  const handleScaleUp = useCallback(() => {
    setScale((s) => Math.min(2.5, s + 0.1));
  }, []);

  const handleScaleDown = useCallback(() => {
    setScale((s) => Math.max(0.3, s - 0.1));
  }, []);

  const handleScaleReset = useCallback(() => {
    setScale(experience.scale || 1.0);
  }, [experience.scale]);

  // Camera error state
  if (appState === 'camera_error') {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-6" />
        <h1 data-testid="text-experience-name" className="text-xl font-bold text-white mb-2">Camera Access Required</h1>
        <p data-testid="text-product-title" className="text-base font-semibold text-white/80 mb-1">{product?.title || experience.name}</p>
        <p data-testid="text-company-name" className="text-xs text-white/50 mb-4">{company.name}</p>
        <p className="text-sm text-white/60 mb-2 max-w-sm">
          The virtual try-on experience needs camera access to track your face and show how products look on you.
        </p>
        <p className="text-xs text-white/40 mb-6 max-w-sm">
          {cameraError}
        </p>
        <button
          data-testid="button-try-again"
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: company.brandPrimary }}
        >
          Try Again
        </button>
        {product?.thumbnailUrl && (
          <div className="mt-8">
            <p className="text-xs text-white/40 mb-2">Product preview:</p>
            <img src={product.thumbnailUrl} alt={product.title} className="w-32 h-32 object-cover rounded-lg border-2 border-white/20" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Video element for camera feed — positioned off-screen, NOT display:none (iOS requires it visible) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ position: 'absolute', width: 1, height: 1, top: -9999, left: -9999, opacity: 0 }}
      />

      {/* Main canvas — video + overlays rendered here */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Face tracking engine (headless) */}
      <FaceTracker
        videoRef={videoRef}
        onResults={handleTrackingResults}
        enabled={trackingEnabled}
        smoothingFactor={0.3}
      />

      {/* Overlay renderer (headless — renders to canvas) */}
      <TryOnOverlayRenderer
        canvasRef={canvasRef}
        videoRef={videoRef}
        trackingResult={trackingResult}
        overlays={overlays}
        placementMode={placementMode}
        scale={scale}
        enabled={trackingEnabled && cameraReady}
        mirrorVideo={facingMode === 'user'}
      />

      {/* UI: Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-50 w-11 h-11 bg-black/50 backdrop-blur-md text-white border-none rounded-full flex items-center justify-center cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>

      {/* UI: Mode badge */}
      <div className="absolute top-4 left-4 z-50 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
        {experience.type === 'FACE_TRYON' ? 'Face Try-On' : 'Body Try-On'}
      </div>

      {/* UI: Loading overlay */}
      {appState === 'loading' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/80">
          <Loader2 className="w-10 h-10 text-white animate-spin mb-4" />
          <p className="text-white/80 text-sm font-medium">
            {!cameraReady ? 'Initializing camera...' : 'Preparing AR tracking...'}
          </p>
          <p className="text-white/40 text-xs mt-2">
            {!cameraReady ? 'Please allow camera access when prompted' : 'Loading face tracking model'}
          </p>
        </div>
      )}

      {/* UI: No face detected hint */}
      {appState === 'no_face' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-xl text-center">
          <p className="text-amber-200 text-xs font-medium">Position your face in the frame</p>
        </div>
      )}

      {/* UI: Scale controls + camera switch */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex gap-2">
        <button
          data-testid="button-scale-down"
          onClick={handleScaleDown}
          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          data-testid="button-scale-reset"
          onClick={handleScaleReset}
          className="px-4 h-11 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center text-xs font-medium"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Reset
        </button>
        <button
          data-testid="button-scale-up"
          onClick={handleScaleUp}
          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          data-testid="button-switch-camera"
          onClick={switchCamera}
          className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 flex items-center justify-center"
          title={facingMode === 'user' ? 'Switch to back camera' : 'Switch to front camera'}
        >
          <SwitchCamera className="w-4 h-4" />
        </button>
      </div>

      {/* UI: Bottom info bar */}
      <div className="absolute bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/85 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base">{product?.title || experience.name}</p>
            <p className="text-white/50 text-xs mt-0.5">{company.name}</p>
          </div>
          {experience.ctaText && experience.ctaLink && (
            <a
              href={experience.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-semibold text-sm"
              style={{ backgroundColor: company.brandPrimary }}
            >
              {experience.ctaText}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {!branding.hideBranding && (
          <p className="text-[10px] text-white/20 text-center mt-3">Powered by AR-core-7</p>
        )}
      </div>
    </div>
  );
}
