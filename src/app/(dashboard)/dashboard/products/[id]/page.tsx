'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft, Upload, Trash2, FileImage, Box, Eye, Smartphone,
  Image, Target, Tag, Edit3, Save, X
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';

interface ProductDetail {
  id: string;
  title: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  brand: string | null;
  status: string;
  tags: string[];
  thumbnailUrl: string | null;
  assetCompletenessScore: number;
  scalePreset: number;
  anchorType: string;
  createdAt: string;
  company: { id: string; name: string; slug: string; brandPrimary: string };
  assets: {
    id: string;
    assetType: string;
    fileName: string;
    filePath: string;
    fileSize: number;
    mimeType: string;
    createdAt: string;
  }[];
  experiences: { id: string; name: string; slug: string; experienceType: string; publishStatus: string }[];
}

const ASSET_TYPE_ICONS: Record<string, typeof Box> = {
  MODEL_GLB: Box,
  MODEL_GLTF: Box,
  MODEL_USDZ: Smartphone,
  IMAGE_2D: Image,
  THUMBNAIL: Image,
  POSTER: Image,
  TARGET_IMAGE: Target,
  FACE_EFFECT: Eye,
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', sku: '', category: '', description: '', status: '' });

  const loadProduct = async () => {
    const res = await fetch(`/api/products/${params.id}`);
    const data = await res.json();
    if (data.success) {
      setProduct(data.data);
      setEditForm({
        title: data.data.title,
        sku: data.data.sku || '',
        category: data.data.category || '',
        description: data.data.description || '',
        status: data.data.status,
      });
    }
    setLoading(false);
  };

  useEffect(() => { loadProduct(); }, [params.id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !product) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('productId', product.id);

    // Auto-detect asset type
    if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
      formData.append('assetType', 'MODEL_GLB');
    } else if (file.name.endsWith('.usdz')) {
      formData.append('assetType', 'MODEL_USDZ');
    }

    await fetch('/api/assets', { method: 'POST', body: formData });
    await loadProduct();
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!product) return;
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditing(false);
    loadProduct();
  };

  if (loading) return <PageLoader />;
  if (!product) return <div className="p-6">Product not found</div>;

  const glbAsset = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = product.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = product.assets.find((a) => a.assetType === 'POSTER');

  return (
    <>
      <Header title={product.title} subtitle={`${product.company.name} · ${product.sku || 'No SKU'}`} />
      <div className="p-6 space-y-6">
        {/* Back button */}
        <button onClick={() => router.push('/dashboard/products')} className="btn-ghost text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Preview */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="h-96 bg-surface-50 flex items-center justify-center">
              {glbAsset ? (
                <div className="w-full h-full" dangerouslySetInnerHTML={{
                  __html: `<model-viewer
                    src="${glbAsset.filePath}"
                    ${usdzAsset ? `ios-src="${usdzAsset.filePath}"` : ''}
                    ${posterAsset ? `poster="${posterAsset.filePath}"` : ''}
                    alt="${product.title}"
                    camera-controls
                    auto-rotate
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    shadow-intensity="1"
                    style="width:100%;height:100%;"
                  ></model-viewer>`
                }} />
              ) : (
                <div className="text-center">
                  <Box className="w-16 h-16 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm text-surface-500">Upload a GLB model to preview</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-surface-900">Details</h3>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="btn-primary py-1.5 px-3 text-xs"><Save className="w-3 h-3" /> Save</button>
                    <button onClick={() => setEditing(false)} className="btn-ghost py-1.5 px-3 text-xs"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} className="btn-ghost py-1.5 px-3 text-xs"><Edit3 className="w-3 h-3" /> Edit</button>
                )}
              </div>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="label">Title</label>
                    <input type="text" className="input" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">SKU</label>
                    <input type="text" className="input" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <input type="text" className="input" value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select className="input" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                      <option value="DRAFT">Draft</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-surface-500">Status</span><StatusBadge status={product.status} /></div>
                  <div className="flex justify-between"><span className="text-surface-500">Category</span><span className="text-surface-800">{product.category || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Brand</span><span className="text-surface-800">{product.brand || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Scale</span><span className="text-surface-800">{product.scalePreset}x</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Anchor</span><span className="text-surface-800">{product.anchorType}</span></div>
                  <div className="flex justify-between"><span className="text-surface-500">Created</span><span className="text-surface-800">{formatDate(product.createdAt)}</span></div>
                </div>
              )}
            </div>

            {/* Completeness */}
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-3">Asset Completeness</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all" style={{ width: `${product.assetCompletenessScore}%` }} />
                </div>
                <span className="text-sm font-bold text-surface-900">{product.assetCompletenessScore}%</span>
              </div>
            </div>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2"><Tag className="w-4 h-4" /> Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span key={tag} className="badge-neutral">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Linked Experiences */}
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-3">Experiences</h3>
              {product.experiences.length === 0 ? (
                <p className="text-sm text-surface-400">No experiences linked</p>
              ) : (
                <div className="space-y-2">
                  {product.experiences.map((exp) => (
                    <a key={exp.id} href={`/dashboard/experiences/${exp.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-surface-800">{exp.name}</p>
                        <p className="text-xs text-surface-400">{exp.experienceType.replace(/_/g, ' ')}</p>
                      </div>
                      <StatusBadge status={exp.publishStatus} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-surface-900">Assets</h3>
              <p className="text-sm text-surface-500">{product.assets.length} files uploaded</p>
            </div>
            <div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} accept=".glb,.gltf,.usdz,.jpg,.jpeg,.png,.webp" />
              <button onClick={() => fileInputRef.current?.click()} className="btn-primary" disabled={uploading}>
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload Asset'}
              </button>
            </div>
          </div>

          {product.assets.length === 0 ? (
            <div className="py-12 text-center">
              <FileImage className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500">No assets uploaded yet</p>
              <p className="text-xs text-surface-400">Upload GLB, GLTF, USDZ, or image files</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {product.assets.map((asset) => {
                const Icon = ASSET_TYPE_ICONS[asset.assetType] || FileImage;
                return (
                  <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 hover:border-surface-300 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-surface-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-surface-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{asset.fileName}</p>
                      <p className="text-xs text-surface-400">{asset.assetType.replace(/_/g, ' ')} · {formatBytes(asset.fileSize)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
