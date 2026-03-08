'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Shirt, Plus, Search, Pencil, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface MerchantProductRow {
  id: string;
  title: string;
  garmentImagePath: string;
  category: string;
  fitType: string;
  sizingSystem: string;
  sizeChart: Record<string, Record<string, number>> | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'thobe': 'Thobe',
  'abaya': 'Abaya',
  't-shirt': 'T-Shirt',
  'jacket': 'Jacket',
  'shirt': 'Shirt',
  'hoodie': 'Hoodie',
  'sweater': 'Sweater',
  'polo': 'Polo',
  'dress': 'Dress',
  'other': 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  'thobe': 'bg-amber-50 text-amber-700',
  'abaya': 'bg-purple-50 text-purple-700',
  't-shirt': 'bg-blue-50 text-blue-700',
  'jacket': 'bg-emerald-50 text-emerald-700',
  'shirt': 'bg-indigo-50 text-indigo-700',
  'hoodie': 'bg-orange-50 text-orange-700',
  'sweater': 'bg-rose-50 text-rose-700',
  'polo': 'bg-teal-50 text-teal-700',
  'dress': 'bg-pink-50 text-pink-700',
  'other': 'bg-surface-100 text-surface-600',
};

export default function MerchantProductsPage() {
  const [products, setProducts] = useState<MerchantProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ companyId: '', title: '', category: 't-shirt' });
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/merchant/products');
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      loadProducts(),
      fetch('/api/companies').then((r) => r.json()).then((d) => {
        if (d.success) {
          const list = d.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
          setCompanies(list);
          if (list.length > 0) setForm((f) => ({ ...f, companyId: list[0].id }));
        }
      }),
    ]).catch(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!garmentFile) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('companyId', form.companyId);
      formData.append('title', form.title);
      formData.append('category', form.category);
      formData.append('garmentImage', garmentFile);

      const res = await fetch('/api/merchant/products', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ companyId: form.companyId, title: '', category: 't-shirt' });
        setGarmentFile(null);
        await loadProducts();
      }
    } finally {
      setSaving(false);
    }
  };

  const filtered = search
    ? products.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : products;

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Merchant Products" subtitle="Upload and configure garments for virtual try-on" />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>

        {/* Product grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={Shirt}
            title="No merchant products yet"
            description="Upload your first garment to get started with virtual try-on."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Product</button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product) => (
              <div key={product.id} className="card-hover overflow-hidden group">
                {/* Thumbnail */}
                <div className="relative h-48 bg-surface-100 overflow-hidden">
                  {product.thumbnailUrl ? (
                    <img
                      src={product.thumbnailUrl}
                      alt={product.title}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Shirt className="w-16 h-16 text-surface-300" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/merchant-products/${product.id}`}
                        className="p-2 bg-white rounded-lg shadow-md hover:bg-surface-50"
                      >
                        <Pencil className="w-4 h-4 text-surface-700" />
                      </Link>
                      <Link
                        href={`/virtual-fit/preview/${product.id}`}
                        target="_blank"
                        className="p-2 bg-white rounded-lg shadow-md hover:bg-surface-50"
                      >
                        <Eye className="w-4 h-4 text-surface-700" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold text-surface-900 text-sm truncate">{product.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`badge text-[11px] ${CATEGORY_COLORS[product.category] || CATEGORY_COLORS['other']}`}>
                      {CATEGORY_LABELS[product.category] || product.category}
                    </span>
                    <span className="badge bg-surface-100 text-surface-500 text-[11px] uppercase">
                      {product.sizingSystem}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-surface-400">
                    <span>{formatDate(product.createdAt)}</span>
                    <Link
                      href={`/dashboard/merchant-products/${product.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Merchant Product">
        <form onSubmit={handleCreate} className="space-y-4">
          {companies.length > 1 && (
            <div>
              <label htmlFor="mp-company" className="label">Company</label>
              <select
                id="mp-company"
                className="input"
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                required
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="mp-title" className="label">Product Name</label>
            <input
              id="mp-title"
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Classic White Thobe"
              required
            />
          </div>
          <div>
            <label htmlFor="mp-category" className="label">Category</label>
            <select
              id="mp-category"
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mp-image" className="label">Garment Image</label>
            <input
              id="mp-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="input"
              onChange={(e) => setGarmentFile(e.target.files?.[0] || null)}
              required
            />
            {garmentFile && (
              <p className="text-xs text-surface-400 mt-1">{garmentFile.name}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving || !garmentFile} className="btn-primary">
              {saving ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
