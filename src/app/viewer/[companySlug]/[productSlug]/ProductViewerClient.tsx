'use client';

import { useEffect } from 'react';
import { Box, Smartphone, RotateCw } from 'lucide-react';

interface Props {
  product: {
    id: string;
    title: string;
    description: string | null;
    modelUrl: string | null;
    usdzUrl: string | null;
    posterUrl: string | null;
    scalePreset: number;
  };
  company: {
    id: string;
    name: string;
    brandPrimary: string;
  };
}

export function ProductViewerClient({ product, company }: Props) {
  useEffect(() => {
    // Track page view
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: company.id,
        productId: product.id,
        eventType: 'page_view',
        sessionId: Math.random().toString(36).slice(2),
      }),
    }).catch(() => {});

    // Load model-viewer
    import('@google/model-viewer').catch(() => {});
  }, [company.id, product.id]);

  if (!product.modelUrl) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Box className="w-16 h-16 text-surface-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-surface-800 mb-2">{product.title}</h1>
          <p className="text-surface-500">3D model not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-surface-100 flex-shrink-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: company.brandPrimary + '20' }}>
            <Box className="w-4 h-4" style={{ color: company.brandPrimary }} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-surface-900 leading-tight">{product.title}</h1>
            <p className="text-[10px] text-surface-400">{company.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: company.brandPrimary }}
            onClick={() => {
              fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId: company.id, productId: product.id, eventType: 'ar_launch' }),
              }).catch(() => {});
            }}
          >
            <Smartphone className="w-3.5 h-3.5" />
            View in AR
          </button>
        </div>
      </header>

      {/* 3D Viewer */}
      <div className="flex-1 relative" style={{ minHeight: '60vh' }}>
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
                shadow-intensity="1"
                exposure="1"
                shadow-softness="0.5"
                camera-orbit="30deg 75deg 105%"
                min-camera-orbit="auto auto 50%"
                max-camera-orbit="auto auto 200%"
                style="width:100%;height:100%;min-height:60vh;background:linear-gradient(180deg,#f8f9fa 0%,#ffffff 100%);"
                loading="eager"
                reveal="auto"
              >
                <button slot="ar-button" style="
                  position:absolute;bottom:16px;right:16px;
                  background:${company.brandPrimary};color:white;
                  border:none;border-radius:12px;padding:10px 20px;
                  font-size:14px;font-weight:600;cursor:pointer;
                  display:flex;align-items:center;gap:8px;
                  box-shadow:0 4px 14px rgba(0,0,0,0.15);
                ">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                  View in AR
                </button>
              </model-viewer>
            `,
          }}
        />
      </div>

      {/* Product Info */}
      <div className="p-4 border-t border-surface-100 bg-white">
        <h2 className="text-lg font-bold text-surface-900 mb-1">{product.title}</h2>
        {product.description && (
          <p className="text-sm text-surface-500 leading-relaxed">{product.description}</p>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-surface-400">
          <span className="flex items-center gap-1"><RotateCw className="w-3 h-3" /> Drag to rotate</span>
          <span>Pinch to zoom</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-4 py-3 border-t border-surface-100 text-center">
        <p className="text-[10px] text-surface-300">Powered by AR-core-7</p>
      </footer>
    </div>
  );
}
