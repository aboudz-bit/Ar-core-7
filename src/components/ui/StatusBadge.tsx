'use client';

import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  DRAFT: 'bg-surface-100 text-surface-600',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  READY: 'bg-blue-100 text-blue-700',
  PUBLISHED: 'bg-emerald-100 text-emerald-700',
  ARCHIVED: 'bg-amber-100 text-amber-700',
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  COMPANY_ADMIN: 'bg-brand-100 text-brand-700',
  CONTENT_MANAGER: 'bg-teal-100 text-teal-700',
  VIEWER: 'bg-surface-100 text-surface-600',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const style = statusStyles[status] || 'bg-surface-100 text-surface-600';
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', style, className)}>
      {label}
    </span>
  );
}
