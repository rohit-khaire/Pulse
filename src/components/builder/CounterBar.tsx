'use client';

import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { getPool, loadRules, fmt } from '@/lib/builder/pool';
import { countsOf, creditsOf } from '@/lib/builder/rulesCheck';
import { preflight } from '@/lib/builder/optimizer';
import { describeError } from '@/lib/builder/errors';
import { STR } from '@/lib/builder/i18n';
import { ROLES } from '@/lib/builder/types';

/** Credit bar + player / team / role counters for the active team (or the locked picks). */
export function CounterBar() {
  const lang = usePulseStore((s) => s.lang);
  const { locks, excludes, overrides, teams, activeIdx, errors } = useBuilderStore();
  const t = STR[lang];
  const rules = loadRules();
  const pool = useMemo(() => getPool(overrides), [overrides]);

  const team = teams[activeIdx];
  const names = team ? team.xi : locks;
  const players = names.map((n) => pool.find((p) => p.name === n)).filter((p): p is NonNullable<typeof p> => !!p);
  const used = creditsOf(players);
  const { byRole, byTeam } = countsOf(players);
  const over = used > rules.creditBudget;
  const pct = Math.min(100, (used / rules.creditBudget) * 100);

  // live, human-readable problems with the current locks/skips (before pressing Auto-build)
  const live = useMemo(() => {
    try {
      return preflight({ pool, rules, value: () => 0, locks, excludes });
    } catch {
      return [];
    }
  }, [pool, rules, locks, excludes]);
  const problems = [...live, ...errors].filter(
    (e, i, a) => a.findIndex((x) => x.code === e.code && JSON.stringify(x.params) === JSON.stringify(e.params)) === i
  );

  const teamKeys = Array.from(new Set(pool.map((p) => p.teamShort)));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2.5">
      <div>
        <div className="flex items-baseline justify-between text-xs mb-1">
          <span className="font-bold text-slate-300">{t.creditsUsed}</span>
          <span className={`font-mono font-black ${over ? 'text-red-400' : 'text-white'}`}>
            {fmt(used)} / {rules.creditBudget}
            <span className="ml-1.5 font-sans font-medium text-[10px] text-slate-400">
              ({fmt(rules.creditBudget - used)} {t.creditsLeft})
            </span>
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={used} aria-valuemax={rules.creditBudget}>
          <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-gradient-to-r from-red-600 to-amber-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`px-2 py-1 rounded-lg border font-bold ${players.length === rules.teamSize ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-slate-700 text-slate-300 bg-slate-800/60'}`}>
          {t.players} {players.length}/{rules.teamSize}
        </span>
        {teamKeys.map((k) => (
          <span key={k} className={`px-2 py-1 rounded-lg border font-bold ${(byTeam[k] ?? 0) > rules.maxPerTeam ? 'border-red-500/50 text-red-300 bg-red-500/10' : 'border-slate-700 text-slate-300 bg-slate-800/60'}`}>
            {k} {byTeam[k] ?? 0}
            <span className="font-medium text-slate-500"> (max {rules.maxPerTeam})</span>
          </span>
        ))}
        {ROLES.map((r) => {
          const { min, max } = rules.roles[r];
          const bad = byRole[r] > max || (players.length === rules.teamSize && byRole[r] < min);
          return (
            <span key={r} className={`px-2 py-1 rounded-lg border font-bold ${bad ? 'border-red-500/50 text-red-300 bg-red-500/10' : 'border-slate-700 text-slate-300 bg-slate-800/60'}`}>
              {r} {byRole[r]}
              <span className="font-medium text-slate-500"> ({min}-{max})</span>
            </span>
          );
        })}
      </div>

      {problems.length > 0 && (
        <ul className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 space-y-1" role="alert">
          {problems.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-red-200">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{describeError(e, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
