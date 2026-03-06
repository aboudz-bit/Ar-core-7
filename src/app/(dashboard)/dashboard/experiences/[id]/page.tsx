'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  ArrowLeft, Save, ExternalLink, Copy, Send, Archive, Eye, Globe, Code, QrCode
} from 'lucide-react';

interface ExperienceDetail {
  id: string;
  name: string;
  slug: string;
  experienceType: string;
  publishStatus: string;
  scale: number;
  lightingPreset: string;
  backgroundMode: string;
  ctaText: string | null;
  ctaLink: string | null;
  analyticsEnabled: boolean;
  company: { id: string; name: string; slug: string };
  product: {
    id: string;
    title: string;
    assets: { id: string; assetType: string; filePath: string; fileName: string }[];
  } | null;
  publishRecords: { id: string; publishStatus: string; publicUrl: string | null; embedSnippet: string | null; publishedAt: string | null }[];
}

export default function ExperienceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [experience, setExperience] = useState<ExperienceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    scale: 1, lightingPreset: 'studio', backgroundMode: 'transparent',
    ctaText: '', ctaLink: '', analyticsEnabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  const load = async () => {
    const res = await fetch(`/api/experiences/${params.id}`);
    const data = await res.json();
    if (data.success) {
      setExperience(data.data);
      setForm({
        scale: data.data.scale,
        lightingPreset: data.data.lightingPreset,
        backgroundMode: data.data.backgroundMode,
        ctaText: data.data.ctaText || '',
        ctaLink: data.data.ctaLink || '',
        analyticsEnabled: data.data.analyticsEnabled,
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [params.id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/experiences/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    load();
  };

  const handlePublish = async (action: string) => {
    setPublishing(true);
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experienceId: params.id, action }),
    });
    setPublishing(false);
    load();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (loading) return <PageLoader />;
  if (!experience) return <div className="p-6">Experience not found</div>;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const publicUrl = `${appUrl}/ar/${experience.slug}`;
  const viewerUrl = experience.product ? `${appUrl}/viewer/${experience.company.slug}/${experience.product.title.toLowerCase().replace(/\s+/g, '-')}` : null;

  return (
    <>
      <Header title={experience.name} subtitle={`${experience.experienceType.replace(/_/g, ' ')} · ${experience.company.name}`} />
      <div className="p-6 space-y-6">
        <button onClick={() => router.push('/dashboard/experiences')} className="btn-ghost text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Experiences
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6">
              <h3 className="font-semibold text-surface-900 mb-4">Experience Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Scale</label>
                  <input type="number" className="input" step="0.1" min="0.1" max="10" value={form.scale} onChange={(e) => setForm({ ...form, scale: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <label className="label">Lighting Preset</label>
                  <select className="input" value={form.lightingPreset} onChange={(e) => setForm({ ...form, lightingPreset: e.target.value })}>
                    <option value="studio">Studio</option>
                    <option value="outdoor">Outdoor</option>
                    <option value="neutral">Neutral</option>
                    <option value="warm">Warm</option>
                    <option value="cool">Cool</option>
                  </select>
                </div>
                <div>
                  <label className="label">Background Mode</label>
                  <select className="input" value={form.backgroundMode} onChange={(e) => setForm({ ...form, backgroundMode: e.target.value })}>
                    <option value="transparent">Transparent</option>
                    <option value="white">White</option>
                    <option value="dark">Dark</option>
                    <option value="gradient">Gradient</option>
                  </select>
                </div>
                <div>
                  <label className="label">Analytics</label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={form.analyticsEnabled} onChange={(e) => setForm({ ...form, analyticsEnabled: e.target.checked })} className="w-4 h-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500" />
                    <span className="text-sm text-surface-700">Enable tracking</span>
                  </label>
                </div>
                <div>
                  <label className="label">CTA Button Text</label>
                  <input type="text" className="input" placeholder="Buy Now" value={form.ctaText} onChange={(e) => setForm({ ...form, ctaText: e.target.value })} />
                </div>
                <div>
                  <label className="label">CTA Link</label>
                  <input type="url" className="input" placeholder="https://shop.example.com" value={form.ctaLink} onChange={(e) => setForm({ ...form, ctaLink: e.target.value })} />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={handleSave} className="btn-primary" disabled={saving}>
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Preview */}
            {experience.product && (
              <div className="card p-6">
                <h3 className="font-semibold text-surface-900 mb-4">Linked Product</h3>
                <div className="flex items-center gap-4 p-4 rounded-lg bg-surface-50">
                  <div className="w-16 h-16 rounded-lg bg-surface-200 flex items-center justify-center">
                    <Eye className="w-6 h-6 text-surface-400" />
                  </div>
                  <div>
                    <p className="font-medium text-surface-900">{experience.product.title}</p>
                    <p className="text-sm text-surface-500">{experience.product.assets.length} assets</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status & Publishing */}
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="font-semibold text-surface-900 mb-4">Publish Status</h3>
              <div className="flex items-center gap-3 mb-4">
                <StatusBadge status={experience.publishStatus} />
                <span className="text-sm text-surface-500">{experience.slug}</span>
              </div>
              <div className="space-y-2">
                {experience.publishStatus !== 'PUBLISHED' && (
                  <button onClick={() => handlePublish('publish')} className="btn-primary w-full" disabled={publishing}>
                    <Send className="w-4 h-4" /> Publish
                  </button>
                )}
                {experience.publishStatus === 'PUBLISHED' && (
                  <button onClick={() => handlePublish('unpublish')} className="btn-secondary w-full" disabled={publishing}>
                    Unpublish
                  </button>
                )}
                {experience.publishStatus !== 'ARCHIVED' && (
                  <button onClick={() => handlePublish('archive')} className="btn-ghost w-full text-amber-600" disabled={publishing}>
                    <Archive className="w-4 h-4" /> Archive
                  </button>
                )}
              </div>
            </div>

            {experience.publishStatus === 'PUBLISHED' && (
              <div className="card p-5">
                <h3 className="font-semibold text-surface-900 mb-4">Share Links</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Public URL</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-surface-50 px-2 py-1.5 rounded flex-1 truncate">{publicUrl}</code>
                      <button onClick={() => copyToClipboard(publicUrl, 'url')} className="btn-ghost p-1.5">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a href={publicUrl} target="_blank" className="btn-ghost p-1.5">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    {copied === 'url' && <p className="text-xs text-emerald-600 mt-1">Copied!</p>}
                  </div>

                  {viewerUrl && (
                    <div>
                      <p className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> Viewer URL</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-surface-50 px-2 py-1.5 rounded flex-1 truncate">{viewerUrl}</code>
                        <button onClick={() => copyToClipboard(viewerUrl, 'viewer')} className="btn-ghost p-1.5">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {copied === 'viewer' && <p className="text-xs text-emerald-600 mt-1">Copied!</p>}
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1"><Code className="w-3 h-3" /> Embed</p>
                    <textarea
                      readOnly
                      className="input text-xs h-16 font-mono"
                      value={`<iframe src="${publicUrl}?embed=true" width="100%" height="500" frameborder="0" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`}
                    />
                    <button onClick={() => copyToClipboard(`<iframe src="${publicUrl}?embed=true" width="100%" height="500" frameborder="0" allow="camera; xr-spatial-tracking" allowfullscreen></iframe>`, 'embed')} className="btn-ghost text-xs mt-1">
                      <Copy className="w-3 h-3" /> Copy Embed Code
                    </button>
                    {copied === 'embed' && <p className="text-xs text-emerald-600 mt-1">Copied!</p>}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-1 flex items-center gap-1"><QrCode className="w-3 h-3" /> QR Code</p>
                    <a href={`/qr/${experience.slug}`} target="_blank" className="btn-secondary w-full text-sm">
                      <QrCode className="w-4 h-4" /> Open QR Page
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
