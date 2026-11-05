'use client';

import React, { useState } from 'react';
import { History, Loader2, Trophy } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { getPool, loadRules, fmt } from '@/lib/builder/pool';
import { runBacktest } from '@/lib/builder/backtest';
import { STR } from '@/lib/builder/i18n';
import { loadFeaturedMatch } from '@/lib/match-loader';
import { buildTimeline } from '@/lib/engine/timeline';
import type { Frame } from '@/lib/engine/types';

/** "How would this have done?": hindsight on the replayed match, using the existing points engine. */
export function BacktestCard() {
  const lang = usePulseStore((s) => s.lang);
  const frames = usePulseStore((s) => s.frames);
  const config = usePulseStore((s) => s.config);
  const t = STR[lang];
  const { teams, activeIdx, overrides, backtests, saveBacktest } = useBuilderStore();
  const team = teams[activeIdx];
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!team) return null;
  const result = backtests[team.id];

  const run = async () => {
    setBusy(true);
    setFailed(false);
    try {
      let f: Frame[] = frames;
      if (!f.length) {
        // The match page has not been opened yet: build the timeline locally, without touching the main store.
        const match = await loadFeaturedMatch();
        f = buildTimeline(match, config).frames;
      }
      const res = runBacktest({
        frames: f,
        team: { xi: team.xi, c: team.c, vc: team.vc },
        pool: getPool(overrides),
        rules: loadRules(),
        config,
      });
      saveBacktest(team.id, res);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section data-tour="builder-backtest" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2.5">
      <button
        onClick={run}
        disabled={busy}
        className="w-full min-h-12 rounded-xl bg-slate-800 border border-slate-700 text-sm font-extrabold text-white flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4 text-amber-400" />}
        {busy ? t.running : t.backtestBtn}
      </button>
      {failed && <p className="text-xs text-red-300">{t.noBacktestFrames}</p>}

      {result && (
        <div className="space-y-2.5">
          <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-amber-200 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-300">
              <span>⚠️ {t.backtestHindsight}</span>
            </div>
            <p className="text-[10px] text-amber-200/80 leading-relaxed">
              {lang === 'hinglish'
                ? 'Kyun zaroori hai? Ek match par team ko test karna pick variance aur captaincy impact samajhne ke liye helpful hai, par ye future ka guarantee nahi deta (anti-hindsight bias).'
                : lang === 'hi'
                ? 'यह क्यों जरूरी है? एक मैच पर टीम को परखना कप्तानी का असर समझने के लिए उपयोगी है, पर यह भविष्य की गारंटी नहीं देता (एंटी-हाइंडसाइट पूर्वाग्रह)।'
                : 'Why this matters: Testing a squad on past match data helps illustrate captaincy impact and pick variance, but retrospective hindsight is never a guarantee of future contest performance.'}
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{t.totalPts}</div>
              <div className="text-3xl font-black text-white">{fmt(result.total)}</div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end text-amber-300 font-extrabold">
                <Trophy className="w-4 h-4" /> {t.rankOf(result.rank, result.of)}
              </div>
              <div className="text-[10px] text-slate-500">{t.sampleRivals}</div>
            </div>
          </div>

          <ul className="space-y-1">
            {result.leaderboard.map((row, i) => (
              <li
                key={row.id}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs border ${
                  row.isUser ? 'border-red-500/50 bg-red-500/10 text-white font-bold' : 'border-slate-800 bg-slate-950/50 text-slate-300'
                }`}
              >
                <span>
                  {i + 1}. {row.name}
                </span>
                <span className="font-mono">{fmt(row.total)}</span>
              </li>
            ))}
          </ul>

          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{t.bestPick}</div>
              <div className="font-bold text-emerald-300 truncate">{result.best.name}</div>
              <div className="font-mono text-slate-200">{fmt(result.best.totalPts)}</div>
            </div>
            <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-2">
              <div className="text-[10px] text-slate-500 font-bold uppercase">{t.worstPick}</div>
              <div className="font-bold text-rose-300 truncate">{result.worst.name}</div>
              <div className="font-mono text-slate-200">{fmt(result.worst.totalPts)}</div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400">
            {t.hindsightBest}: <span className="font-mono text-slate-200">{fmt(result.hindsight.total)}</span> ({t.pctOfBest(result.pctOfHindsight)})
          </div>
        </div>
      )}
    </section>
  );
}
