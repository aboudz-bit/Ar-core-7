'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/dashboard/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { Building2, Package, Sparkles, Eye, Smartphone, BarChart3, TrendingUp, Activity } from 'lucide-react';
import { PageLoader } from '@/components/ui/LoadingSpinner';

interface DashboardData {
  companies: number;
  products: number;
  experiences: number;
  published: number;
  analytics: {
    totalViews: number;
    totalArLaunches: number;
    totalSessions: number;
    recentEvents: { date: string; views: number; arLaunches: number }[];
  };
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [companiesRes, productsRes, experiencesRes, analyticsRes] = await Promise.all([
          fetch('/api/companies?limit=1'),
          fetch('/api/products?limit=1'),
          fetch('/api/experiences?limit=1'),
          fetch('/api/analytics?days=30'),
        ]);

        const [companies, products, experiences, analytics] = await Promise.all([
          companiesRes.json(),
          productsRes.json(),
          experiencesRes.json(),
          analyticsRes.json(),
        ]);

        setData({
          companies: companies.meta?.total || 0,
          products: products.meta?.total || 0,
          experiences: experiences.meta?.total || 0,
          published: 0,
          analytics: analytics.data || { totalViews: 0, totalArLaunches: 0, totalSessions: 0, recentEvents: [] },
        });
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <PageLoader />;

  return (
    <>
      <Header title="Overview" subtitle="Welcome to AR-core-7 Platform" />
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Companies" value={data?.companies || 0} icon={Building2} subtitle="Active workspaces" />
          <StatsCard title="Products" value={data?.products || 0} icon={Package} subtitle="Total catalog items" />
          <StatsCard title="Experiences" value={data?.experiences || 0} icon={Sparkles} subtitle="AR experiences" />
          <StatsCard title="Page Views" value={data?.analytics.totalViews || 0} icon={Eye} subtitle="Last 30 days" trend={{ value: 12, label: 'vs last month' }} />
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="AR Launches" value={data?.analytics.totalArLaunches || 0} icon={Smartphone} subtitle="Last 30 days" />
          <StatsCard title="Tracking Sessions" value={data?.analytics.totalSessions || 0} icon={Activity} subtitle="Image target sessions" />
          <StatsCard title="Engagement Rate" value="--" icon={TrendingUp} subtitle="Coming soon" />
        </div>

        {/* Activity chart placeholder */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-surface-900">Activity Overview</h3>
              <p className="text-sm text-surface-500">Views and AR launches over time</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-brand-500" />
                <span className="text-xs text-surface-500">Views</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-surface-500">AR Launches</span>
              </div>
            </div>
          </div>
          {data?.analytics.recentEvents && data.analytics.recentEvents.length > 0 ? (
            <div className="h-64 flex items-end gap-1">
              {data.analytics.recentEvents.map((event, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col gap-0.5">
                    <div
                      className="w-full bg-brand-400 rounded-t"
                      style={{ height: `${Math.max(event.views * 4, 4)}px` }}
                    />
                    <div
                      className="w-full bg-emerald-400 rounded-b"
                      style={{ height: `${Math.max(event.arLaunches * 4, 2)}px` }}
                    />
                  </div>
                  <span className="text-[9px] text-surface-400 rotate-45 origin-left">
                    {event.date.slice(5)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-surface-300 mx-auto mb-3" />
                <p className="text-sm text-surface-500">Analytics data will appear here</p>
                <p className="text-xs text-surface-400">Publish experiences to start tracking</p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/dashboard/products" className="card-hover p-5 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <Package className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-900">Add Product</h4>
                <p className="text-xs text-surface-500">Upload 3D models and assets</p>
              </div>
            </div>
          </a>
          <a href="/dashboard/experiences" className="card-hover p-5 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-900">Create Experience</h4>
                <p className="text-xs text-surface-500">Build AR viewer or tracking</p>
              </div>
            </div>
          </a>
          <a href="/dashboard/analytics" className="card-hover p-5 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-surface-900">View Analytics</h4>
                <p className="text-xs text-surface-500">Track engagement and views</p>
              </div>
            </div>
          </a>
        </div>
      </div>
    </>
  );
}
