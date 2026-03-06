'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Sparkles, Plus, Eye, ArrowRight, Smartphone, Target, QrCode, Code } from 'lucide-react';
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

const TYPE_ICONS: Record<string, typeof Eye> = {
  PRODUCT_VIEWER: Eye,
  SURFACE_AR: Smartphone,
  IMAGE_TARGET: Target,
  QR_LAUNCH: QrCode,
  EMBED_VIEWER: Code,
};

const TYPE_COLORS: Record<string, string> = {
  PRODUCT_VIEWER: 'bg-blue-50 text-blue-600',
  SURFACE_AR: 'bg-purple-50 text-purple-600',
  IMAGE_TARGET: 'bg-emerald-50 text-emerald-600',
  QR_LAUNCH: 'bg-amber-50 text-amber-600',
  EMBED_VIEWER: 'bg-rose-50 text-rose-600',
};

export default function ExperiencesPage() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; title: string; companyId: string }[]>([]);
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
        if (d.success) setProducts(d.data.map((p: { id: string; title: string; companyId: string }) => ({ id: p.id, title: p.title, companyId: p.companyId })));
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
              <label className="label">Product (optional)</label>
              <select className="input" value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
                <option value="">No product binding</option>
                {filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Experience Name</label>
              <input type="text" className="input" placeholder="Premium Sneaker 3D View" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Experience Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'PRODUCT_VIEWER', label: '3D Viewer', icon: Eye },
                  { value: 'SURFACE_AR', label: 'Surface AR', icon: Smartphone },
                  { value: 'IMAGE_TARGET', label: 'Image Target', icon: Target },
                  { value: 'QR_LAUNCH', label: 'QR Launch', icon: QrCode },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, experienceType: type.value })}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm transition-all ${
                      form.experienceType === type.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-surface-200 text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    <type.icon className="w-4 h-4" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
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
