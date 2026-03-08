'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Package,
  FileImage,
  Sparkles,
  Send,
  BarChart3,
  Settings,
  LogOut,
  Box,
  ChevronLeft,
  Menu,
  BookOpen,
  Shirt,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Companies', href: '/dashboard/companies', icon: Building2 },
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Merchant Products', href: '/dashboard/merchant-products', icon: Shirt },
  { label: 'Assets', href: '/dashboard/assets', icon: FileImage },
  { label: 'Experiences', href: '/dashboard/experiences', icon: Sparkles },
  { label: 'Publish Center', href: '/dashboard/publish', icon: Send },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Integration Docs', href: '/dashboard/docs', icon: BookOpen },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md border border-surface-200"
        onClick={() => setCollapsed(!collapsed)}
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 bg-white border-r border-surface-200 flex flex-col transition-all duration-300',
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'w-64',
          'lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-100 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-brand-600 to-brand-400 rounded-xl flex items-center justify-center flex-shrink-0">
            <Box className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-surface-900 leading-none">AR-core-7</h1>
              <p className="text-[10px] text-surface-400 mt-0.5 uppercase tracking-wider">Platform</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1 rounded-md hover:bg-surface-100 transition-colors"
          >
            <ChevronLeft className={cn('w-4 h-4 text-surface-400 transition-transform', collapsed && 'rotate-180')} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={cn('w-5 h-5 flex-shrink-0', isActive ? 'text-brand-600' : 'text-surface-400')} />
                    {!collapsed && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-surface-100">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-500 hover:bg-red-50 hover:text-red-600 transition-all w-full"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>
    </>
  );
}
