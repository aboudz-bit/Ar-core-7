'use client';

import { useState } from 'react';

type Badge = 'camera' | 'upload' | 'viewer' | 'demo';

interface DemoCard {
  title: string;
  description: string;
  route: string;
  badge: Badge;
}

const sections: { heading: string; cards: DemoCard[] }[] = [
  {
    heading: 'Face Try-On',
    cards: [
      {
        title: 'Optica Aviator',
        description: 'Face tracking with aviator glasses overlay. Requires camera.',
        route: '/tryon/optica-aviator-tryon',
        badge: 'camera',
      },
      {
        title: 'Optica Cat-Eye',
        description: 'Face tracking with cat-eye glasses overlay. Requires camera.',
        route: '/tryon/optica-cateye-tryon',
        badge: 'camera',
      },
    ],
  },
  {
    heading: 'Body Tracking',
    cards: [
      {
        title: 'Noor Body Tracking',
        description: 'Full-body pose detection with skeleton overlay and measurements.',
        route: '/body/noor-body-tracking-demo',
        badge: 'camera',
      },
    ],
  },
  {
    heading: 'Virtual Fit (Photo Upload)',
    cards: [
      {
        title: 'Noor Virtual Fit',
        description: 'Upload a photo + garment for virtual try-on with size recommendation.',
        route: '/virtual-fit/noor-virtual-fit-demo',
        badge: 'upload',
      },
    ],
  },
  {
    heading: 'Merchant Preview',
    cards: [
      {
        title: 'Merchant Product Preview',
        description: 'Preview a merchant product with pre-filled garment specs.',
        route: '/virtual-fit/preview/1',
        badge: 'upload',
      },
    ],
  },
  {
    heading: '3D / AR Viewer',
    cards: [
      {
        title: 'LX Sneaker 3D',
        description: '3D product viewer with rotate/zoom controls.',
        route: '/ar/lx-sneaker-3d',
        badge: 'viewer',
      },
      {
        title: 'LX Sneaker AR',
        description: 'Surface AR placement via WebXR.',
        route: '/ar/lx-sneaker-ar',
        badge: 'viewer',
      },
      {
        title: 'LX Watch Elite',
        description: '3D watch viewer with AR mode.',
        route: '/ar/lx-watch-elite',
        badge: 'viewer',
      },
      {
        title: 'LX Watch Catalog AR',
        description: 'Watch catalog with AR launch.',
        route: '/ar/lx-watch-catalog-ar',
        badge: 'viewer',
      },
      {
        title: 'TG Headphones QR',
        description: 'QR code launch for headphones AR experience.',
        route: '/ar/tg-headphones-qr',
        badge: 'viewer',
      },
      {
        title: 'Noor Lamp Showcase',
        description: '3D lamp viewer with surface AR.',
        route: '/ar/noor-lamp-showcase',
        badge: 'viewer',
      },
    ],
  },
  {
    heading: 'Standalone Demos',
    cards: [
      {
        title: 'Model Viewer',
        description: 'Google model-viewer with camera controls and AR modes.',
        route: '/demo/model-viewer',
        badge: 'demo',
      },
      {
        title: 'MindAR Image',
        description: 'Image target tracking with MindAR + Three.js.',
        route: '/demo/mindar-image',
        badge: 'demo',
      },
      {
        title: 'AR.js Marker',
        description: 'Marker-based AR with A-Frame and AR.js (Hiro marker).',
        route: '/demo/arjs-marker',
        badge: 'demo',
      },
    ],
  },
];

const badgeColors: Record<Badge, string> = {
  camera: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  upload: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  viewer: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  demo: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

const badgeLabels: Record<Badge, string> = {
  camera: 'Camera',
  upload: 'Upload',
  viewer: 'Viewer',
  demo: 'Demo',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-white/10 text-white/50 hover:text-white hover:border-white/25 transition-colors"
      title="Copy link"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export default function ArDemoPage() {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">AR Test Center</h1>
          <p className="text-sm text-white/50 mt-1">
            Test all AR experiences across face try-on, body tracking, virtual fit, 3D viewers, and standalone demos.
          </p>
          <p className="text-xs text-white/30 mt-1">
            Camera-based demos require camera permission. Best on mobile for AR placement.
          </p>
          {baseUrl && (
            <p className="text-xs text-white/20 mt-2 font-mono break-all">{baseUrl}</p>
          )}
        </div>
      </div>

      {/* Badge legend */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-2 flex flex-wrap gap-3">
        {(Object.keys(badgeColors) as Badge[]).map((b) => (
          <span
            key={b}
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeColors[b]}`}
          >
            {badgeLabels[b]}
          </span>
        ))}
      </div>

      {/* Sections */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {sections.map((section) => (
          <div key={section.heading} className="mt-8">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
              {section.heading}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.cards.map((card) => (
                <div
                  key={card.route}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex flex-col gap-3 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-white/90">{card.title}</h3>
                      <p className="text-xs text-white/40 mt-1 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                    <span
                      className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeColors[card.badge]}`}
                    >
                      {badgeLabels[card.badge]}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/25 font-mono truncate">{card.route}</p>
                  <div className="flex gap-2 mt-auto">
                    <a
                      href={card.route}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center px-3 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors active:bg-white/20"
                    >
                      {card.badge === 'camera' ? 'Launch Camera' :
                       card.badge === 'upload' ? 'Open Upload' :
                       card.badge === 'viewer' ? 'View 3D' : 'Open Demo'}
                    </a>
                    <CopyButton text={`${baseUrl}${card.route}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 py-4 text-center">
        <p className="text-[10px] text-white/20">AR-CORE-7 Test Center</p>
      </div>
    </div>
  );
}
