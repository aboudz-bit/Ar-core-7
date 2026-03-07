'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Eye, Smartphone, Activity, Clock, BarChart3, Monitor, Globe, Link2, Trophy } from 'lucide-react';

interface BreakdownItem {
  label: string;
  count: number;
}

interface TopExperience {
  id: string;
  name: string;
  slug: string;
  count: number;
}

interface TopProduct {
  id: string;
  name: string;
  count: number;
}

interface AnalyticsData {
  totalViews: number;
  totalArLaunches: number;
  totalSessions: number;
  recentEvents: { date: string; views: number; arLaunches: number }[];
  deviceBreakdown: BreakdownItem[];
  browserBreakdown: BreakdownItem[];
  sourceBreakdown: BreakdownItem[];
  topExperiences: TopExperience[];
  topProducts: TopProduct[];
}

function BreakdownCard({ title, icon: Icon, items }: { title: string; icon: typeof Monitor; items: BreakdownItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0) || 1;
  const colors = ['bg-brand-500', 'bg-emerald-500', 'bg-amber-500', 'bg-violet-500', 'bg-rose-500'];

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-surface-500" />
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.slice(0, 5).map((item, i) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-surface-700 capitalize">{item.label}</span>
                <span className="text-surface-500">{item.count} ({Math.round((item.count / total) * 100)}%)</span>
              </div>
              <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${colors[i % colors.length]}`}
                  style={{ width: `${Math.round((item.count / total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-surface-400 text-center py-4">No data yet</p>
      )}
    </div>
  );
}

function RankingCard({ title, icon: Icon, items }: { title: string; icon: typeof Trophy; items: { name: string; count: number }[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-surface-500" />
        <h3 className="text-sm font-semibold text-surface-900">{title}</h3>
      </div>
      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-surface-50 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-surface-400 w-5">{i + 1}.</span>
                <span className="text-sm text-surface-700 truncate max-w-[180px]">{item.name}</span>
              </div>
              <span className="text-xs font-medium text-surface-500">{item.count} events</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-surface-400 text-center py-4">No data yet</p>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetch(`/api/analytics?days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data);
        setLoading(false);
      });
  }, [days]);

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Analytics" subtitle="Track engagement across all experiences" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => { setLoading(true); setDays(d); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                days === d ? 'bg-brand-600 text-white' : 'bg-white border border-surface-200 text-surface-600 hover:bg-surface-50'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Page Views" value={data?.totalViews || 0} icon={Eye} subtitle={`Last ${days} days`} />
          <StatsCard title="AR Launches" value={data?.totalArLaunches || 0} icon={Smartphone} subtitle={`Last ${days} days`} />
          <StatsCard title="Tracking Sessions" value={data?.totalSessions || 0} icon={Activity} subtitle="Image target sessions" />
          <StatsCard title="Avg Duration" value="--" icon={Clock} subtitle="Coming soon" />
        </div>

        {/* Breakdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BreakdownCard title="Device Breakdown" icon={Monitor} items={data?.deviceBreakdown || []} />
          <BreakdownCard title="Browser Breakdown" icon={Globe} items={data?.browserBreakdown || []} />
          <BreakdownCard title="Launch Source" icon={Link2} items={data?.sourceBreakdown || []} />
        </div>

        {/* Top Performers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RankingCard title="Top Experiences" icon={Trophy} items={data?.topExperiences || []} />
          <RankingCard title="Top Products" icon={BarChart3} items={data?.topProducts || []} />
        </div>

        {/* Daily Activity Chart */}
        <div className="card p-6">
          <h3 className="text-base font-semibold text-surface-900 mb-6">Daily Activity</h3>
          {data?.recentEvents && data.recentEvents.length > 0 ? (
            <div className="space-y-2">
              {data.recentEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="text-xs text-surface-500 w-20">{event.date.slice(5)}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-6 bg-surface-50 rounded-lg overflow-hidden flex">
                      <div className="bg-brand-400 h-full rounded-l transition-all" style={{ width: `${Math.min(event.views * 5, 100)}%` }} />
                      <div className="bg-emerald-400 h-full rounded-r transition-all" style={{ width: `${Math.min(event.arLaunches * 5, 50)}%` }} />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-brand-600">{event.views} views</span>
                      <span className="text-emerald-600">{event.arLaunches} AR</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center">
              <BarChart3 className="w-12 h-12 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500">No analytics data yet</p>
              <p className="text-xs text-surface-400 mt-1">Publish and share experiences to start tracking</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
