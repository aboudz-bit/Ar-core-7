'use client';

import { useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { Save, Palette, Eye, Upload, Globe, BarChart3 } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('branding');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    brandName: 'AR-core-7',
    primaryColor: '#4263eb',
    secondaryColor: '#748ffc',
    autoRotate: true,
    shadowIntensity: 1,
    arEnabled: true,
    maxUploadSizeMb: 50,
    allowedFileTypes: '.glb,.gltf,.usdz,.jpg,.jpeg,.png,.webp',
    analyticsEnabled: true,
    publicBranding: true,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'branding', label: 'Branding', icon: Palette },
    { id: 'viewer', label: 'Viewer Defaults', icon: Eye },
    { id: 'uploads', label: 'Uploads', icon: Upload },
    { id: 'domain', label: 'Domain', icon: Globe },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <>
      <Header title="Settings" subtitle="Platform configuration" />
      <div className="p-6">
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
                <h3 className="font-semibold text-surface-900">Branding</h3>
                <div>
                  <label className="label">Platform Name</label>
                  <input type="text" className="input" value={settings.brandName} onChange={(e) => setSettings({ ...settings, brandName: e.target.value })} />
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
              </div>
            )}

            {activeTab === 'viewer' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Viewer Defaults</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.autoRotate} onChange={(e) => setSettings({ ...settings, autoRotate: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-surface-700">Auto-rotate models by default</span>
                </label>
                <div>
                  <label className="label">Shadow Intensity (0-2)</label>
                  <input type="number" className="input w-32" min="0" max="2" step="0.1" value={settings.shadowIntensity} onChange={(e) => setSettings({ ...settings, shadowIntensity: parseFloat(e.target.value) })} />
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.arEnabled} onChange={(e) => setSettings({ ...settings, arEnabled: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-surface-700">Enable AR features by default</span>
                </label>
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

            {activeTab === 'domain' && (
              <div className="space-y-5">
                <h3 className="font-semibold text-surface-900">Domain Settings</h3>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={settings.publicBranding} onChange={(e) => setSettings({ ...settings, publicBranding: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                  <span className="text-sm text-surface-700">Show platform branding on public pages</span>
                </label>
                <div className="p-4 rounded-lg bg-surface-50 border border-surface-200">
                  <p className="text-sm text-surface-600">Custom domain configuration will be available in a future release. Public pages are currently served under your main domain.</p>
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
                  <p className="text-sm text-surface-600">Analytics tracking captures page views, AR launches, camera permission grants, and session duration. No personal data is stored.</p>
                </div>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-surface-200 flex items-center justify-between">
              {saved && <span className="text-sm text-emerald-600">Settings saved successfully</span>}
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
