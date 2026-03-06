'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Package, Plus, FileImage, Sparkles, ArrowRight, Search } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ProductRow {
  id: string;
  title: string;
  sku: string | null;
  category: string | null;
  status: string;
  thumbnailUrl: string | null;
  assetCompletenessScore: number;
  createdAt: string;
  company: { id: string; name: string; slug: string };
  assets: { id: string; assetType: string }[];
  _count: { experiences: number };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ companyId: '', title: '', sku: '', category: '', description: '' });
  const [saving, setSaving] = useState(false);

  const loadProducts = async (q?: string) => {
    const params = new URLSearchParams();
    if (q) params.set('search', q);
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    if (data.success) setProducts(data.data);
    setLoading(false);
  };

  useEffect(() => {
    Promise.all([
      loadProducts(),
      fetch('/api/companies').then((r) => r.json()).then((d) => {
        if (d.success) setCompanies(d.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }),
    ]);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setForm({ companyId: '', title: '', sku: '', category: '', description: '' });
      loadProducts();
    }
    setSaving(false);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Products" subtitle="Manage product catalog and assets" />
      <div className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-surface-200">
              <Search className="w-4 h-4 text-surface-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="bg-transparent text-sm focus:outline-none w-48"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  loadProducts(e.target.value);
                }}
              />
            </div>
            <p className="text-sm text-surface-500">{products.length} products</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add your first product to start building AR experiences"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Link key={product.id} href={`/dashboard/products/${product.id}`} className="card-hover overflow-hidden group">
                {/* Thumbnail */}
                <div className="h-40 bg-surface-100 flex items-center justify-center overflow-hidden">
                  {product.thumbnailUrl ? (
                    <img src={product.thumbnailUrl} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-12 h-12 text-surface-300" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-surface-900 truncate">{product.title}</h3>
                      <p className="text-xs text-surface-400 mt-0.5">{product.company.name}{product.sku ? ` · ${product.sku}` : ''}</p>
                    </div>
                    <StatusBadge status={product.status} />
                  </div>

                  {/* Completeness bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-surface-500">Asset completeness</span>
                      <span className="font-medium text-surface-700">{product.assetCompletenessScore}%</span>
                    </div>
                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${product.assetCompletenessScore}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-surface-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><FileImage className="w-3.5 h-3.5" />{product.assets.length}</span>
                      <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />{product._count.experiences}</span>
                    </div>
                    <span className="flex items-center gap-1 text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Product" size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Company</label>
              <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })} required>
                <option value="">Select company</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Product Title</label>
              <input type="text" className="input" placeholder="Premium Sneaker" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">SKU (optional)</label>
                <input type="text" className="input" placeholder="SKU-001" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
              </div>
              <div>
                <label className="label">Category (optional)</label>
                <input type="text" className="input" placeholder="Footwear" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <textarea className="input h-20 resize-none" placeholder="Product description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Add Product'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
