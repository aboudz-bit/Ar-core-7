'use client';

import { useEffect } from 'react';
import { Box, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ModelViewerDemoPage() {
  useEffect(() => {
    import('@google/model-viewer').catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="h-14 flex items-center gap-4 px-4 border-b border-surface-100">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-surface-50">
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </Link>
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-semibold text-surface-900">model-viewer Demo</span>
        </div>
      </header>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-900 mb-2">Model Viewer Integration</h1>
          <p className="text-surface-500">Google model-viewer web component with AR support, camera controls, and auto-rotate.</p>
        </div>

        <div className="card overflow-hidden" style={{ height: '500px' }}>
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{
              __html: `
                <model-viewer
                  src="https://modelviewer.dev/shared-assets/models/Astronaut.glb"
                  poster="https://modelviewer.dev/shared-assets/models/Astronaut.webp"
                  alt="A 3D astronaut model"
                  camera-controls
                  auto-rotate
                  ar
                  ar-modes="webxr scene-viewer quick-look"
                  shadow-intensity="1"
                  exposure="1"
                  camera-orbit="30deg 75deg 105%"
                  style="width:100%;height:100%;background:linear-gradient(180deg,#f0f4ff 0%,#ffffff 100%);"
                  loading="eager"
                >
                  <button slot="ar-button" style="
                    position:absolute;bottom:16px;right:16px;
                    background:#4263eb;color:white;
                    border:none;border-radius:12px;padding:10px 20px;
                    font-size:14px;font-weight:600;cursor:pointer;
                    box-shadow:0 4px 14px rgba(0,0,0,0.15);
                  ">View in AR</button>
                </model-viewer>
              `,
            }}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">Camera Controls</h3>
            <p className="text-xs text-surface-500">Drag to orbit, scroll to zoom, two-finger to pan</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">AR Modes</h3>
            <p className="text-xs text-surface-500">WebXR, Scene Viewer (Android), Quick Look (iOS)</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">Auto Rotate</h3>
            <p className="text-xs text-surface-500">Model rotates automatically when idle</p>
          </div>
        </div>
      </div>
    </div>
  );
}
