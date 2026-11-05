'use client';

import React from 'react';
import { FlaskConical } from 'lucide-react';
import type { Role } from '@/lib/builder/types';
import { STR } from '@/lib/builder/i18n';
import { usePulseStore } from '@/lib/store';

export const ROLE_STYLE: Record<Role, string> = {
  WK: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  BAT: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  AR: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  BOWL: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export function RoleTag({ role }: { role: Role }) {
  return (
    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold tracking-wide ${ROLE_STYLE[role]}`}>
      {role}
    </span>
  );
}

export function CVBadge({ kind }: { kind: 'C' | 'VC' }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full text-[10px] font-black leading-none px-1.5 h-5 min-w-5 ${
        kind === 'C' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-950'
      }`}
    >
      {kind}
    </span>
  );
}

/** Small amber label that must sit next to every projected number group. */
export function IllustrativeBadge({ className = '' }: { className?: string }) {
  const lang = usePulseStore((s) => s.lang);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300 ${className}`}
    >
      <FlaskConical className="w-3 h-3" />
      {STR[lang].illustrative}
    </span>
  );
}
