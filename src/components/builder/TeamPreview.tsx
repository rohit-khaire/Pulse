'use client';

import React, { useMemo } from 'react';
import { Info, Sparkles } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { getPool, fmt } from '@/lib/builder/pool';
import { STR } from '@/lib/builder/i18n';
import { ROLES } from '@/lib/builder/types';
import { CVBadge, IllustrativeBadge, ROLE_STYLE } from './ui';
import { useExplain } from './useExplain';

/** The generated XI: tabs for up to 3 different teams, C/VC badges, totals, tap a player to ask why. */
export function TeamPreview() {
  const lang = usePulseStore((s) => s.lang);
  const t = STR[lang];
  const { teams, activeIdx, setActive, overrides, openSheet, fewerTeams } = useBuilderStore();
  const pool = useMemo(() => getPool(overrides), [overrides]);
  const team = teams[activeIdx];
  const summary = useExplain(team);

  if (!team) return null;
  const byName = new Map(pool.map((p) => [p.name, p]));

  return (
    <section className="space-y-2.5" aria-label={t.team}>
      {teams.length > 1 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-400 mr-1">{t.moreTeams}</span>
          {teams.map((tm, i) => (
            <button
              key={tm.id}
              onClick={() => setActive(i)}
              className={`min-h-11 px-4 rounded-xl text-xs font-extrabold border ${
                i === activeIdx ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
              }`}
            >
              {t.team} {i + 1}
            </button>
          ))}
        </div>
      )}
      {fewerTeams && <p className="text-[11px] text-amber-300">{t.fewer}</p>}

      <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t.teamTotal}</div>
            <div className="text-2xl font-black text-white">
              {fmt(team.totals.expectedWithCaptains)} <span className="text-xs font-semibold text-slate-400">pts</span>
            </div>
            <div className="text-[11px] text-slate-400">
              {t.badDay} {fmt(team.totals.floor)} · {t.greatDay} {fmt(team.totals.ceiling)} · {t.ownership} {fmt(team.totals.avgOwnership)}%
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <div className="font-mono font-black text-white text-sm">{fmt(team.creditsUsed)} cr</div>
          </div>
        </div>
        <IllustrativeBadge />

        {ROLES.map((r) => {
          const rows = team.xi.map((n) => byName.get(n)!).filter((p) => p && p.role === r);
          if (!rows.length) return null;
          return (
            <div key={r}>
              <div className={`inline-block mb-1 px-2 py-0.5 rounded-md border text-[10px] font-extrabold ${ROLE_STYLE[r]}`}>{r}</div>
              <div className="grid grid-cols-2 gap-1.5">
                {rows.map((p) => {
                  const slot = team.c === p.name ? 'C' : team.vc === p.name ? 'VC' : null;
                  return (
                    <button
                      key={p.name}
                      onClick={() => openSheet(p.name)}
                      className="relative min-h-14 text-left rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-2 active:scale-[0.98] transition-transform"
                    >
                      {slot && (
                        <span className="absolute -top-2 -right-1">
                          <CVBadge kind={slot} />
                        </span>
                      )}
                      <div className="text-[13px] font-bold text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {p.teamShort} · {fmt(p.credits)} cr · <span className="text-slate-200 font-mono">{fmt(p.projection.expectedPoints)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            <Sparkles className="w-3 h-3 text-red-400" />
            {summary.loading ? t.thinking : summary.source === 'ai' ? t.aiLine : t.templateLine}
          </div>
          <p className="text-xs leading-relaxed text-slate-200">{summary.text}</p>
        </div>
        <button
          onClick={() => openSheet(team.c)}
          className="w-full min-h-11 rounded-xl border border-slate-700 bg-slate-800/70 text-xs font-bold text-slate-100 flex items-center justify-center gap-1.5"
        >
          <Info className="w-4 h-4" />
          {t.whyPick}
        </button>
      </div>
    </section>
  );
}
