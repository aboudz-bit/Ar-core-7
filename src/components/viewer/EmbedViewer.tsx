'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertTriangle, X, Camera, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react';

interface Props {
  experience: {
    id: string;
    name: string;
    slug: string;
    type: string;
    scale: number;
    lightingPreset: string;
    backgroundMode: string;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    description: string | null;
    modelUrl: string | null;
    usdzUrl: string | null;
    posterUrl: string | null;
    targetImageUrl: string | null;
    fallbackImageUrl: string | null;
    scalePreset: number;
    generationStatus: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    slug: string;
    brandPrimary: string;
    brandSecondary: string;
    logoUrl: string | null;
  };
  branding: {
    hideBranding: boolean;
    viewerBackground: string;
    logoUrl: string | null;
  };
  /** Embed mode: no header, no footer, iframe-ready */
  embed?: boolean;
  /** Launch mode: attempt to go straight to AR */
  autoLaunchAR?: boolean;
}

type ArSupport = 'checking' | 'webxr' | 'scene-viewer' | 'quick-look' | 'none';
type CameraState = 'idle' | 'requesting' | 'active' | 'denied' | 'error';

const BG_STYLES: Record<string, string> = {
  gradient: 'linear-gradient(180deg,#f8f9fa 0%,#ffffff 100%)',
  white: '#ffffff',
  dark: '#1a1a2e',
  transparent: 'transparent',
};

export function EmbedViewer({ experience, product, company, branding, embed = false, autoLaunchAR = false }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [arSupport, setArSupport] = useState<ArSupport>('checking');
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [imageArActive, setImageArActive] = useState(false);
  const [placementHintVisible, setPlacementHintVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const hasModel = !!(product?.modelUrl || product?.usdzUrl);
  const hasImageOnly = !hasModel && !!(product?.fallbackImageUrl || product?.posterUrl);
  const imageUrl = product?.fallbackImageUrl || product?.posterUrl || null;

  // Detect AR support
  useEffect(() => {
    async function detectAr() {
      // Check WebXR
      if ('xr' in navigator) {
        try {
          const xr = (navigator as unknown as { xr: { isSessionSupported: (m: string) => Promise<boolean> } }).xr;
          const supported = await xr.isSessionSupported('immersive-ar');
          if (supported) {
            setArSupport('webxr');
            return;
          }
        } catch {
          // WebXR check failed
        }
      }

      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);

      if (isIOS && product?.usdzUrl) {
        setArSupport('quick-look');
      } else if (isAndroid) {
        setArSupport('scene-viewer');
      } else {
        setArSupport('none');
      }
    }

    detectAr();
  }, [product?.usdzUrl]);

  // Track page view + load model-viewer
  useEffect(() => {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        productId: product?.id,
        experienceId: experience.id,
        eventType: embed ? 'embed_view' : autoLaunchAR ? 'ar_launch' : 'page_view',
        sessionId: Math.random().toString(36).slice(2),
      }),
    }).catch(() => {});

    if (hasModel) {
      import('@google/model-viewer').then(() => {
        setLoaded(true);

        if (autoLaunchAR && product?.modelUrl) {
          setTimeout(() => {
            const mv = document.querySelector('model-viewer') as HTMLElement & { activateAR?: () => void };
            if (mv?.activateAR) {
              try { mv.activateAR(); } catch { /* requires gesture on some platforms */ }
            }
          }, 1000);
        }
      }).catch(() => {});
    }
  }, [company.id, product?.id, experience.id, embed, autoLaunchAR, product?.modelUrl, hasModel]);

  // Show placement hint when model-viewer enters AR
  useEffect(() => {
    if (!loaded || !hasModel) return;

    const mv = document.querySelector('model-viewer');
    if (!mv) return;

    const handleArStatus = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.status === 'session-started') {
        setPlacementHintVisible(true);
        setTimeout(() => setPlacementHintVisible(false), 4000);

        fetch('/api/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyId: company.id,
            productId: product?.id,
            experienceId: experience.id,
            eventType: 'ar_session_start',
            sessionId: Math.random().toString(36).slice(2),
          }),
        }).catch(() => {});
      }
    };

    mv.addEventListener('ar-status', handleArStatus);
    return () => mv.removeEventListener('ar-status', handleArStatus);
  }, [loaded, hasModel, company.id, product?.id, experience.id]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Request camera for image-only AR overlay
  const requestCamera = useCallback(async () => {
    setCameraState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('active');
      setImageArActive(true);

      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          productId: product?.id,
          experienceId: experience.id,
          eventType: 'image_ar_start',
          sessionId: Math.random().toString(36).slice(2),
        }),
      }).catch(() => {});
    } catch (err: unknown) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setCameraState('denied');
      } else {
        setCameraState('error');
      }
    }
  }, [company.id, product?.id, experience.id]);

  // Close image AR overlay
  const closeImageAr = useCallback(() => {
    setImageArActive(false);
    setCameraState('idle');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const bgStyle = BG_STYLES[branding.viewerBackground] || BG_STYLES[experience.backgroundMode] || BG_STYLES.gradient;
  const isDarkBg = branding.viewerBackground === 'dark' || experience.backgroundMode === 'dark';

  // ── Image-only AR overlay (camera + 2D image) ──
  if (imageArActive && imageUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* Camera feed */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* 2D image overlay — centered, draggable via CSS */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src={imageUrl}
            alt={product?.title || 'AR Preview'}
            className="max-w-[60%] max-h-[50%] object-contain pointer-events-auto"
            style={{
              filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.4))',
              touchAction: 'none',
            }}
            draggable={false}
          />
        </div>

        {/* Placement hint */}
        <div className="absolute top-16 left-0 right-0 text-center">
          <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
            <Move className="w-4 h-4" />
            Point your camera at a surface
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={closeImageAr}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white z-10"
          aria-label="Close AR"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand watermark */}
        {!branding.hideBranding && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-[10px] text-white/30">Powered by AR-core-7</span>
          </div>
        )}
      </div>
    );
  }

  // ── No model AND no image — nothing to show ──
  if (!hasModel && !hasImageOnly) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center" style={{ background: bgStyle }}>
        <div className="text-center p-4">
          <AlertTriangle className={`w-10 h-10 mx-auto mb-2 ${isDarkBg ? 'text-white/40' : 'text-surface-300'}`} />
          <p className={`text-sm ${isDarkBg ? 'text-white/60' : 'text-surface-500'}`}>3D model not available</p>
        </div>
      </div>
    );
  }

  // ── Image-only fallback (no GLB, show image + "View in AR" camera button) ──
  if (hasImageOnly && !hasModel) {
    return (
      <div className={`flex flex-col ${embed ? 'w-full h-full' : 'min-h-screen'}`} style={{ background: embed ? 'transparent' : bgStyle }}>
        {!embed && !branding.hideBranding && (
          <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-10"
            style={{
              borderBottom: `1px solid ${isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
              background: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(8px)',
            }}>
            <div className="flex items-center gap-2.5">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={company.name} className="h-6 w-auto" />
              ) : (
                <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: company.brandPrimary }}>
                  {company.name.charAt(0)}
                </div>
              )}
              <span className={`text-sm font-semibold ${isDarkBg ? 'text-white' : 'text-surface-900'}`}>
                {product?.title || experience.name}
              </span>
            </div>
          </header>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-6" style={{ minHeight: embed ? '100%' : '60vh' }}>
          <div className="max-w-sm w-full">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-surface-100">
              <img
                src={imageUrl!}
                alt={product?.title || experience.name}
                className="w-full aspect-square object-cover"
              />
            </div>

            {/* Camera permission denied message */}
            {cameraState === 'denied' && (
              <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                <p className="text-sm text-red-700 font-medium">Camera access denied</p>
                <p className="text-xs text-red-500 mt-1">
                  Please allow camera access in your browser settings to use AR.
                </p>
              </div>
            )}

            {cameraState === 'error' && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-sm text-amber-700 font-medium">Camera not available</p>
                <p className="text-xs text-amber-500 mt-1">
                  Could not access camera. Make sure no other app is using it.
                </p>
              </div>
            )}

            {/* AR button — opens camera with image overlay */}
            <button
              onClick={requestCamera}
              disabled={cameraState === 'requesting'}
              className="mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: company.brandPrimary }}
            >
              {cameraState === 'requesting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Requesting camera...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  View in AR
                </>
              )}
            </button>

            <p className={`text-xs text-center mt-3 ${isDarkBg ? 'text-white/40' : 'text-surface-400'}`}>
              Image preview — opens camera for AR overlay
            </p>
          </div>
        </div>

        {!embed && !branding.hideBranding && (
          <footer className="px-4 py-2 text-center flex-shrink-0">
            <p className={`text-[10px] ${isDarkBg ? 'text-white/20' : 'text-surface-300'}`}>
              Powered by AR-core-7
            </p>
          </footer>
        )}

        {/* Hidden video for camera stream */}
        <video ref={videoRef} className="hidden" playsInline muted />
      </div>
    );
  }

  // ── Model viewer (GLB/USDZ) with AR support ──
  return (
    <div className={`flex flex-col ${embed ? 'w-full h-full' : 'min-h-screen'}`} style={{ background: embed ? 'transparent' : undefined }}>
      {/* Header — hidden in embed mode, or when hide-branding is on */}
      {!embed && !branding.hideBranding && (
        <header className="h-12 flex items-center justify-between px-4 flex-shrink-0 z-10"
          style={{
            borderBottom: `1px solid ${isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}`,
            background: isDarkBg ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(8px)',
          }}>
          <div className="flex items-center gap-2.5">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt={company.name} className="h-6 w-auto" />
            ) : (
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: company.brandPrimary }}>
                {company.name.charAt(0)}
              </div>
            )}
            <span className={`text-sm font-semibold ${isDarkBg ? 'text-white' : 'text-surface-900'}`}>
              {product!.title}
            </span>
          </div>
          {arSupport !== 'checking' && arSupport !== 'none' && (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-600 font-medium">
              AR Ready
            </span>
          )}
        </header>
      )}

      {/* 3D Viewer */}
      <div className="flex-1 relative" style={{ minHeight: embed ? '100%' : '70vh' }}>
        {/* Loading skeleton */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: bgStyle }}>
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                style={{ borderColor: company.brandPrimary, borderTopColor: 'transparent' }} />
              <p className={`text-xs ${isDarkBg ? 'text-white/40' : 'text-surface-400'}`}>Loading 3D model...</p>
            </div>
          </div>
        )}

        {/* WebXR placement hint overlay */}
        {placementHintVisible && (
          <div className="absolute top-20 left-0 right-0 text-center z-30 pointer-events-none">
            <div className="inline-flex items-center gap-2 bg-black/70 backdrop-blur-sm text-white text-sm px-5 py-2.5 rounded-full shadow-lg animate-pulse">
              <Move className="w-4 h-4" />
              Point your camera at a surface to place the object
            </div>
          </div>
        )}

        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{
            __html: `
              <model-viewer
                src="${product!.modelUrl}"
                ${product!.usdzUrl ? `ios-src="${product!.usdzUrl}"` : ''}
                ${product!.posterUrl ? `poster="${product!.posterUrl}"` : ''}
                alt="${product!.title}"
                camera-controls
                auto-rotate
                ar
                ar-modes="webxr scene-viewer quick-look"
                ar-scale="fixed"
                shadow-intensity="1"
                exposure="1"
                touch-action="pan-y"
                camera-orbit="30deg 75deg 105%"
                min-camera-orbit="auto auto 50%"
                max-camera-orbit="auto auto 200%"
                style="width:100%;height:100%;min-height:${embed ? '300px' : '70vh'};background:${bgStyle};"
                loading="eager"
                reveal="auto"
              >
                <button slot="ar-button" style="
                  position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
                  background:${company.brandPrimary};color:white;
                  border:none;border-radius:14px;padding:12px 28px;
                  font-size:15px;font-weight:600;cursor:pointer;
                  display:flex;align-items:center;gap:10px;
                  box-shadow:0 4px 20px rgba(0,0,0,0.2);
                  white-space:nowrap;font-family:system-ui,-apple-system,sans-serif;
                ">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  View in Your Space
                </button>
              </model-viewer>
            `,
          }}
        />

        {/* AR not supported message — shown below model in 3D-only fallback */}
        {arSupport === 'none' && loaded && (
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className={`text-center p-3 rounded-xl ${isDarkBg ? 'bg-white/10 text-white/70' : 'bg-surface-50 text-surface-500'}`}>
              <p className="text-xs">
                AR is not supported on this device. You can still explore the 3D model above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* CTA — shown in non-embed mode when configured */}
      {!embed && experience.ctaText && experience.ctaLink && (
        <div className="p-3 flex-shrink-0"
          style={{ borderTop: `1px solid ${isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'}` }}>
          <a
            href={experience.ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: company.brandPrimary }}
          >
            {experience.ctaText}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>
        </div>
      )}

      {/* Footer — hidden in embed mode or when hide-branding is on */}
      {!embed && !branding.hideBranding && (
        <footer className="px-4 py-2 text-center flex-shrink-0">
          <p className={`text-[10px] ${isDarkBg ? 'text-white/20' : 'text-surface-300'}`}>
            Powered by AR-core-7
          </p>
        </footer>
      )}
    </div>
  );
}
