'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Users, Plus, Mail } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  memberships: { role: string; company: { id: string; name: string } }[];
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', companyId: '', role: 'CONTENT_MANAGER' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/companies').then((r) => r.json()),
    ]).then(([usersData, companiesData]) => {
      if (usersData.success) setUsers(usersData.data);
      if (companiesData.success) setCompanies(companiesData.data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    }).catch(() => {}).finally(() => {
      setLoading(false);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (data.success) {
      setShowCreate(false);
      setForm({ email: '', password: '', firstName: '', lastName: '', companyId: '', role: 'CONTENT_MANAGER' });
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      if (usersData.success) setUsers(usersData.data);
    }
    setSaving(false);
  };

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Users" subtitle="Manage platform users and roles" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-surface-500">{users.length} users</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>

        {users.length === 0 ? (
          <EmptyState icon={Users} title="No users" description="Add users to manage your platform" />
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-brand-700">
                            {(user.firstName || '?')[0]}{(user.lastName || '?')[0]}
                          </span>
                        </div>
                        <span className="font-medium text-surface-900">{user.firstName} {user.lastName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="flex items-center gap-1.5 text-surface-500">
                        <Mail className="w-3.5 h-3.5" />
                        {user.email}
                      </span>
                    </td>
                    <td>
                      {user.memberships.map((m, i) => (
                        <StatusBadge key={i} status={m.role} className="mr-1" />
                      ))}
                    </td>
                    <td>
                      {user.memberships.map((m) => m.company.name).join(', ') || '—'}
                    </td>
                    <td>
                      <StatusBadge status={user.isActive ? 'ACTIVE' : 'ARCHIVED'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add User" size="lg">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input type="text" className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input type="text" className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Company</label>
                <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                  <option value="">No company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                  <option value="CONTENT_MANAGER">Content Manager</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Add User'}</button>
            </div>
          </form>
        </Modal>
      </div>
    </>
  );
}
