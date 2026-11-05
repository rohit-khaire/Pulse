'use client';

import React from 'react';

export function SocialSkeleton({ lines = 3, label }: { lines?: number; label: string }) {
  return (
    <div
      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 space-y-2 animate-pulse"
      aria-busy="true"
      aria-label={`${label} loading`}
    >
      <div className="h-4 w-1/3 rounded bg-slate-800" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-8 rounded-xl bg-slate-800/70" />
      ))}
    </div>
  );
}

export function DemoBadge({ children = 'Demo friends' }: { children?: React.ReactNode }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-extrabold uppercase tracking-wider"
      title="Simulated friends built from sample data. Not real people."
    >
      {children}
    </span>
  );
}

export const RESPONSIBLE_NOTE = 'Entertainment only. Not betting or winning advice.';
