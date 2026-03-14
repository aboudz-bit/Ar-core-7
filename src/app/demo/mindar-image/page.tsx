'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, ArrowLeft, AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function MindARImageDemoPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'tracking' | 'error' | 'permission-denied'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const mindArRef = useRef<{ stop: () => void } | null>(null);
  const rafRef = useRef<number>(0);

  // Cleanup on unmount — stop MindAR session and animation loop
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      if (mindArRef.current) {
        try { mindArRef.current.stop(); } catch { /* already stopped */ }
        mindArRef.current = null;
      }
    };
  }, []);

  const startAR = useCallback(async () => {
    setStatus('loading');
    try {
      // Load MindAR via CDN script to avoid webpack bundling issues with Three.js version conflicts
      const existingMindar = document.getElementById('mindar-script') as HTMLScriptElement | null;
      if (existingMindar) {
        // Script element exists — wait for it to finish loading if not ready yet
        if (existingMindar.dataset.loaded !== 'true') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('MindAR script load timeout (15s)')), 15000);
            existingMindar.addEventListener('load', () => { clearTimeout(timeout); resolve(); });
            existingMindar.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Failed to load MindAR')); });
          });
        }
      } else {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('MindAR script load timeout (15s)')), 15000);
          const script = document.createElement('script');
          script.id = 'mindar-script';
          script.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-three.prod.js';
          script.onload = () => { script.dataset.loaded = 'true'; clearTimeout(timeout); resolve(); };
          script.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load MindAR library. Check your network connection.')); };
          document.head.appendChild(script);
        });
      }

      // Load Three.js via CDN as well (compatible version)
      const existingThree = document.getElementById('three-script') as HTMLScriptElement | null;
      if (existingThree) {
        if (existingThree.dataset.loaded !== 'true') {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Three.js script load timeout (15s)')), 15000);
            existingThree.addEventListener('load', () => { clearTimeout(timeout); resolve(); });
            existingThree.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Failed to load Three.js')); });
          });
        }
      } else {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Three.js script load timeout (15s)')), 15000);
          const script = document.createElement('script');
          script.id = 'three-script';
          script.src = 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.min.js';
          script.onload = () => { script.dataset.loaded = 'true'; clearTimeout(timeout); resolve(); };
          script.onerror = () => { clearTimeout(timeout); reject(new Error('Failed to load Three.js. Check your network connection.')); };
          document.head.appendChild(script);
        });
      }

      if (!containerRef.current) return;

      // Safeguard: verify libraries are available on window before accessing
      const win = window as unknown as {
        MINDAR?: { IMAGE?: { MindARThree: new (config: { container: HTMLElement; imageTargetSrc: string }) => {
          renderer: { render: (scene: unknown, camera: unknown) => void };
          scene: { add: (obj: unknown) => void };
          camera: unknown;
          addAnchor: (idx: number) => { group: { add: (obj: unknown) => void }; onTargetFound: () => void; onTargetLost: () => void };
          start: () => Promise<void>;
          stop: () => void;
        } } };
        THREE?: typeof import('three');
      };

      if (!win.MINDAR || !win.MINDAR.IMAGE) {
        throw new Error('MindAR library failed to initialize. The AR tracking engine could not be loaded. Please reload the page and try again.');
      }

      if (!win.THREE) {
        throw new Error('Three.js library failed to initialize. Please reload the page and try again.');
      }

      const { MindARThree } = win.MINDAR.IMAGE;
      const THREE = win.THREE;

      const mindarThree = new MindARThree({
        container: containerRef.current,
        imageTargetSrc: 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.5/examples/image-tracking/assets/card-example/card.mind',
      });

      const { renderer, scene, camera } = mindarThree;

      // Create 3D content
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({
        color: 0x4263eb,
        metalness: 0.3,
        roughness: 0.7,
      });
      const cube = new THREE.Mesh(geometry, material);
      cube.scale.set(0.5, 0.5, 0.5);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(0, 1, 1);
      scene.add(directionalLight);

      // Anchor
      const anchor = mindarThree.addAnchor(0);
      anchor.group.add(cube);

      anchor.onTargetFound = () => setStatus('tracking');
      anchor.onTargetLost = () => setStatus('ready');

      await mindarThree.start();
      setStatus('ready');
      mindArRef.current = mindarThree;

      // Animation loop (tracked for cleanup)
      const animate = () => {
        cube.rotation.y += 0.01;
        cube.rotation.x += 0.005;
        renderer.render(scene, camera);
        rafRef.current = requestAnimationFrame(animate);
      };
      animate();
    } catch (err: unknown) {
      console.error('MindAR error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setStatus('permission-denied');
        setErrorMsg('Camera permission was denied. Please allow camera access in your browser settings and try again.');
      } else if (msg.includes('timeout')) {
        setStatus('error');
        setErrorMsg('AR library took too long to load. Please check your network connection and try again.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
        setStatus('error');
        setErrorMsg('No camera found on this device. A camera is required for AR experiences.');
      } else {
        setStatus('error');
        setErrorMsg(msg || 'Failed to initialize AR. Please try again.');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface-900">
      {/* Status bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="p-1 rounded-lg hover:bg-white/10">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <span className="text-sm font-semibold text-white">MindAR Image Tracking</span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'loading' && (
            <span className="flex items-center gap-1.5 text-xs text-white/60">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading...
            </span>
          )}
          {status === 'ready' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Camera className="w-3.5 h-3.5" /> Camera Active
            </span>
          )}
          {status === 'tracking' && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Check className="w-3.5 h-3.5" /> Tracking
            </span>
          )}
          {(status === 'error' || status === 'permission-denied') && (
            <span className="flex items-center gap-1.5 text-xs text-red-400">
              <X className="w-3.5 h-3.5" /> Error
            </span>
          )}
        </div>
      </div>

      {/* AR Container */}
      <div ref={containerRef} className="fixed inset-0" style={{ zIndex: 1 }} />

      {/* Initial / Loading state */}
      {(status === 'idle' || status === 'loading') && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-surface-900 p-6">
          <Camera className="w-20 h-20 text-white/30 mb-6" />
          <h1 className="text-xl font-bold text-white mb-2">Image Tracking AR</h1>
          <p className="text-sm text-white/60 text-center mb-2 max-w-sm">
            This demo uses MindAR to track an image target and overlay 3D content.
          </p>
          <p className="text-xs text-white/40 text-center mb-8 max-w-sm">
            Point your camera at the &quot;card&quot; example target from MindAR docs.
          </p>
          <button
            onClick={startAR}
            disabled={status === 'loading'}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
          >
            {status === 'loading' ? (
              <><RefreshCw className="w-5 h-5 animate-spin" /> Loading AR engine...</>
            ) : (
              <><Camera className="w-5 h-5" /> Start Camera</>
            )}
          </button>
        </div>
      )}

      {/* Error state */}
      {(status === 'error' || status === 'permission-denied') && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-surface-900 p-6">
          <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">
            {status === 'permission-denied' ? 'Camera Access Denied' : 'AR Error'}
          </h2>
          <p className="text-sm text-white/60 text-center max-w-sm mb-6">{errorMsg}</p>
          <button
            onClick={startAR}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 text-white font-semibold"
          >
            <RefreshCw className="w-4 h-4" /> Try Again
          </button>
        </div>
      )}

      {/* Tracking overlay */}
      {status === 'tracking' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-500/90 backdrop-blur text-white text-sm font-medium flex items-center gap-2">
          <Check className="w-4 h-4" /> Target detected - tracking active
        </div>
      )}

      {status === 'ready' && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white/20 backdrop-blur text-white text-sm">
          Point camera at target image
        </div>
      )}
    </div>
  );
}
