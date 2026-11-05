'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { computeHeadToHeadClash } from '@/lib/engine/scenarios';
import { Swords, Flame, TrendingUp, TrendingDown, Zap } from 'lucide-react';

export function HeadToHeadCard() {
  const { frames, cursor, myTeam, config } = usePulseStore();

  if (!myTeam || frames.length === 0) return null;

  const frame = frames[cursor] || frames[0];
  const h2h = computeHeadToHeadClash(frame, myTeam, config);

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3 shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <Swords className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Live Friend Duel: You vs {h2h.rivalOwner}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[11px] font-bold text-slate-400">Gap:</span>
          <span
            className={`text-xs font-extrabold font-mono px-2 py-0.5 rounded-full ${
              h2h.gap >= 0
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {h2h.gap >= 0 ? `+${h2h.gap} pts ahead` : `${h2h.gap} pts behind`}
          </span>
        </div>
      </div>

      {/* Head to Head Duel Details */}
      {h2h.hasClash ? (
        <div className="p-2.5 rounded-xl bg-gradient-to-r from-red-950/40 via-slate-850 to-slate-850 border border-red-500/30 animate-pulse motion-reduce:animate-none">
          <div className="flex items-center space-x-1.5 text-[11px] font-black text-red-400 mb-1">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>ACTIVE BALL CLASH!</span>
          </div>
          <div className="text-xs text-white font-semibold">
            {h2h.userClashRole} <span className="text-amber-400 font-bold">VS</span> {h2h.rivalClashRole}
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            {h2h.eventDescription}
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <div>
            Your Score: <span className="text-white font-bold">{h2h.userScore} pts</span>
          </div>
          <div>
            Aman: <span className="text-slate-200 font-bold">{h2h.rivalScore} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}

