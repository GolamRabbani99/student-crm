import type { ReactNode } from 'react';

export const badgeColors: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  orange: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  pink: 'bg-pink-50 text-pink-700 ring-pink-600/20',
  lime: 'bg-lime-50 text-lime-700 ring-lime-600/20',
};

export const dotColors: Record<string, string> = {
  slate: 'bg-slate-400',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  orange: 'bg-orange-500',
  cyan: 'bg-cyan-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
  pink: 'bg-pink-500',
  lime: 'bg-lime-500',
};

export const chartColors: Record<string, string> = {
  slate: '#94a3b8',
  amber: '#f59e0b',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  orange: '#f97316',
  cyan: '#06b6d4',
  emerald: '#10b981',
  rose: '#f43f5e',
  pink: '#ec4899',
  lime: '#84cc16',
};

export const COLOR_OPTIONS = Object.keys(chartColors);

export function StatusBadge({ name, color }: { name?: string | null; color?: string | null }) {
  if (!name) return <span className="text-sm text-slate-400">—</span>;
  const classes = badgeColors[color ?? 'slate'] ?? badgeColors.slate;
  const dot = dotColors[color ?? 'slate'] ?? dotColors.slate;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${classes}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {name}
    </span>
  );
}

const AVATAR_BG = ['bg-blue-600', 'bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-cyan-600'];

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const bg = AVATAR_BG[name.length % AVATAR_BG.length];
  const sizes = { sm: 'h-7 w-7 text-[10px]', md: 'h-9 w-9 text-xs', lg: 'h-12 w-12 text-base' };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${bg} ${sizes[size]}`}>
      {initials}
    </span>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className={`mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} rounded-2xl bg-white p-6 shadow-2xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
      <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p className="mt-3 text-sm font-medium text-slate-600">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
      {message}
    </div>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export const primaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60';

export const secondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400/30';

export const dangerBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/40';

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
