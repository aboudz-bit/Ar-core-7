'use client';

import { ArrowLeft, Box, Info } from 'lucide-react';
import Link from 'next/link';

export default function ArJsMarkerDemoPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="h-14 flex items-center gap-4 px-4 border-b border-surface-100">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-surface-50">
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </Link>
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-brand-600" />
          <span className="text-sm font-semibold text-surface-900">AR.js Marker Demo</span>
        </div>
      </header>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-900 mb-2">AR.js Marker-Based AR</h1>
          <p className="text-surface-500 text-sm">
            AR.js provides lightweight marker-based augmented reality that works directly in the browser.
            This is an optional sandbox module for prototype experiments.
          </p>
        </div>

        <div className="card p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Info className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-surface-900 text-sm mb-1">How It Works</h3>
              <p className="text-xs text-surface-500 leading-relaxed">
                AR.js uses camera-based marker detection (like Hiro markers or custom patterns) to anchor
                3D content in the real world. It runs entirely in the browser using WebGL and WebRTC.
              </p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden border border-surface-200 bg-surface-50">
            <div
              className="w-full"
              style={{ height: '500px' }}
              dangerouslySetInnerHTML={{
                __html: `
                  <iframe
                    src="data:text/html;charset=utf-8,${encodeURIComponent(`
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width,initial-scale=1">
                        <title>AR.js Marker Demo</title>
                        <script src="https://aframe.io/releases/1.4.0/aframe.min.js"></script>
                        <script src="https://raw.githack.com/AR-js-org/AR.js/master/aframe/build/aframe-ar.js"></script>
                        <style>body{margin:0;overflow:hidden;font-family:sans-serif}.info-overlay{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);color:white;padding:8px 16px;border-radius:20px;font-size:13px;z-index:100;white-space:nowrap;}</style>
                      </head>
                      <body>
                        <div class="info-overlay">Show a Hiro marker to your camera</div>
                        <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;" renderer="logarithmicDepthBuffer: true;" vr-mode-ui="enabled: false">
                          <a-marker preset="hiro">
                            <a-box position="0 0.5 0" material="color: #4263eb; opacity: 0.9" scale="0.8 0.8 0.8" animation="property: rotation; to: 0 360 0; loop: true; dur: 3000; easing: linear"></a-box>
                            <a-text value="AR-core-7" position="0 1.2 0" align="center" color="#1e3a8a" scale="0.5 0.5 0.5"></a-text>
                          </a-marker>
                          <a-entity camera></a-entity>
                        </a-scene>
                      </body>
                      </html>
                    `)}"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    allow="camera; xr-spatial-tracking"
                    style="border:0;"
                  ></iframe>
                `,
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">Marker-Based</h3>
            <p className="text-xs text-surface-500">Uses Hiro or custom fiducial markers for stable tracking</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">Lightweight</h3>
            <p className="text-xs text-surface-500">No heavy dependencies - runs on A-Frame and AR.js</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">Cross-Browser</h3>
            <p className="text-xs text-surface-500">Works on Chrome, Firefox, Safari, and Edge</p>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-surface-900 text-sm mb-1">Sandbox Module</h3>
            <p className="text-xs text-surface-500">Optional experimental layer - not the main AR path</p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-xs text-amber-700">
            <strong>Note:</strong> AR.js is used here as an optional lightweight sandbox. The primary AR tracking
            engine for production use is MindAR (image tracking) and model-viewer (surface AR / Quick Look).
          </p>
        </div>
      </div>
    </div>
  );
}
