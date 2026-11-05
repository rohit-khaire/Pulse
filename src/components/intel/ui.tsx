'use client';

import React from 'react';
import { t3 } from '@/lib/intel/copy';
import type { IntelLang } from '@/lib/intel/types';

export function ModelChip({ lang, label }: { lang: IntelLang; label?: string }) {
  return (
    <span
      title="Simplified simulation. Not a guarantee."
      className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300"
    >
      {label ?? t3(lang, { en: 'Model estimate', hinglish: 'Model ka andaaza', hi: 'मॉडल अनुमान' })}
    </span>
  );
}

export function SampleChip({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-600/60 bg-slate-700/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-300">
      {text}
    </span>
  );
}

interface ShellProps {
  icon: React.ReactNode;
  kicker: string;
  headline: React.ReactNode;
  chip?: React.ReactNode;
  accent?: 'red' | 'emerald' | 'sky' | 'amber';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const ACCENT: Record<NonNullable<ShellProps['accent']>, string> = {
  red: 'border-red-500/30',
  emerald: 'border-emerald-500/30',
  sky: 'border-sky-500/30',
  amber: 'border-amber-500/30',
};

export function CardShell({ icon, kicker, headline, chip, accent = 'red', children, footer }: ShellProps) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border ${ACCENT[accent]} bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-3.5 shadow-xl`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-slate-200">
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{kicker}</div>
            <h4 className="text-[13px] font-bold leading-snug text-white">{headline}</h4>
          </div>
        </div>
        <div className="shrink-0">{chip}</div>
      </div>
      <div className="mt-3">{children}</div>
      {footer ? <div className="mt-3 border-t border-slate-800 pt-2 text-[10px] leading-snug text-slate-500">{footer}</div> : null}
    </section>
  );
}

export function Bone({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-800/80 ${className}`} />;
}

export function CardSkeleton({ rows = 3, height = 'h-16' }: { rows?: number; height?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-2">
        <Bone className="h-7 w-7" />
        <div className="flex-1 space-y-1.5">
          <Bone className="h-2.5 w-1/3" />
          <Bone className="h-3.5 w-2/3" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Bone key={i} className={`${height} w-full`} />
        ))}
      </div>
    </div>
  );
}

export function ProgressHairline({ value }: { value: number }) {
  return (
    <div className="h-0.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full bg-amber-400 transition-[width] duration-300"
        style={{ width: `${Math.max(4, Math.min(100, Math.round(value * 100)))}%` }}
      />
    </div>
  );
}
