'use client';

import { useEffect, useState } from 'react';
import { Box, Smartphone, Camera, AlertTriangle, ExternalLink } from 'lucide-react';

interface Props {
  experience: {
    id: string;
    name: string;
    slug: string;
    type: string;
    scale: number;
    lightingPreset: string;
    ctaText: string | null;
    ctaLink: string | null;
  };
  product: {
    id: string;
    title: string;
    modelUrl: string | null;
    usdzUrl: string | null;
    posterUrl: string | null;
    targetImageUrl: string | null;
  } | null;
  company: {
    id: string;
    name: string;
    brandPrimary: string;
  };
  branding?: {
    hideBranding: boolean;
    viewerBackground: string;
    logoUrl: string | null;
  };
}

export function ArExperienceClient({ experience, product, company, branding }: Props) {
  const [arSupported, setArSupported] = useState<boolean | null>(null);

  useEffect(() => {
    // Track page view
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        productId: product?.id,
        experienceId: experience.id,
        eventType: 'page_view',
        sessionId: Math.random().toString(36).slice(2),
      }),
    }).catch(() => {});

    // Load model-viewer
    import('@google/model-viewer').catch(() => {});

    // Check AR support
    if ('xr' in navigator) {
      (navigator as { xr: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr
        .isSessionSupported('immersive-ar')
        .then(setArSupported)
        .catch(() => setArSupported(false));
    } else {
      // iOS Safari uses Quick Look - model-viewer handles this
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setArSupported(isIOS);
    }
  }, [company.id, product?.id, experience.id]);

  // 3D Viewer / Surface AR experience
  if (experience.type === 'PRODUCT_VIEWER' || experience.type === 'SURFACE_AR') {
    if (!product?.modelUrl) {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-surface-800 mb-1">Model Not Available</h2>
            <p className="text-sm text-surface-500">The 3D model for this experience hasn&apos;t been uploaded yet.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="h-14 flex items-center justify-between px-4 border-b border-surface-100 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: company.brandPrimary + '20' }}>
              <Box className="w-3.5 h-3.5" style={{ color: company.brandPrimary }} />
            </div>
            <span className="text-sm font-semibold text-surface-900">{experience.name}</span>
          </div>
          {arSupported === false && (
            <span className="text-xs text-surface-400">3D View Mode</span>
          )}
        </header>

        <div className="flex-1" style={{ minHeight: '70vh' }}>
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{
              __html: `
                <model-viewer
                  src="${product.modelUrl}"
                  ${product.usdzUrl ? `ios-src="${product.usdzUrl}"` : ''}
                  ${product.posterUrl ? `poster="${product.posterUrl}"` : ''}
                  alt="${experience.name}"
                  camera-controls
                  auto-rotate
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  ar-scale="fixed"
                  shadow-intensity="1"
                  exposure="1"
                  style="width:100%;height:100%;min-height:70vh;background:linear-gradient(180deg,#f8f9fa 0%,#fff 100%);"
                  loading="eager"
                >
                  <button slot="ar-button" style="
                    position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
                    background:${company.brandPrimary};color:white;
                    border:none;border-radius:14px;padding:12px 28px;
                    font-size:15px;font-weight:600;cursor:pointer;
                    display:flex;align-items:center;gap:10px;
                    box-shadow:0 4px 20px rgba(0,0,0,0.2);
                    white-space:nowrap;
                  ">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                    View in Your Space
                  </button>
                </model-viewer>
              `,
            }}
          />
        </div>

        {/* CTA */}
        {experience.ctaText && experience.ctaLink && (
          <div className="p-4 border-t border-surface-100">
            <a
              href={experience.ctaLink}
              target="_blank"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors"
              style={{ backgroundColor: company.brandPrimary }}
            >
              {experience.ctaText}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        )}

        {!branding?.hideBranding && (
          <footer className="px-4 py-2 text-center">
            <p className="text-[10px] text-surface-300">Powered by AR-core-7</p>
          </footer>
        )}
      </div>
    );
  }

  // Image Target experience
  if (experience.type === 'IMAGE_TARGET') {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-4 text-center">
        <Camera className="w-16 h-16 text-white/50 mb-6" />
        <h1 className="text-xl font-bold text-white mb-2">{experience.name}</h1>
        <p className="text-sm text-white/60 mb-6 max-w-sm">
          Point your camera at the target image to see the AR content
        </p>
        <a
          href={`/demo/mindar-image?experienceId=${experience.id}`}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold"
          style={{ backgroundColor: company.brandPrimary }}
        >
          <Camera className="w-5 h-5" />
          Start Camera
        </a>
        {product?.targetImageUrl && (
          <div className="mt-8">
            <p className="text-xs text-white/40 mb-2">Target Image:</p>
            <img src={product.targetImageUrl} alt="Target" className="w-32 h-32 object-cover rounded-lg border-2 border-white/20" />
          </div>
        )}
        {!branding?.hideBranding && (
          <footer className="absolute bottom-4">
            <p className="text-[10px] text-white/20">Powered by AR-core-7</p>
          </footer>
        )}
      </div>
    );
  }

  // QR Launch
  if (experience.type === 'QR_LAUNCH') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: company.brandPrimary + '10' }}>
          <Smartphone className="w-10 h-10" style={{ color: company.brandPrimary }} />
        </div>
        <h1 className="text-2xl font-bold text-surface-900 mb-2">{experience.name}</h1>
        <p className="text-surface-500 mb-6">{company.name}</p>
        {product?.modelUrl ? (
          <div
            className="w-full max-w-md"
            style={{ height: '400px' }}
            dangerouslySetInnerHTML={{
              __html: `
                <model-viewer
                  src="${product.modelUrl}"
                  ${product.usdzUrl ? `ios-src="${product.usdzUrl}"` : ''}
                  alt="${experience.name}"
                  camera-controls auto-rotate ar
                  ar-modes="webxr scene-viewer quick-look"
                  shadow-intensity="1"
                  style="width:100%;height:100%;border-radius:16px;overflow:hidden;"
                >
                  <button slot="ar-button" style="
                    position:absolute;bottom:16px;left:50%;transform:translateX(-50%);
                    background:${company.brandPrimary};color:white;
                    border:none;border-radius:12px;padding:10px 24px;
                    font-size:14px;font-weight:600;cursor:pointer;
                  ">View in AR</button>
                </model-viewer>
              `,
            }}
          />
        ) : (
          <p className="text-surface-400">No 3D model available</p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <p className="text-surface-500">Unknown experience type</p>
    </div>
  );
}
