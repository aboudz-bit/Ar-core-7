'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Save, Palette, Eye, Upload, Globe, BarChart3, CheckCircle, ExternalLink, Code } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('branding');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string; slug: string; brandPrimary: string; brandSecondary: string; logoUrl: string | null }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

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
    // White-label viewer settings
    viewer_hide_branding: false,
    viewer_background: 'gradient',
  });

  useEffect(() => {
    fetch('/api/companies').then((r) => r.json()).then((d) => {
      if (d.success && d.data.length > 0) {
        setCompanies(d.data);
        setSelectedCompanyId(d.data[0].id);
        loadCompanySettings(d.data[0]);
      }
    });
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
    if (company) loadCompanySettings(company);
  };

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setSaving(true);

    // Save company branding via PATCH
    await fetch(`/api/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _update: selectedCompanyId }),
    }).catch(() => {});

    // Save viewer settings to settings table
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

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'viewer', label: 'Viewer & AR', icon: Eye },
    { id: 'whitelabel', label: 'White-Label', icon: Globe },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  return (
    <>
      <Header title="Settings" subtitle="Company & viewer configuration" />
      <div className="p-6">
        {/* Company selector */}
        {companies.length > 1 && (
          <div className="mb-6">
            <label className="label">Company</label>
            <select className="input max-w-xs" value={selectedCompanyId} onChange={(e) => handleCompanyChange(e.target.value)}>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs */}
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

          {/* Content */}
          <div className="lg:col-span-3 card p-6">
            {activeTab === 'branding' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Company Branding</h3>
                <p className="text-sm text-surface-500">These colors and logo appear on all public viewer pages and embeds.</p>
                <div>
                  <label className="label">Company Name</label>
                  <input type="text" className="input" value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Logo URL</label>
                  <input type="text" className="input" placeholder="https://example.com/logo.svg" value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} />
                  <p className="text-xs text-surface-400 mt-1">Displayed in viewer header when available</p>
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
                {/* Preview */}
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

            {activeTab === 'viewer' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Viewer & AR Defaults</h3>
                <p className="text-sm text-surface-500">Default settings for all viewer and AR experiences.</p>
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

            {activeTab === 'whitelabel' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">White-Label Settings</h3>
                <p className="text-sm text-surface-500">Control branding on public viewer pages, embeds, and launch URLs.</p>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.viewer_hide_branding} onChange={(e) => setSettings({ ...settings, viewer_hide_branding: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <div>
                    <span className="text-sm text-surface-700 font-medium">Hide all AR-core-7 branding</span>
                    <p className="text-xs text-surface-400">Removes &quot;Powered by AR-core-7&quot; footer and platform branding</p>
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

                {/* Embed integration guide */}
                <div className="pt-4 border-t border-surface-200">
                  <h4 className="text-sm font-semibold text-surface-900 mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" /> Integration Guide
                  </h4>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs font-medium text-surface-600 mb-1.5">Iframe Embed</p>
                      <code className="text-xs text-surface-800 block break-all">{`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed/{slug}" style="width:100%;height:600px;border:0;" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`}</code>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs font-medium text-surface-600 mb-1.5">Direct AR Launch</p>
                      <code className="text-xs text-surface-800 block break-all">{`${typeof window !== 'undefined' ? window.location.origin : ''}/launch/{experience-slug}`}</code>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs font-medium text-surface-600 mb-1.5">Product-Based AR</p>
                      <code className="text-xs text-surface-800 block break-all">{`${typeof window !== 'undefined' ? window.location.origin : ''}/product/{product-slug}/ar`}</code>
                    </div>
                    <div className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                      <p className="text-xs font-medium text-surface-600 mb-1.5">Public API</p>
                      <code className="text-xs text-surface-800 block break-all">{`GET /api/public/experiences/{slug}`}</code>
                      <code className="text-xs text-surface-800 block break-all mt-1">{`GET /api/public/products/{slug}`}</code>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </>
  );
}
