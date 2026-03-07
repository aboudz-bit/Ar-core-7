'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  Sparkles, Plus, Eye, ArrowRight, Smartphone, Target, QrCode, Code,
  AlertTriangle, CheckCircle, Box, Image as ImageIcon, ScanFace, PersonStanding, Shirt
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ExperienceRow {
  id: string;
  name: string;
  slug: string;
  experienceType: string;
  publishStatus: string;
  createdAt: string;
  company: { id: string; name: string; slug: string };
  product: { id: string; title: string; thumbnailUrl: string | null } | null;
}

interface ProductWithAssets {
  id: string;
  title: string;
  companyId: string;
  assets: { id: string; assetType: string }[];
}

const TYPE_ICONS: Record<string, typeof Eye> = {
  PRODUCT_VIEWER: Eye,
  SURFACE_AR: Smartphone,
  IMAGE_TARGET: Target,
  QR_LAUNCH: QrCode,
  EMBED_VIEWER: Code,
  FACE_TRYON: ScanFace,
  BODY_TRYON: PersonStanding,
  CLOTHING_TRYON_PHOTO: Shirt,
};

const TYPE_COLORS: Record<string, string> = {
  PRODUCT_VIEWER: 'bg-blue-50 text-blue-600',
  SURFACE_AR: 'bg-purple-50 text-purple-600',
  IMAGE_TARGET: 'bg-emerald-50 text-emerald-600',
  QR_LAUNCH: 'bg-amber-50 text-amber-600',
  EMBED_VIEWER: 'bg-rose-50 text-rose-600',
  FACE_TRYON: 'bg-violet-50 text-violet-600',
  BODY_TRYON: 'bg-fuchsia-50 text-fuchsia-600',
  CLOTHING_TRYON_PHOTO: 'bg-teal-50 text-teal-600',
};

const EXPERIENCE_TYPE_REQUIREMENTS: Record<string, { label: string; needs: string[]; description: string }> = {
  PRODUCT_VIEWER: {
    label: '3D Viewer',
    needs: ['MODEL_GLB'],
    description: 'Interactive 3D product viewer with camera controls and AR launch',
  },
  SURFACE_AR: {
    label: 'Surface AR',
    needs: ['MODEL_GLB'],
    description: 'Place product on real-world surfaces using AR',
  },
  IMAGE_TARGET: {
    label: 'Image Target',
    needs: ['MODEL_GLB', 'TARGET_IMAGE'],
    description: 'Trigger AR when user scans a target image (catalog, poster)',
  },
  QR_LAUNCH: {
    label: 'QR Launch',
    needs: ['MODEL_GLB'],
    description: 'Generate QR code that launches AR experience',
  },
  FACE_TRYON: {
    label: 'Face Try-On',
    needs: ['FACE_OVERLAY_IMAGE'],
    description: 'Virtual try-on using face tracking (eyewear, accessories)',
  },
  BODY_TRYON: {
    label: 'Body Try-On',
    needs: ['BODY_OVERLAY_MODEL'],
    description: 'Virtual try-on using body tracking (clothing, fashion)',
  },
  CLOTHING_TRYON_PHOTO: {
    label: 'Photo Try-On',
    needs: ['GARMENT_IMAGE'],
    description: 'Upload person photo + garment for virtual try-on preview',
  },
};

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<ProductWithAssets[]>([]);
  const [form, setForm] = useState({ companyId: '', productId: '', name: '', experienceType: 'PRODUCT_VIEWER' });
  const [saving, setSaving] = useState(false);

  const loadExperiences = async () => {
    const res = await fetch('/api/experiences');
    const data = await res.json();
    if (data.success) setExperiences(data.data);
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      loadExperiences(),
      fetch('/api/companies').then((r) => r.json()).then((d) => {
        if (d.success) setCompanies(d.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }),
      fetch('/api/products').then((r) => r.json()).then((d) => {
        if (d.success) setProducts(d.data.map((p: ProductWithAssets) => ({
          id: p.id, title: p.title, companyId: p.companyId,
          assets: p.assets || [],
        })));
      }),
    ]);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/experiences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setForm({ companyId: '', productId: '', name: '', experienceType: 'PRODUCT_VIEWER' });
      loadExperiences();
    }
    setSaving(false);
  };

  const filteredProducts = products.filter((p) => !form.companyId || p.companyId === form.companyId);
  const selectedProduct = products.find((p) => p.id === form.productId);
  const selectedType = EXPERIENCE_TYPE_REQUIREMENTS[form.experienceType];

  // Asset availability analysis
  const productAssetTypes = new Set(selectedProduct?.assets.map((a) => a.assetType) || []);
  const hasModel = productAssetTypes.has('MODEL_GLB') || productAssetTypes.has('MODEL_GLTF');
  const hasTargetImage = productAssetTypes.has('TARGET_IMAGE');
  const hasPoster = productAssetTypes.has('POSTER');
  const hasUsdz = productAssetTypes.has('MODEL_USDZ');

  const missingAssets = selectedType?.needs.filter((need) => !productAssetTypes.has(need)) || [];

  // Auto-detect available experience types for selected product
  const availableTypes = selectedProduct ? Object.entries(EXPERIENCE_TYPE_REQUIREMENTS).map(([type, req]) => {
    const missing = req.needs.filter((need) => !productAssetTypes.has(need));
    return { type, ...req, missing, available: missing.length === 0 };
  }) : [];

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Experiences" subtitle="Manage AR experiences and viewers" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-surface-500">{experiences.length} experiences</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Create Experience
          </button>
        </div>

        {experiences.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No experiences yet"
            description="Create your first AR experience to publish"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Create Experience
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {experiences.map((exp) => {
              const Icon = TYPE_ICONS[exp.experienceType] || Sparkles;
              const iconColor = TYPE_COLORS[exp.experienceType] || 'bg-surface-50 text-surface-600';
              return (
                <Link key={exp.id} href={`/dashboard/experiences/${exp.id}`} className="card-hover p-5 group">
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-surface-900 truncate">{exp.name}</h3>
                      <p className="text-xs text-surface-400 mt-0.5">{exp.experienceType.replace(/_/g, ' ')}</p>
                    </div>
                    <StatusBadge status={exp.publishStatus} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-surface-500">
                    <span>{exp.company.name}</span>
                    <span>{exp.product?.title || 'No product'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-surface-100 text-xs text-surface-400">
                    <span>{formatDate(exp.createdAt)}</span>
                    <span className="flex items-center gap-1 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Configure <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Experience" size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Company</label>
              <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, productId: '' })} required>
                <option value="">Select company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Product</label>
              <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">No product binding</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.assets.length} assets)
                  </option>
                ))}
              </select>
            </div>

            {/* Asset availability indicator */}
            {selectedProduct && (
              <div className="rounded-lg border border-surface-200 p-3 bg-surface-50 space-y-2">
                <p className="text-xs font-semibold text-surface-500 uppercase">Product Assets</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '3D Model', present: hasModel, icon: Box },
                    { label: 'Poster', present: hasPoster, icon: ImageIcon },
                    { label: 'Target Image', present: hasTargetImage, icon: Target },
                    { label: 'USDZ (iOS)', present: hasUsdz, icon: Smartphone },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                      item.present ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-100 text-surface-400'
                    }`}>
                      {item.present ? <CheckCircle className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border border-current" />}
                      {item.label}
                    </div>
                  ))}
                </div>

                {/* Type availability */}
                {availableTypes.length > 0 && (
                  <div className="pt-2 border-t border-surface-200 space-y-1">
                    {availableTypes.map((t) => (
                      <div key={t.type} className="flex items-center gap-2 text-xs">
                        {t.available ? (
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        )}
                        <span className={t.available ? 'text-surface-700' : 'text-surface-400'}>{t.label}</span>
                        {!t.available && (
                          <span className="text-amber-600 ml-auto">Missing: {t.missing.join(', ').replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="label">Experience Name</label>
              <input type="text" className="input" placeholder="Premium Sneaker 3D View" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div>
              <label className="label">Experience Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(EXPERIENCE_TYPE_REQUIREMENTS).map(([value, info]) => {
                  const Icon = TYPE_ICONS[value] || Sparkles;
                  const missing = selectedProduct
                    ? info.needs.filter((need) => !productAssetTypes.has(need))
                    : [];
                  const isAvailable = !selectedProduct || missing.length === 0;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, experienceType: value })}
                      className={`flex flex-col items-start gap-1 p-3 rounded-lg border-2 text-sm transition-all ${
                        form.experienceType === value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : isAvailable
                            ? 'border-surface-200 text-surface-600 hover:border-surface-300'
                            : 'border-surface-200 text-surface-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Icon className="w-4 h-4" />
                        <span className="font-medium">{info.label}</span>
                        {!isAvailable && <AlertTriangle className="w-3 h-3 text-amber-500 ml-auto" />}
                      </div>
                      <p className="text-[10px] text-left leading-tight opacity-70">{info.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Missing asset warning */}
            {selectedProduct && missingAssets.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Missing required assets</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This experience type requires: {missingAssets.map((a) => a.replace(/_/g, ' ')).join(', ')}.
                    You can still create it, but it won&apos;t work until the assets are uploaded.
                  </p>
                  <a href={`/dashboard/products/${selectedProduct.id}`} className="text-xs font-medium text-amber-800 hover:text-amber-900 mt-1 inline-block">
                    Upload assets →
                  </a>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Experience'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
