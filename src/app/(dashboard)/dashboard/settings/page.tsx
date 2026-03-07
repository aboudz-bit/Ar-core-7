'use client';

import { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/dashboard/Header';
import {
  Save, Palette, Eye, Upload, Globe, BarChart3, CheckCircle, Code, Key,
  Plus, Trash2, ShieldOff, Copy, AlertTriangle, Clock,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  status: string;
  environment: string;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('branding');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; slug: string; brandPrimary: string; brandSecondary: string; logoUrl: string | null }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<'live' | 'test'>('live');
  const [creatingKey, setCreatingKey] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  const [settings, setSettings] = useState({
    brandName: '',
    primaryColor: '#4263eb',
    secondaryColor: '#748ffc',
    logoUrl: '',
    autoRotate: true,
    shadowIntensity: 1,
    arEnabled: true,
    maxUploadSizeMb: 50,
    allowedFileTypes: '.glb,.gltf,.usdz,.jpg,.jpeg,.png,.webp',
    analyticsEnabled: true,
    viewer_hide_branding: false,
    viewer_background: 'gradient',
  });

  const loadApiKeys = useCallback(async (companyId: string) => {
    const res = await fetch(`/api/api-keys?companyId=${companyId}`);
    const data = await res.json();
    if (data.success) setApiKeys(data.data);
  }, []);

  useEffect(() => {
    fetch('/api/companies').then((r) => r.json()).then((d) => {
      if (d.success && d.data.length > 0) {
        setCompanies(d.data);
        setSelectedCompanyId(d.data[0].id);
        loadCompanySettings(d.data[0]);
        loadApiKeys(d.data[0].id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanySettings = async (company: typeof companies[0]) => {
    setSettings((prev) => ({
      ...prev,
      brandName: company.name,
      primaryColor: company.brandPrimary,
      secondaryColor: company.brandSecondary,
      logoUrl: company.logoUrl || '',
    }));

    const res = await fetch(`/api/settings?companyId=${company.id}`);
    const data = await res.json();
    if (data.success) {
      setSettings((prev) => ({
        ...prev,
        viewer_hide_branding: data.data.viewer_hide_branding === true,
        viewer_background: (data.data.viewer_background as string) || 'gradient',
        autoRotate: data.data.viewer_auto_rotate !== false,
        shadowIntensity: (data.data.viewer_shadow_intensity as number) ?? 1,
        arEnabled: data.data.viewer_ar_enabled !== false,
        analyticsEnabled: data.data.analytics_enabled !== false,
      }));
    }
  };

  const handleCompanyChange = (companyId: string) => {
    setSelectedCompanyId(companyId);
    const company = companies.find((c) => c.id === companyId);
    if (company) {
      loadCompanySettings(company);
      loadApiKeys(companyId);
    }
    setNewKeySecret('');
  };

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: selectedCompanyId,
        settings: {
          viewer_hide_branding: settings.viewer_hide_branding,
          viewer_background: settings.viewer_background,
          viewer_auto_rotate: settings.autoRotate,
          viewer_shadow_intensity: settings.shadowIntensity,
          viewer_ar_enabled: settings.arEnabled,
          analytics_enabled: settings.analyticsEnabled,
        },
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || !selectedCompanyId) return;
    setCreatingKey(true);
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: selectedCompanyId,
        name: newKeyName.trim(),
        environment: newKeyEnv,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setNewKeySecret(data.data.secret);
      setNewKeyName('');
      loadApiKeys(selectedCompanyId);
    }
    setCreatingKey(false);
  };

  const handleRevokeKey = async (keyId: string) => {
    await fetch(`/api/api-keys/${keyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'revoke' }),
    });
    loadApiKeys(selectedCompanyId);
  };

  const handleDeleteKey = async (keyId: string) => {
    await fetch(`/api/api-keys/${keyId}`, { method: 'DELETE' });
    loadApiKeys(selectedCompanyId);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'viewer', label: 'Viewer & AR', icon: Eye },
    { id: 'whitelabel', label: 'White-Label', icon: Globe },
    { id: 'apikeys', label: 'API Keys', icon: Key },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <>
      <Header title="Settings" subtitle="Company & viewer configuration" />
      <div className="p-6">
        {companies.length > 1 && (
          <div className="mb-6">
            <label className="label">Company</label>
            <select className="input max-w-xs" value={selectedCompanyId} onChange={(e) => handleCompanyChange(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id ? 'bg-brand-50 text-brand-700' : 'text-surface-600 hover:bg-surface-50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="lg:col-span-3 card p-6">
            {/* ---- Branding ---- */}
            {activeTab === 'branding' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Company Branding</h3>
                <p className="text-sm text-surface-500">Colors and logo applied to public viewers, embeds, and SDK.</p>
                <div>
                  <label className="label">Company Name</label>
                  <input type="text" className="input" value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Logo URL</label>
                  <input type="text" className="input" placeholder="https://example.com/logo.svg" value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} />
                  <p className="text-xs text-surface-400 mt-1">Displayed in viewer header</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Primary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                      <input type="text" className="input flex-1" value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="label">Secondary Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={settings.secondaryColor} onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })} className="w-10 h-10 rounded border cursor-pointer" />
                      <input type="text" className="input flex-1" value={settings.secondaryColor} onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="label">Preview</label>
                  <div className="rounded-lg border border-surface-200 overflow-hidden">
                    <div className="h-10 flex items-center px-3 gap-2" style={{ background: settings.primaryColor + '10', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <div className="w-5 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center" style={{ background: settings.primaryColor }}>
                        {settings.brandName.charAt(0)}
                      </div>
                      <span className="text-xs font-semibold text-surface-800">Product Name</span>
                    </div>
                    <div className="h-24 bg-surface-50 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full" style={{ background: settings.primaryColor + '20' }} />
                    </div>
                    <div className="h-8 flex items-center justify-center">
                      <div className="px-4 py-1 rounded-full text-[10px] text-white font-medium" style={{ background: settings.primaryColor }}>
                        View in AR
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Viewer & AR ---- */}
            {activeTab === 'viewer' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Viewer & AR Defaults</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.autoRotate} onChange={(e) => setSettings({ ...settings, autoRotate: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-surface-700">Auto-rotate 3D models</span>
                </label>
                <div>
                  <label className="label">Shadow Intensity (0–2)</label>
                  <input type="number" className="input w-32" min="0" max="2" step="0.1" value={settings.shadowIntensity} onChange={(e) => setSettings({ ...settings, shadowIntensity: parseFloat(e.target.value) })} />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.arEnabled} onChange={(e) => setSettings({ ...settings, arEnabled: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-surface-700">Enable AR features (WebXR, Scene Viewer, Quick Look)</span>
                </label>
              </div>
            )}

            {/* ---- White-Label ---- */}
            {activeTab === 'whitelabel' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">White-Label Settings</h3>
                <p className="text-sm text-surface-500">Control branding on viewer pages, embeds, and SDK.</p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.viewer_hide_branding} onChange={(e) => setSettings({ ...settings, viewer_hide_branding: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <div>
                    <span className="text-sm text-surface-700 font-medium">Hide all AR-core-7 branding</span>
                    <p className="text-xs text-surface-400">Removes &quot;Powered by AR-core-7&quot; footer</p>
                  </div>
                </label>

                <div>
                  <label className="label">Viewer Background</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'gradient', label: 'Gradient', preview: 'linear-gradient(180deg,#f8f9fa,#fff)' },
                      { value: 'white', label: 'White', preview: '#ffffff' },
                      { value: 'dark', label: 'Dark', preview: '#1a1a2e' },
                      { value: 'transparent', label: 'Transparent', preview: 'repeating-conic-gradient(#ddd 0% 25%, transparent 0% 50%) 0 0/16px 16px' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSettings({ ...settings, viewer_background: opt.value })}
                        className={`rounded-lg border-2 p-2 transition-all ${
                          settings.viewer_background === opt.value ? 'border-brand-500' : 'border-surface-200 hover:border-surface-300'
                        }`}
                      >
                        <div className="h-12 rounded-md mb-1.5" style={{ background: opt.preview }} />
                        <p className="text-xs text-center font-medium text-surface-700">{opt.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-200">
                  <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" /> Quick Reference
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs font-medium text-surface-600 mb-1.5">Iframe Embed</p>
                      <code className="text-xs text-surface-800 block break-all">{`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/{slug}" style="width:100%;height:600px;border:0;" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`}</code>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs font-medium text-surface-600 mb-1.5">SDK Embed</p>
                      <code className="text-xs text-surface-800 block break-all whitespace-pre-wrap">{`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/sdk/arcore7-sdk.js"></script>\n<script>ARCore7.mountViewer({ target: "#ar", experienceSlug: "your-slug" })</script>`}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- API Keys ---- */}
            {activeTab === 'apikeys' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-surface-900">API Keys</h3>
                    <p className="text-sm text-surface-500 mt-0.5">Manage keys for the Partner API (v1).</p>
                  </div>
                </div>

                {/* New key secret display */}
                {newKeySecret && (
                  <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800 font-medium">Save this key now. It won&apos;t be shown again.</p>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-white px-3 py-2 rounded border border-amber-200 flex-1 font-mono break-all">{newKeySecret}</code>
                      <button onClick={() => { copyText(newKeySecret); }} className="btn-secondary p-2 flex-shrink-0">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    {copiedKey && <p className="text-xs text-emerald-600 mt-1.5">Copied to clipboard!</p>}
                    <button onClick={() => setNewKeySecret('')} className="text-xs text-amber-700 underline mt-2">
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Create new key */}
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="label">Key Name</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Production Website"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="w-28">
                    <label className="label">Environment</label>
                    <select className="input" value={newKeyEnv} onChange={(e) => setNewKeyEnv(e.target.value as 'live' | 'test')}>
                      <option value="live">Live</option>
                      <option value="test">Test</option>
                    </select>
                  </div>
                  <button
                    onClick={handleCreateKey}
                    disabled={creatingKey || !newKeyName.trim()}
                    className="btn-primary flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" /> {creatingKey ? 'Creating...' : 'Create Key'}
                  </button>
                </div>

                {/* Keys list */}
                <div className="space-y-2">
                  {apiKeys.length === 0 && (
                    <div className="text-center py-8 text-surface-400 text-sm">
                      No API keys yet. Create one to start using the Partner API.
                    </div>
                  )}
                  {apiKeys.map((key) => (
                    <div key={key.id} className={`flex items-center justify-between p-3 rounded-lg border ${key.status === 'REVOKED' ? 'border-red-200 bg-red-50/50 opacity-60' : 'border-surface-200 bg-surface-50'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Key className={`w-4 h-4 flex-shrink-0 ${key.status === 'REVOKED' ? 'text-red-400' : 'text-surface-400'}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-surface-800 truncate">{key.name}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              key.environment === 'LIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {key.environment}
                            </span>
                            {key.status === 'REVOKED' && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700">REVOKED</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <code className="text-[11px] text-surface-500">{key.keyPrefix}...</code>
                            {key.lastUsedAt && (
                              <span className="text-[11px] text-surface-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Last used {formatDateTime(key.lastUsedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {key.status !== 'REVOKED' && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleRevokeKey(key.id)} className="btn-ghost p-1.5 text-surface-400 hover:text-amber-600" title="Revoke">
                            <ShieldOff className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteKey(key.id)} className="btn-ghost p-1.5 text-surface-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Usage hint */}
                <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 mt-4">
                  <p className="text-xs font-medium text-surface-600 mb-1">Usage</p>
                  <code className="text-xs text-surface-800 block break-all">Authorization: Bearer ak_live_...</code>
                  <p className="text-xs text-surface-400 mt-2">Use this header with all <code className="text-surface-600">/api/v1/*</code> endpoints.</p>
                </div>
              </div>
            )}

            {/* ---- Uploads ---- */}
            {activeTab === 'uploads' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Upload Settings</h3>
                <div>
                  <label className="label">Max Upload Size (MB)</label>
                  <input type="number" className="input w-32" value={settings.maxUploadSizeMb} onChange={(e) => setSettings({ ...settings, maxUploadSizeMb: parseInt(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Allowed File Types</label>
                  <input type="text" className="input" value={settings.allowedFileTypes} onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })} />
                  <p className="text-xs text-surface-400 mt-1">Comma-separated extensions</p>
                </div>
              </div>
            )}

            {/* ---- Analytics ---- */}
            {activeTab === 'analytics' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Analytics Settings</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.analyticsEnabled} onChange={(e) => setSettings({ ...settings, analyticsEnabled: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-surface-700">Enable analytics tracking globally</span>
                </label>
                <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="text-sm text-surface-600">Analytics captures page views, AR launches, embed views, and session duration. No personal data is stored.</p>
                </div>
              </div>
            )}

            {/* Save bar (shown for non-api-keys tabs) */}
            {activeTab !== 'apikeys' && (
              <div className="mt-6 pt-4 border-t border-surface-200 flex items-center justify-between">
                {saved && (
                  <span className="text-sm text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Settings saved
                  </span>
                )}
                {!saved && <span />}
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
