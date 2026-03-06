'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Eye, Smartphone, Activity, Clock, BarChart3 } from 'lucide-react';

interface AnalyticsData {
  totalViews: number;
  totalArLaunches: number;
  totalSessions: number;
  recentEvents: { date: string; views: number; arLaunches: number }[];
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Page Views" value={data?.totalViews || 0} icon={Eye} subtitle={`Last ${days} days`} />
          <StatsCard title="AR Launches" value={data?.totalArLaunches || 0} icon={Smartphone} subtitle={`Last ${days} days`} />
          <StatsCard title="Tracking Sessions" value={data?.totalSessions || 0} icon={Activity} subtitle="Image target sessions" />
          <StatsCard title="Avg Duration" value="--" icon={Clock} subtitle="Coming soon" />
        </div>

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
