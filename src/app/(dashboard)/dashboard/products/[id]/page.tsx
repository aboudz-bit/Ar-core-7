'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { AssetCard } from '@/components/ui/AssetCard';
import {
  ArrowLeft, Upload, Box, Eye, Smartphone, Image, Target, Tag, Edit3, Save, X,
  CheckCircle, AlertTriangle, FileImage, Crosshair, Star, Layers
} from 'lucide-react';
import { formatBytes, formatDate } from '@/lib/utils';

interface ProductAsset {
  id: string;
  assetType: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

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
  assets: ProductAsset[];
  experiences: { id: string; name: string; slug: string; experienceType: string; publishStatus: string }[];
}

const ASSET_REQUIREMENTS = [
  { type: 'MODEL_GLB', label: '3D Model (GLB)', icon: Box, required: true },
  { type: 'THUMBNAIL', label: 'Thumbnail', icon: Star, required: true },
  { type: 'IMAGE_2D', label: 'Product Image', icon: Image, required: false },
  { type: 'POSTER', label: 'Poster Image', icon: FileImage, required: false },
  { type: 'MODEL_USDZ', label: 'iOS Model (USDZ)', icon: Smartphone, required: false },
  { type: 'TARGET_IMAGE', label: 'AR Target Image', icon: Crosshair, required: false },
];

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', sku: '', category: '', description: '', status: '' });
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [replacingAssetId, setReplacingAssetId] = useState<string | null>(null);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [uploadAssetType, setUploadAssetType] = useState<string | undefined>(undefined);

  const loadProduct = useCallback(async () => {
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
  }, [params.id]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

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

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm('Delete this asset? This cannot be undone.')) return;
    setDeletingAssetId(assetId);
    await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
    setDeletingAssetId(null);
    loadProduct();
  };

  const handleChangeType = async (assetId: string, newType: string) => {
    await fetch(`/api/assets/${assetId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assetType: newType }),
    });
    loadProduct();
  };

  const handleReplaceStart = (assetId: string) => {
    setReplacingAssetId(assetId);
    replaceInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingAssetId) return;

    const formData = new FormData();
    formData.append('file', file);

    await fetch(`/api/assets/${replacingAssetId}`, {
      method: 'PATCH',
      body: formData,
    });

    setReplacingAssetId(null);
    if (replaceInputRef.current) replaceInputRef.current.value = '';
    loadProduct();
  };

  const handleQuickUpload = (type: string) => {
    setUploadAssetType(type);
    setShowUploadZone(true);
  };

  if (loading) return <PageLoader />;
  if (!product) return <div className="p-6">Product not found</div>;

  const glbAsset = product.assets.find((a) => a.assetType === 'MODEL_GLB');
  const usdzAsset = product.assets.find((a) => a.assetType === 'MODEL_USDZ');
  const posterAsset = product.assets.find((a) => a.assetType === 'POSTER');
  const assetTypeSet = new Set(product.assets.map((a) => a.assetType));

  // Completeness checklist
  const completenessItems = ASSET_REQUIREMENTS.map((req) => ({
    ...req,
    present: assetTypeSet.has(req.type),
    count: product.assets.filter((a) => a.assetType === req.type).length,
  }));

  const requiredMissing = completenessItems.filter((i) => i.required && !i.present);

  return (
    <>
      <Header title={product.title} subtitle={`${product.company.name} · ${product.sku || 'No SKU'}`} />
      <div className="p-6 space-y-6">
        {/* Hidden replace input */}
        <input ref={replaceInputRef} type="file" className="hidden" onChange={handleReplaceFile} accept=".glb,.gltf,.usdz,.jpg,.jpeg,.png,.webp" />

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
                    touch-action="pan-y"
                    style="width:100%;height:100%;"
                  ></model-viewer>`
                }} />
              ) : (
                <div className="text-center">
                  <Box className="w-16 h-16 text-surface-300 mx-auto mb-3" />
                  <p className="text-sm text-surface-500 mb-1">No 3D model uploaded</p>
                  <p className="text-xs text-surface-400 mb-4">Upload a GLB file to see a preview</p>
                  <button onClick={() => handleQuickUpload('MODEL_GLB')} className="btn-primary text-sm">
                    <Upload className="w-4 h-4" /> Upload GLB Model
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Product Info */}
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
                    <label className="label">Description</label>
                    <textarea className="input h-20 resize-none" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
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
                  {product.description && (
                    <div className="pt-2 border-t border-surface-100">
                      <p className="text-surface-500 mb-1">Description</p>
                      <p className="text-surface-700 text-xs leading-relaxed">{product.description}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Asset Completeness */}
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-3">Asset Completeness</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      product.assetCompletenessScore >= 80 ? 'bg-emerald-500' :
                      product.assetCompletenessScore >= 50 ? 'bg-amber-500' :
                      'bg-red-400'
                    }`}
                    style={{ width: `${product.assetCompletenessScore}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-surface-900">{product.assetCompletenessScore}%</span>
              </div>

              <div className="space-y-2">
                {completenessItems.map((item) => (
                  <div key={item.type} className="flex items-center gap-2 text-xs">
                    {item.present ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    ) : item.required ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-surface-300 flex-shrink-0" />
                    )}
                    <span className={item.present ? 'text-surface-700' : 'text-surface-400'}>
                      {item.label}
                      {item.count > 1 && <span className="text-surface-400 ml-1">({item.count})</span>}
                    </span>
                    {!item.present && (
                      <button
                        onClick={() => handleQuickUpload(item.type)}
                        className="ml-auto text-brand-600 hover:text-brand-700 font-medium"
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {requiredMissing.length > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-100">
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {requiredMissing.length} required asset{requiredMissing.length > 1 ? 's' : ''} missing
                  </p>
                </div>
              )}
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
              <h3 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Experiences
              </h3>
              {product.experiences.length === 0 ? (
                <div>
                  <p className="text-sm text-surface-400 mb-2">No experiences linked</p>
                  <a href="/dashboard/experiences" className="text-xs text-brand-600 hover:text-brand-700 font-medium">
                    Create Experience →
                  </a>
                </div>
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

        {/* Asset Upload Zone */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-surface-900">Upload Assets</h3>
              <p className="text-sm text-surface-500">
                Drag and drop files or click to browse. Files are organized by type automatically.
              </p>
            </div>
            {!showUploadZone && (
              <button onClick={() => { setUploadAssetType(undefined); setShowUploadZone(true); }} className="btn-primary">
                <Upload className="w-4 h-4" /> Upload
              </button>
            )}
          </div>

          {showUploadZone && (
            <div className="mb-6">
              {uploadAssetType && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-surface-600">Uploading as:</span>
                  <span className="badge-primary">{uploadAssetType.replace(/_/g, ' ')}</span>
                  <button onClick={() => setUploadAssetType(undefined)} className="text-xs text-surface-400 hover:text-surface-600">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <FileUploadZone
                productId={product.id}
                assetType={uploadAssetType}
                label={uploadAssetType ? `Drop ${uploadAssetType.replace(/_/g, ' ').toLowerCase()} here` : 'Drop files here to upload'}
                onUploadComplete={(result) => {
                  if (result.success) {
                    loadProduct();
                    setTimeout(() => setShowUploadZone(false), 2000);
                  }
                }}
              />
              <div className="flex justify-end mt-3">
                <button onClick={() => setShowUploadZone(false)} className="btn-ghost text-xs">
                  Close Upload Zone
                </button>
              </div>
            </div>
          )}

          {/* Quick upload slots for missing types */}
          {!showUploadZone && requiredMissing.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {requiredMissing.map((req) => (
                <FileUploadZone
                  key={req.type}
                  productId={product.id}
                  assetType={req.type}
                  compact
                  label={`Add ${req.label}`}
                  onUploadComplete={(result) => {
                    if (result.success) loadProduct();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Asset Grid */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-surface-900">Assets</h3>
              <p className="text-sm text-surface-500">{product.assets.length} file{product.assets.length !== 1 ? 's' : ''} uploaded</p>
            </div>
          </div>

          {product.assets.length === 0 ? (
            <div className="py-12 text-center">
              <FileImage className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500 mb-1">No assets uploaded yet</p>
              <p className="text-xs text-surface-400 mb-4">Upload GLB, GLTF, USDZ, or image files to get started</p>
              <button onClick={() => { setUploadAssetType(undefined); setShowUploadZone(true); }} className="btn-primary text-sm">
                <Upload className="w-4 h-4" /> Upload First Asset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {product.assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  onDelete={handleDeleteAsset}
                  onChangeType={handleChangeType}
                  onReplace={handleReplaceStart}
                  isDeleting={deletingAssetId === asset.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
