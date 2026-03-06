'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileImage, Box, Image, Smartphone, Target } from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';
import Link from 'next/link';

interface AssetSummary {
  id: string;
  title: string;
  companyName: string;
  assets: { id: string; assetType: string; fileName: string; fileSize: number; filePath: string; createdAt: string }[];
}

const TYPE_ICONS: Record<string, typeof Box> = {
  MODEL_GLB: Box,
  MODEL_GLTF: Box,
  MODEL_USDZ: Smartphone,
  IMAGE_2D: Image,
  THUMBNAIL: Image,
  POSTER: Image,
  TARGET_IMAGE: Target,
};

export default function AssetsPage() {
  const [products, setProducts] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?limit=100')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setProducts(
            data.data
              .filter((p: { assets: unknown[] }) => p.assets.length > 0)
              .map((p: { id: string; title: string; company: { name: string }; assets: unknown[] }) => ({
                id: p.id,
                title: p.title,
                companyName: p.company.name,
                assets: p.assets,
              }))
          );
        }
        setLoading(false);
      });
  }, []);

  if (loading) return <PageLoader />;

  const totalAssets = products.reduce((sum, p) => sum + p.assets.length, 0);
  const totalSize = products.reduce((sum, p) => sum + p.assets.reduce((s, a) => s + a.fileSize, 0), 0);

  return (
    <>
      <Header title="Assets" subtitle="Browse all uploaded assets" />
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="badge-primary">{totalAssets} files</div>
          <div className="badge-neutral">{formatBytes(totalSize)} total</div>
        </div>

        {products.length === 0 ? (
          <EmptyState icon={FileImage} title="No assets" description="Upload assets to your products" />
        ) : (
          <div className="space-y-6">
            {products.map((product) => (
              <div key={product.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Link href={`/dashboard/products/${product.id}`} className="font-semibold text-surface-900 hover:text-brand-600 transition-colors">
                      {product.title}
                    </Link>
                    <p className="text-xs text-surface-400">{product.companyName}</p>
                  </div>
                  <span className="badge-neutral">{product.assets.length} files</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {product.assets.map((asset) => {
                    const Icon = TYPE_ICONS[asset.assetType] || FileImage;
                    return (
                      <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200">
                        <div className="w-9 h-9 rounded-lg bg-surface-50 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-surface-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-800 truncate">{asset.fileName}</p>
                          <p className="text-xs text-surface-400">{asset.assetType.replace(/_/g, ' ')} · {formatBytes(asset.fileSize)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
