'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePulseStore } from '@/lib/store';
import { teamPoints } from '@/lib/engine/points';
import { computeLeaderboard } from '@/lib/engine/league';
import { computeRootFor } from '@/lib/engine/rootfor';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { PointsSparkline } from './PointsSparkline';

export function MyTeamCard() {
  const { frames, cursor, myTeam, config } = usePulseStore();
  const frame = frames[cursor] || frames[0];
  const prevFrame = cursor > 0 ? frames[cursor - 1] : null;

  const [delta, setDelta] = useState<number | null>(null);
  const prevPointsRef = useRef<number>(0);

  // Heavy engine work is memoised on (frame, team) so unrelated re-renders are free.
  const derived = useMemo(() => {
    if (!myTeam || !frame) return null;
    const total = teamPoints(frame.points, myTeam, config).total;
    const entry = computeLeaderboard(frame, prevFrame, myTeam, config).find((e) => e.isUser);
    return {
      total,
      rank: entry?.rank || 1,
      rankDelta: entry?.rankDelta || 0,
      rootFor: computeRootFor(frame, myTeam, config),
    };
  }, [frame, prevFrame, myTeam, config]);
  const currentTotal = derived?.total ?? 0;

  // Delta animation & confetti. (Hooks now run before any early return, and the baseline
  // always advances; the original froze it after the first change.)
  useEffect(() => {
    const diff = Math.round((currentTotal - prevPointsRef.current) * 10) / 10;
    const hadBaseline = prevPointsRef.current > 0;
    prevPointsRef.current = currentTotal;
    if (diff === 0 || !hadBaseline) return;

    setDelta(diff);
    const timer = setTimeout(() => setDelta(null), 2500);

    // Confetti on big jumps (>= 30 pts), loaded on demand, skipped for reduced motion
    if (diff >= 30 && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      import('canvas-confetti')
        .then((m) => m.default({ particleCount: 50, spread: 60, origin: { y: 0.4 } }))
        .catch(() => undefined);
    }
    return () => clearTimeout(timer);
  }, [currentTotal]);

  if (!myTeam || !frame || !derived) return null;
  const userRank = derived.rank;
  const rankDelta = derived.rankDelta;
  const rootFor = derived.rootFor;

  return (
    <section data-tour="team" aria-label="My fantasy team" className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Background glow accent */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-red-600/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 font-medium mb-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>MY FANTASY XI</span>
            <span aria-hidden="true" className="text-slate-600">•</span>
            <span className="text-slate-300 font-semibold">{myTeam.xi.length} players</span>
          </div>

          <div className="flex items-baseline space-x-2.5">
            <motion.span
              key={currentTotal}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="text-3xl font-extrabold text-white tracking-tight"
            >
              {currentTotal}
            </motion.span>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              PTS
            </span>

            {/* Delta Flash */}
            <AnimatePresence>
              {delta !== null && (
                <motion.span
                  initial={{ opacity: 0, y: 6, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6 }}
                  className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                    delta > 0
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  <span>{delta > 0 ? `+${delta}` : delta}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mini-league rank chip & Sparkline */}
        <div className="flex flex-col items-end space-y-2">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3 py-1 text-right">
            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
              League Rank
            </div>
            <div className="flex items-center justify-end space-x-1">
              <span className="text-base font-black text-white">#{userRank}</span>
              <span className="text-xs text-slate-400">/ 5</span>
              {rankDelta > 0 && (
                <span className="flex items-center text-emerald-400 text-xs font-bold ml-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{rankDelta}</span>
                </span>
              )}
              {rankDelta < 0 && (
                <span className="flex items-center text-rose-400 text-xs font-bold ml-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>{Math.abs(rankDelta)}</span>
                </span>
              )}
            </div>
          </div>
          <PointsSparkline />
        </div>
      </div>

      {/* Root For Chip (F7) */}
      {rootFor.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center space-x-2 text-xs">
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 font-semibold text-[11px] border border-amber-500/20 shrink-0">
            <Target className="w-3 h-3" />
            <span>Root For</span>
          </span>
          <span className="text-slate-300 truncate font-medium">
            {rootFor[0]}
          </span>
        </div>
      )}
    </section>
  );
}

