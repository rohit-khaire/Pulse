'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePulseStore } from '@/lib/store';
import { BallChips } from './BallChips';
import { LanguageToggle } from './LanguageToggle';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Activity } from 'lucide-react';

export function ScoreHeader() {
  const frame = usePulseStore(useShallow((s) => s.frames[s.cursor] || s.frames[0]));
  const online = usePulseStore((s) => s.online);

  if (!frame) return null;

  const { scoreLine, recentBalls, bowler, batter, nonStriker } = frame;

  return (
    <header data-tour="score" className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-md mx-auto px-4 py-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Link
              href="/"
              className="min-h-11 min-w-11 -ml-2 flex items-center justify-center text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Edit Team"
              aria-label="Back to team selection"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <div className="flex items-center space-x-1.5">
              <span aria-hidden="true" className="w-2 h-2 rounded-full bg-red-500 animate-ping motion-reduce:animate-none" />
              <span className="font-extrabold tracking-tight text-white text-base">PULSE</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800/40">
                {online ? 'Replay' : 'Replay · Offline'}
              </span>
            </div>
          </div>
          <LanguageToggle />
        </div>

        {/* Match Score Display */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 rounded-xl p-3 border border-slate-800/80 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <div className="font-bold text-lg text-white tracking-wide" aria-label={`Score: ${scoreLine}`}>
              {scoreLine}
            </div>
            <BallChips balls={recentBalls} />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1.5 border-t border-slate-800/60">
            <div className="truncate max-w-[55%]">
              <span className="text-slate-500">Bat: </span>
              <span className="text-slate-200 font-semibold">{batter || '—'}</span>
              {nonStriker && (
                <span className="text-slate-400 font-normal"> & {nonStriker}</span>
              )}
            </div>
            <div className="truncate max-w-[40%] text-right">
              <span className="text-slate-500">Bowl: </span>
              <span className="text-emerald-400 font-medium">{bowler || '—'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

