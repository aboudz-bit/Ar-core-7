'use client';

import { useState } from 'react';
import {
  Box, Image, Target, Smartphone, Eye, Trash2, RefreshCw, MoreVertical,
  Star, ImageIcon, Crosshair, FileImage, Loader2
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';

function getAssetTypeLabel(assetType: string): string {
  const labels: Record<string, string> = {
    MODEL_GLB: '3D Model (GLB)',
    MODEL_GLTF: '3D Model (glTF)',
    MODEL_USDZ: 'iOS Model (USDZ)',
    IMAGE_2D: 'Product Image',
    POSTER: 'Poster Image',
    TARGET_IMAGE: 'AR Target Image',
    THUMBNAIL: 'Thumbnail',
    FACE_EFFECT: 'Face Effect',
  };
  return labels[assetType] || assetType;
}

interface AssetData {
  id: string;
  assetType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

interface AssetCardProps {
  asset: AssetData;
  onDelete?: (id: string) => void;
  onChangeType?: (id: string, newType: string) => void;
  onReplace?: (id: string) => void;
  isDeleting?: boolean;
}

const ASSET_TYPE_ICONS: Record<string, typeof Box> = {
  MODEL_GLB: Box,
  MODEL_GLTF: Box,
  MODEL_USDZ: Smartphone,
  IMAGE_2D: Image,
  THUMBNAIL: Star,
  POSTER: ImageIcon,
  TARGET_IMAGE: Crosshair,
  FACE_EFFECT: Eye,
};

const ASSET_TYPE_COLORS: Record<string, string> = {
  MODEL_GLB: 'bg-indigo-50 text-indigo-600',
  MODEL_GLTF: 'bg-indigo-50 text-indigo-600',
  MODEL_USDZ: 'bg-purple-50 text-purple-600',
  IMAGE_2D: 'bg-blue-50 text-blue-600',
  THUMBNAIL: 'bg-amber-50 text-amber-600',
  POSTER: 'bg-emerald-50 text-emerald-600',
  TARGET_IMAGE: 'bg-rose-50 text-rose-600',
  FACE_EFFECT: 'bg-pink-50 text-pink-600',
};

const ASSET_TYPES = [
  { value: 'MODEL_GLB', label: '3D Model (GLB)' },
  { value: 'MODEL_GLTF', label: '3D Model (glTF)' },
  { value: 'MODEL_USDZ', label: 'iOS Model (USDZ)' },
  { value: 'IMAGE_2D', label: 'Product Image' },
  { value: 'THUMBNAIL', label: 'Thumbnail' },
  { value: 'POSTER', label: 'Poster Image' },
  { value: 'TARGET_IMAGE', label: 'AR Target Image' },
];

export function AssetCard({ asset, onDelete, onChangeType, onReplace, isDeleting }: AssetCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showTypeSelect, setShowTypeSelect] = useState(false);

  const Icon = ASSET_TYPE_ICONS[asset.assetType] || FileImage;
  const colorClass = ASSET_TYPE_COLORS[asset.assetType] || 'bg-surface-50 text-surface-600';
  const isImage = asset.mimeType.startsWith('image/');
  const isModel = asset.assetType.startsWith('MODEL_');

  return (
    <div className="group relative rounded-xl border border-surface-200 bg-white overflow-hidden hover:border-surface-300 hover:shadow-sm transition-all">
      {/* Preview area */}
      <div className="h-32 bg-surface-50 flex items-center justify-center overflow-hidden relative">
        {isImage ? (
          <img src={asset.filePath} alt={asset.fileName} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        )}

        {/* Type badge */}
        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold ${colorClass}`}>
          {getAssetTypeLabel(asset.assetType)}
        </div>

        {/* Actions menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-7 h-7 rounded-lg bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-surface-600" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-9 z-20 w-44 bg-white rounded-lg shadow-lg border border-surface-200 py-1">
                <button
                  onClick={() => { setShowTypeSelect(true); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                >
                  <Target className="w-3.5 h-3.5" /> Change Type
                </button>
                {onReplace && (
                  <button
                    onClick={() => { onReplace(asset.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-surface-700 hover:bg-surface-50 flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Replace File
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => { onDelete(asset.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-surface-800 truncate" title={asset.fileName}>
          {asset.fileName}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-surface-400">{formatBytes(asset.fileSize)}</span>
          <span className="text-xs text-surface-400">{formatDate(asset.createdAt)}</span>
        </div>
      </div>

      {/* Type selector dropdown */}
      {showTypeSelect && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowTypeSelect(false)} />
          <div className="absolute left-3 right-3 bottom-14 z-40 bg-white rounded-lg shadow-lg border border-surface-200 py-1 max-h-52 overflow-y-auto">
            <p className="px-3 py-1.5 text-xs font-semibold text-surface-400 uppercase">Set asset type</p>
            {ASSET_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  onChangeType?.(asset.id, type.value);
                  setShowTypeSelect(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-50 flex items-center gap-2 ${
                  asset.assetType === type.value ? 'text-brand-600 font-medium bg-brand-50' : 'text-surface-700'
                }`}
              >
                {type.label}
                {asset.assetType === type.value && <span className="ml-auto text-xs text-brand-500">Current</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
