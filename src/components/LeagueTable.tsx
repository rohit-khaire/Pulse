'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { computeLeaderboard } from '@/lib/engine/league';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown } from 'lucide-react';

export function LeagueTable() {
  const { frames, cursor, myTeam, config } = usePulseStore();
  const frame = frames[cursor] || frames[0];
  const prevFrame = cursor > 0 ? frames[cursor - 1] : null;

  if (!myTeam || !frame) return null;

  const leaderboard = computeLeaderboard(frame, prevFrame, myTeam, config);

  return (
    <div className="space-y-3 pb-24">
      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-white">Friends Mini-League</span>
        </div>
        <span className="text-[11px] text-slate-400">5 Teams competing</span>
      </div>

      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const isUser = entry.isUser;
          const isLeader = entry.rank === 1;

          return (
            <div
              key={entry.id}
              className={`p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                isUser
                  ? 'bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 border-red-500/40 shadow-lg shadow-red-950/30'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Rank Badge */}
                <div className="flex flex-col items-center justify-center w-7">
                  <div className="flex items-center space-x-0.5">
                    {isLeader && <Crown className="w-3.5 h-3.5 text-amber-400 mb-0.5" />}
                    <span
                      className={`font-black text-base ${
                        isLeader ? 'text-amber-400' : 'text-slate-300'
                      }`}
                    >
                      #{entry.rank}
                    </span>
                  </div>

                  {/* Rank Delta indicator */}
                  <div className="text-[10px] flex items-center font-bold">
                    {entry.rankDelta > 0 && (
                      <span className="text-emerald-400 flex items-center">
                        <TrendingUp className="w-2.5 h-2.5" />
                        <span>{entry.rankDelta}</span>
                      </span>
                    )}
                    {entry.rankDelta < 0 && (
                      <span className="text-rose-400 flex items-center">
                        <TrendingDown className="w-2.5 h-2.5" />
                        <span>{Math.abs(entry.rankDelta)}</span>
                      </span>
                    )}
                    {entry.rankDelta === 0 && (
                      <span className="text-slate-600">
                        <Minus className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Team Info */}
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-sm text-white">{entry.name}</span>
                    {isUser && (
                      <span className="px-1.5 py-0.2 rounded bg-red-600 text-white text-[10px] font-extrabold uppercase">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{entry.owner}</div>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <div className="text-lg font-black text-white">{entry.totalPts}</div>
                <div className="text-[10px] uppercase font-bold text-slate-500">pts</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

