'use client';

import React, { useMemo } from 'react';
import { Lock, Unlock, Ban, Undo2 } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { getPool, fmt } from '@/lib/builder/pool';
import { STR } from '@/lib/builder/i18n';
import { ROLES, type Role } from '@/lib/builder/types';
import { CVBadge, RoleTag } from './ui';

/** Squad list: role tabs, tap Lock / Skip. 44px tap targets, thumb-friendly. */
export function SquadList() {
  const lang = usePulseStore((s) => s.lang);
  const t = STR[lang];
  const { overrides, locks, excludes, roleFilter, setRoleFilter, toggleLock, toggleExclude, teams, activeIdx, openSheet } = useBuilderStore();
  const pool = useMemo(() => getPool(overrides), [overrides]);
  const team = teams[activeIdx];

  const list = useMemo(
    () =>
      pool
        .filter((p) => roleFilter === 'ALL' || p.role === roleFilter)
        .sort((a, b) => b.projection.expectedPoints - a.projection.expectedPoints || (a.name < b.name ? -1 : 1)),
    [pool, roleFilter]
  );

  const tabs: (Role | 'ALL')[] = ['ALL', ...ROLES];
  const countFor = (r: Role | 'ALL') => (r === 'ALL' ? pool.length : pool.filter((p) => p.role === r).length);

  return (
    <section className="space-y-2" aria-label={t.squad}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-white">{t.squad}</h2>
        <span className="text-[10px] text-slate-500">{t.lockedHint}</span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
        {tabs.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`min-h-11 px-3.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors ${
              roleFilter === r ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            {r === 'ALL' ? t.all : r} <span className="opacity-60">{countFor(r)}</span>
          </button>
        ))}
      </div>

      <ul className="space-y-1.5">
        {list.map((p) => {
          const locked = locks.includes(p.name);
          const skipped = excludes.includes(p.name);
          const inTeam = !!team && team.xi.includes(p.name);
          const slot = team?.c === p.name ? 'C' : team?.vc === p.name ? 'VC' : null;
          return (
            <li
              key={p.name}
              className={`flex items-center gap-2 rounded-2xl border p-2 pl-3 ${
                locked ? 'border-amber-400/60 bg-amber-400/5' : inTeam ? 'border-red-500/40 bg-red-500/5' : 'border-slate-800 bg-slate-900/60'
              } ${skipped ? 'opacity-50' : ''}`}
            >
              <button
                onClick={() => (team && inTeam ? openSheet(p.name) : undefined)}
                className="flex-1 min-w-0 text-left min-h-11"
                aria-label={p.name}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`font-bold text-sm text-white truncate ${skipped ? 'line-through' : ''}`}>{p.name}</span>
                  {slot && <CVBadge kind={slot} />}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400">
                  <RoleTag role={p.role} />
                  <span className="font-semibold">{p.teamShort}</span>
                  <span>•</span>
                  <span className="font-mono text-slate-200">{fmt(p.credits)} cr</span>
                  <span>•</span>
                  <span>
                    {t.expected} <span className="font-mono text-slate-200">{fmt(p.projection.expectedPoints)}</span>
                  </span>
                  <span>•</span>
                  <span>
                    {fmt(p.projection.ownershipPct)}%
                  </span>
                </div>
              </button>

              <button
                onClick={() => toggleLock(p.name)}
                aria-pressed={locked}
                aria-label={locked ? t.unlock : t.lock}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors ${
                  locked ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </button>
              <button
                onClick={() => toggleExclude(p.name)}
                aria-pressed={skipped}
                aria-label={skipped ? t.include : t.exclude}
                className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-colors ${
                  skipped ? 'bg-red-600 text-white border-red-500' : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {skipped ? <Undo2 className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
