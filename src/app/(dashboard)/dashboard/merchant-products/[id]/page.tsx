'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Shirt, Save, ArrowLeft, Plus, Trash2, Eye, Upload } from 'lucide-react';
import Link from 'next/link';

interface MerchantProductData {
  id: string;
  companyId: string;
  title: string;
  garmentImagePath: string;
  category: string;
  fitType: string;
  sizingSystem: string;
  sizeChart: Record<string, Record<string, number>> | null;
  garmentLength: number | null;
  sleeveLength: number | null;
  shoulderSpec: number | null;
  chestSpec: number | null;
  drapeFactor: number;
  thumbnailUrl: string | null;
  isActive: boolean;
}

const CATEGORIES = [
  { value: 'thobe', label: 'Thobe' },
  { value: 'abaya', label: 'Abaya' },
  { value: 't-shirt', label: 'T-Shirt' },
  { value: 'jacket', label: 'Jacket' },
  { value: 'shirt', label: 'Shirt' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'sweater', label: 'Sweater' },
  { value: 'polo', label: 'Polo' },
  { value: 'dress', label: 'Dress' },
  { value: 'other', label: 'Other' },
];

const FIT_TYPES = [
  { value: 'slim', label: 'Slim Fit' },
  { value: 'regular', label: 'Regular Fit' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'loose', label: 'Loose Fit' },
];

const SIZING_SYSTEMS = [
  { value: 'letter', label: 'Letter (XS–XXXL)' },
  { value: 'numeric', label: 'Numeric (48–64)' },
  { value: 'custom', label: 'Custom' },
];

const SIZE_CHART_FIELDS = ['chest', 'shoulder', 'length', 'sleeve', 'waist', 'hip'];

export default function MerchantProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<MerchantProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('t-shirt');
  const [fitType, setFitType] = useState('regular');
  const [sizingSystem, setSizingSystem] = useState('letter');
  const [garmentLength, setGarmentLength] = useState('');
  const [sleeveLength, setSleeveLength] = useState('');
  const [shoulderSpec, setShoulderSpec] = useState('');
  const [chestSpec, setChestSpec] = useState('');
  const [drapeFactor, setDrapeFactor] = useState('1.0');
  const [sizeChart, setSizeChart] = useState<{ label: string; fields: Record<string, string> }[]>([]);
  const [newGarmentFile, setNewGarmentFile] = useState<File | null>(null);
  const [newGarmentPreview, setNewGarmentPreview] = useState<string | null>(null);

  const handleNewGarmentFile = useCallback((file: File | null) => {
    if (newGarmentPreview) URL.revokeObjectURL(newGarmentPreview);
    setNewGarmentFile(file);
    setNewGarmentPreview(file ? URL.createObjectURL(file) : null);
  }, [newGarmentPreview]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => { if (newGarmentPreview) URL.revokeObjectURL(newGarmentPreview); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadProduct = useCallback(async () => {
    try {
      const res = await fetch(`/api/merchant/products/${productId}`);
      const data = await res.json();
      if (data.success) {
        const p = data.data as MerchantProductData;
        setProduct(p);
        setTitle(p.title);
        setCategory(p.category);
        setFitType(p.fitType);
        setSizingSystem(p.sizingSystem);
        setGarmentLength(p.garmentLength?.toString() || '');
        setSleeveLength(p.sleeveLength?.toString() || '');
        setShoulderSpec(p.shoulderSpec?.toString() || '');
        setChestSpec(p.chestSpec?.toString() || '');
        setDrapeFactor(p.drapeFactor?.toString() || '1.0');

        // Parse size chart
        if (p.sizeChart && typeof p.sizeChart === 'object') {
          const rows = Object.entries(p.sizeChart).map(([label, fields]) => ({
            label,
            fields: Object.fromEntries(
              Object.entries(fields).map(([k, v]) => [k, v?.toString() || ''])
            ),
          }));
          setSizeChart(rows);
        }
      } else {
        setError('Product not found');
      }
    } catch {
      setError('Failed to load product');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { loadProduct(); }, [loadProduct]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      // Build size chart object
      const chartObj: Record<string, Record<string, number>> = {};
      for (const row of sizeChart) {
        if (!row.label.trim()) continue;
        const entry: Record<string, number> = {};
        for (const [field, val] of Object.entries(row.fields)) {
          const num = parseFloat(val);
          if (!isNaN(num) && num > 0) entry[field] = num;
        }
        if (Object.keys(entry).length > 0) chartObj[row.label.trim()] = entry;
      }

      const formData = new FormData();
      formData.append('companyId', product!.companyId);
      formData.append('title', title);
      formData.append('category', category);
      formData.append('fitType', fitType);
      formData.append('sizingSystem', sizingSystem);
      formData.append('drapeFactor', drapeFactor);
      formData.append('garmentLength', garmentLength);
      formData.append('sleeveLength', sleeveLength);
      formData.append('shoulderSpec', shoulderSpec);
      formData.append('chestSpec', chestSpec);
      if (Object.keys(chartObj).length > 0) {
        formData.append('sizeChart', JSON.stringify(chartObj));
      } else {
        formData.append('sizeChart', 'null');
      }
      if (newGarmentFile) {
        formData.append('garmentImage', newGarmentFile);
      }

      const res = await fetch(`/api/merchant/products/${productId}`, {
        method: 'PUT',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setProduct(data.data);
        setNewGarmentFile(null);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  // Size chart helpers
  const addSizeRow = () => {
    const defaultLabel = sizingSystem === 'numeric' ? '' : '';
    setSizeChart([...sizeChart, { label: defaultLabel, fields: {} }]);
  };

  const removeSizeRow = (index: number) => {
    setSizeChart(sizeChart.filter((_, i) => i !== index));
  };

  const updateSizeLabel = (index: number, label: string) => {
    const updated = [...sizeChart];
    updated[index] = { ...updated[index], label };
    setSizeChart(updated);
  };

  const updateSizeField = (index: number, field: string, value: string) => {
    const updated = [...sizeChart];
    updated[index] = {
      ...updated[index],
      fields: { ...updated[index].fields, [field]: value },
    };
    setSizeChart(updated);
  };

  if (loading) return <PageLoader />;
  if (error && !product) {
    return (
      <>
        <Header title="Product Not Found" />
        <div className="p-6 text-center">
          <p className="text-surface-500">{error}</p>
          <button onClick={() => router.push('/dashboard/merchant-products')} className="btn-secondary mt-4">
            <ArrowLeft className="w-4 h-4" /> Back to Products
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title={product?.title || 'Edit Product'}
        subtitle="Configure garment metadata and sizing for virtual try-on"
      />
      <div className="p-6 max-w-5xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => router.push('/dashboard/merchant-products')} className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <Link
              href={`/virtual-fit/preview/${productId}`}
              target="_blank"
              className="btn-secondary text-sm"
            >
              <Eye className="w-4 h-4" /> Preview Try-On
            </Link>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column — Garment image + basic info */}
          <div className="space-y-6">
            {/* Garment image */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-surface-700 mb-3 flex items-center gap-2">
                <Shirt className="w-4 h-4" /> Garment Image
              </h3>
              <div className="relative h-64 bg-surface-100 rounded-lg overflow-hidden mb-3">
                {(newGarmentPreview || product?.garmentImagePath) ? (
                  <img
                    src={newGarmentPreview || product!.garmentImagePath}
                    alt={title}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Shirt className="w-16 h-16 text-surface-300" />
                  </div>
                )}
              </div>
              <label className="btn-secondary text-sm w-full cursor-pointer justify-center">
                <Upload className="w-4 h-4" /> Replace Image
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => handleNewGarmentFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            {/* Basic info */}
            <div className="card p-5 space-y-4">
              <div>
                <label htmlFor="ed-title" className="label">Product Name</label>
                <input id="ed-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div>
                <label htmlFor="ed-category" className="label">Category</label>
                <select id="ed-category" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="ed-fit" className="label">Fit Type</label>
                <select id="ed-fit" className="input" value={fitType} onChange={(e) => setFitType(e.target.value)}>
                  {FIT_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Right column — Specs + Size chart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Garment specs */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-surface-700 mb-4">Garment Specifications (cm)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="ed-chest" className="label">Chest</label>
                  <input id="ed-chest" type="number" step="0.5" className="input" value={chestSpec} onChange={(e) => setChestSpec(e.target.value)} placeholder="cm" />
                </div>
                <div>
                  <label htmlFor="ed-shoulder" className="label">Shoulder</label>
                  <input id="ed-shoulder" type="number" step="0.5" className="input" value={shoulderSpec} onChange={(e) => setShoulderSpec(e.target.value)} placeholder="cm" />
                </div>
                <div>
                  <label htmlFor="ed-length" className="label">Length</label>
                  <input id="ed-length" type="number" step="0.5" className="input" value={garmentLength} onChange={(e) => setGarmentLength(e.target.value)} placeholder="cm" />
                </div>
                <div>
                  <label htmlFor="ed-sleeve" className="label">Sleeve</label>
                  <input id="ed-sleeve" type="number" step="0.5" className="input" value={sleeveLength} onChange={(e) => setSleeveLength(e.target.value)} placeholder="cm" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="ed-sizing" className="label">Sizing System</label>
                  <select id="ed-sizing" className="input" value={sizingSystem} onChange={(e) => setSizingSystem(e.target.value)}>
                    {SIZING_SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="ed-drape" className="label">
                    Drape Factor: {drapeFactor}
                  </label>
                  <input
                    id="ed-drape"
                    type="range"
                    min="0.7"
                    max="1.5"
                    step="0.05"
                    value={drapeFactor}
                    onChange={(e) => setDrapeFactor(e.target.value)}
                    className="w-full accent-brand-500 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-surface-400 mt-0.5">
                    <span>Fitted</span><span>Default</span><span>Flowing</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Size chart builder */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-surface-700">Size Chart Builder</h3>
                <button onClick={addSizeRow} className="btn-secondary text-xs py-1.5 px-3">
                  <Plus className="w-3.5 h-3.5" /> Add Size
                </button>
              </div>

              {sizeChart.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-sm">
                  <p>No sizes defined yet. Click &quot;Add Size&quot; to build your size chart.</p>
                  <p className="text-xs mt-1 text-surface-300">
                    {sizingSystem === 'numeric' ? 'Use numeric labels like 52, 54, 56...' : 'Use labels like XS, S, M, L, XL...'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-24">Size</th>
                        {SIZE_CHART_FIELDS.map((f) => (
                          <th key={f} className="capitalize">{f} (cm)</th>
                        ))}
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeChart.map((row, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              type="text"
                              className="input py-1.5 text-xs"
                              value={row.label}
                              onChange={(e) => updateSizeLabel(i, e.target.value)}
                              placeholder={sizingSystem === 'numeric' ? '52' : 'M'}
                            />
                          </td>
                          {SIZE_CHART_FIELDS.map((field) => (
                            <td key={field}>
                              <input
                                type="number"
                                step="0.5"
                                className="input py-1.5 text-xs"
                                value={row.fields[field] || ''}
                                onChange={(e) => updateSizeField(i, field, e.target.value)}
                                placeholder="—"
                              />
                            </td>
                          ))}
                          <td>
                            <button onClick={() => removeSizeRow(i)} className="p-1 hover:bg-red-50 rounded text-surface-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sizeChart.length > 0 && (
                <div className="mt-4 p-3 bg-surface-50 rounded-lg">
                  <p className="text-xs font-medium text-surface-500 mb-1">Preview JSON:</p>
                  <pre className="text-[11px] text-surface-600 overflow-x-auto">
                    {JSON.stringify(
                      Object.fromEntries(
                        sizeChart
                          .filter((r) => r.label.trim())
                          .map((r) => [
                            r.label.trim(),
                            Object.fromEntries(
                              Object.entries(r.fields)
                                .filter(([, v]) => v && !isNaN(parseFloat(v)))
                                .map(([k, v]) => [k, parseFloat(v)])
                            ),
                          ])
                      ),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
