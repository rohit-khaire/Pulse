'use client';

import React, { useMemo } from 'react';
import { X, Sparkles } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { getPool, fmt } from '@/lib/builder/pool';
import { pickReason } from '@/lib/builder/explainTemplates';
import { STR } from '@/lib/builder/i18n';
import { CVBadge, IllustrativeBadge, RoleTag } from './ui';
import { useExplain } from './useExplain';

/** Bottom sheet: facts for one pick, a deterministic one-liner, and an AI-narrated explanation. */
export function WhyPickSheet() {
  const lang = usePulseStore((s) => s.lang);
  const t = STR[lang];
  const { sheetPlayer, openSheet, teams, activeIdx, overrides } = useBuilderStore();
  const team = teams[activeIdx];
  const open = !!sheetPlayer && !!team && team.xi.includes(sheetPlayer);
  const explain = useExplain(open ? team : undefined, open ? sheetPlayer! : undefined);
  const pool = useMemo(() => getPool(overrides), [overrides]);

  if (!open || !team || !sheetPlayer) return null;
  const p = pool.find((x) => x.name === sheetPlayer);
  if (!p) return null;
  const slot = team.c === p.name ? 'C' : team.vc === p.name ? 'VC' : null;
  const facts = explain.facts;
  const line = facts ? facts.picks.find((x) => x.name === p.name) : undefined;
  const reason = facts && line ? pickReason(line, facts, lang) : '';

  const metric = (label: string, value: string) => (
    <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2 text-center">
      <div className="text-[10px] text-slate-500 font-bold uppercase">{label}</div>
      <div className="font-mono font-black text-white text-base">{value}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => openSheet(null)}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-slate-900 p-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-white">{p.name}</h3>
              {slot && <CVBadge kind={slot} />}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <RoleTag role={p.role} /> {p.teamShort} · {fmt(p.credits)} cr
              {slot && <span className="text-amber-300 font-semibold">· {slot === 'C' ? `${t.captain} 2x` : `${t.vc} 1.5x`}</span>}
            </div>
          </div>
          <button onClick={() => openSheet(null)} aria-label={t.close} className="w-11 h-11 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {metric(t.expected, fmt(p.projection.expectedPoints))}
          {metric(t.badDay, fmt(p.projection.floor))}
          {metric(t.greatDay, fmt(p.projection.ceiling))}
          {metric(t.ownership, `${fmt(p.projection.ownershipPct)}%`)}
        </div>
        <IllustrativeBadge />

        {reason && <p className="text-sm text-slate-100 leading-relaxed font-medium">{reason}</p>}

        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Sparkles className="w-3 h-3 text-red-400" />
            {explain.loading ? t.thinking : explain.source === 'ai' ? t.aiLine : t.templateLine}
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">{explain.text}</p>
        </div>

        <p className="text-[10px] text-slate-500">{t.disclaimer}</p>
      </div>
    </div>
  );
}
