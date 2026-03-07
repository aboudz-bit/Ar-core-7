'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Building2, Plus, Package, Users, Sparkles } from 'lucide-react';

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  brandPrimary: string;
  isActive: boolean;
  createdAt: string;
  _count: { products: number; memberships: number; experiences: number };
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({ name: '', domain: '', brandPrimary: '#4263eb' });
  const [saving, setSaving] = useState(false);

  const loadCompanies = async () => {
    const res = await fetch('/api/companies');
    const data = await res.json();
    if (data.success) setCompanies(data.data);
    setLoading(false);
  };

  useEffect(() => { loadCompanies(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setFormData({ name: '', domain: '', brandPrimary: '#4263eb' });
      loadCompanies();
    }
    setSaving(false);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Companies" subtitle="Manage client workspaces" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-surface-500">{companies.length} companies</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Company
          </button>
        </div>

        {companies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No companies yet"
            description="Create your first company workspace to get started"
            action={
              <button onClick={() => setShowCreate(true)} className="btn-primary">
                <Plus className="w-4 h-4" />
                Add Company
              </button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((company) => (
              <div key={company.id} className="card-hover p-5">
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: company.brandPrimary + '15' }}
                  >
                    <Building2 className="w-6 h-6" style={{ color: company.brandPrimary }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-surface-900 truncate">{company.name}</h3>
                    <p className="text-xs text-surface-400 mt-0.5">/{company.slug}</p>
                  </div>
                  <StatusBadge status={company.isActive ? 'ACTIVE' : 'ARCHIVED'} />
                </div>
                <div className="flex items-center gap-4 text-xs text-surface-500">
                  <span className="flex items-center gap-1">
                    <Package className="w-3.5 h-3.5" />
                    {company._count.products} products
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {company._count.memberships} users
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {company._count.experiences} exp
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Company">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                className="input"
                placeholder="Acme Inc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Domain (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="acme.com"
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.brandPrimary}
                  onChange={(e) => setFormData({ ...formData, brandPrimary: e.target.value })}
                  className="w-10 h-10 rounded border border-surface-200 cursor-pointer"
                />
                <input
                  type="text"
                  className="input flex-1"
                  value={formData.brandPrimary}
                  onChange={(e) => setFormData({ ...formData, brandPrimary: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create Company'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
