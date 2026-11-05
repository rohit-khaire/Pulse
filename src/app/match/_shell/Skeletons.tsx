import React from 'react';

export type SkeletonKind = 'card' | 'strip' | 'button' | 'none';

/** Shimmer placeholder. Fixed heights so late-loading plug-ins never shift the layout. */
export function Skeleton({ kind = 'card', label }: { kind?: SkeletonKind; label?: string }) {
  if (kind === 'none') return null;
  const size =
    kind === 'strip'
      ? 'h-16 rounded-xl'
      : kind === 'button'
      ? 'h-11 w-28 rounded-full'
      : 'h-28 rounded-2xl';
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label ? `Loading ${label}` : 'Loading'}
      className={`pulse-skeleton ${size} border border-slate-800 bg-slate-900/70`}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-md mx-auto w-full px-4 pt-4 space-y-3" aria-busy="true">
      <div className="pulse-skeleton h-24 rounded-2xl border border-slate-800 bg-slate-900/70" />
      <div className="pulse-skeleton h-10 rounded-xl border border-slate-800 bg-slate-900/70" />
      <div className="pulse-skeleton h-32 rounded-2xl border border-slate-800 bg-slate-900/70" />
      <div className="pulse-skeleton h-10 rounded-xl border border-slate-800 bg-slate-900/70" />
      <div className="pulse-skeleton h-28 rounded-2xl border border-slate-800 bg-slate-900/70" />
    </div>
  );
}
