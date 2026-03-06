'use client';

import { Bell, Search } from 'lucide-react';

export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="h-16 border-b border-surface-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-surface-900">{title}</h1>
        {subtitle && <p className="text-xs text-surface-500">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2 border border-surface-200">
          <Search className="w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-surface-700 placeholder:text-surface-400 focus:outline-none w-40"
          />
        </div>
        <button className="p-2 rounded-lg hover:bg-surface-50 relative transition-colors">
          <Bell className="w-5 h-5 text-surface-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
        </button>
        <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-white">A</span>
        </div>
      </div>
    </header>
  );
}
