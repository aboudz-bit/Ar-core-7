'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

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
    scalePreset: number;
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

const BG_STYLES: Record<string, string> = {
  gradient: 'linear-gradient(180deg,#f8f9fa 0%,#ffffff 100%)',
  white: '#ffffff',
  dark: '#1a1a2e',
  transparent: 'transparent',
};

export function EmbedViewer({ experience, product, company, branding, embed = false, autoLaunchAR = false }: Props) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Track page view
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

    // Dynamically load model-viewer
    import('@google/model-viewer').then(() => {
      setLoaded(true);

      // Auto-launch AR if requested
      if (autoLaunchAR && product?.modelUrl) {
        setTimeout(() => {
          const mv = document.querySelector('model-viewer') as HTMLElement & { activateAR?: () => void };
          if (mv?.activateAR) {
            try { mv.activateAR(); } catch { /* requires gesture on some platforms */ }
          }
        }, 1000);
      }
    }).catch(() => {});
  }, [company.id, product?.id, experience.id, embed, autoLaunchAR, product?.modelUrl]);

  const bgStyle = BG_STYLES[branding.viewerBackground] || BG_STYLES[experience.backgroundMode] || BG_STYLES.gradient;
  const isDarkBg = branding.viewerBackground === 'dark' || experience.backgroundMode === 'dark';

  if (!product?.modelUrl) {
    return (
      <div className="w-full h-full min-h-[300px] flex items-center justify-center" style={{ background: bgStyle }}>
        <div className="text-center p-4">
          <AlertTriangle className={`w-10 h-10 mx-auto mb-2 ${isDarkBg ? 'text-white/40' : 'text-surface-300'}`} />
          <p className={`text-sm ${isDarkBg ? 'text-white/60' : 'text-surface-500'}`}>3D model not available</p>
        </div>
      </div>
    );
  }

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
              {product.title}
            </span>
          </div>
        </header>
      )}

      {/* 3D Viewer */}
      <div className={`flex-1 relative ${embed ? '' : ''}`} style={{ minHeight: embed ? '100%' : '70vh' }}>
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
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{
            __html: `
              <model-viewer
                src="${product.modelUrl}"
                ${product.usdzUrl ? `ios-src="${product.usdzUrl}"` : ''}
                ${product.posterUrl ? `poster="${product.posterUrl}"` : ''}
                alt="${product.title}"
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
