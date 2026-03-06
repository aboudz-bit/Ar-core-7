'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/dashboard/Header';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Send, Globe, ExternalLink, Copy, Sparkles } from 'lucide-react';

interface ExperienceRow {
  id: string;
  name: string;
  slug: string;
  experienceType: string;
  publishStatus: string;
  company: { name: string; slug: string };
  product: { title: string } | null;
}

export default function PublishPage() {
  const [experiences, setExperiences] = useState<ExperienceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch('/api/experiences?limit=100');
    const data = await res.json();
    if (data.success) setExperiences(data.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePublish = async (id: string, action: string) => {
    setPublishing(id);
    await fetch('/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ experienceId: id, action }),
    });
    setPublishing(null);
    load();
  };

  if (loading) return <PageLoader />;

  const published = experiences.filter((e) => e.publishStatus === 'PUBLISHED');
  const drafts = experiences.filter((e) => e.publishStatus === 'DRAFT' || e.publishStatus === 'READY');

  return (
    <>
      <Header title="Publish Center" subtitle="Manage publishing status of your experiences" />
      <div className="p-6 space-y-8">
        {/* Published */}
        <div>
          <h3 className="text-base font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-500" /> Published ({published.length})
          </h3>
          {published.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-surface-500">No published experiences</p>
            </div>
          ) : (
            <div className="space-y-3">
              {published.map((exp) => (
                <div key={exp.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusBadge status="PUBLISHED" />
                    <div>
                      <Link href={`/dashboard/experiences/${exp.id}`} className="font-medium text-surface-900 hover:text-brand-600">{exp.name}</Link>
                      <p className="text-xs text-surface-400">{exp.company.name} · {exp.experienceType.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`/ar/${exp.slug}`} target="_blank" className="btn-ghost p-2"><ExternalLink className="w-4 h-4" /></a>
                    <button onClick={() => handlePublish(exp.id, 'unpublish')} className="btn-secondary text-xs py-1.5 px-3" disabled={publishing === exp.id}>
                      Unpublish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drafts */}
        <div>
          <h3 className="text-base font-semibold text-surface-900 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-surface-400" /> Ready to Publish ({drafts.length})
          </h3>
          {drafts.length === 0 ? (
            <EmptyState icon={Sparkles} title="No draft experiences" description="Create experiences to publish them" />
          ) : (
            <div className="space-y-3">
              {drafts.map((exp) => (
                <div key={exp.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <StatusBadge status={exp.publishStatus} />
                    <div>
                      <Link href={`/dashboard/experiences/${exp.id}`} className="font-medium text-surface-900 hover:text-brand-600">{exp.name}</Link>
                      <p className="text-xs text-surface-400">{exp.company.name} · {exp.product?.title || 'No product'}</p>
                    </div>
                  </div>
                  <button onClick={() => handlePublish(exp.id, 'publish')} className="btn-primary text-xs py-1.5 px-3" disabled={publishing === exp.id}>
                    <Send className="w-3 h-3" /> Publish
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
