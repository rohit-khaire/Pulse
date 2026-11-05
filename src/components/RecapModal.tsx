'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { teamPoints } from '@/lib/engine/points';
import { computeLeaderboard } from '@/lib/engine/league';
import Link from 'next/link';
import { Trophy, Award, RotateCcw, ArrowRight, Share2, Star } from 'lucide-react';
import { ShareBragButton } from './ShareBragButton';
import { DialogShell } from '@/app/match/_shell/Dialog';

export function RecapModal() {
  const {
    showRecap,
    setShowRecap,
    frames,
    cursor,
    myTeam,
    config,
    resetReplay,
  } = usePulseStore();

  if (!showRecap || !myTeam || frames.length === 0) return null;

  const finalFrame = frames[frames.length - 1];
  const teamResult = teamPoints(finalFrame.points, myTeam, config);
  const leaderboard = computeLeaderboard(finalFrame, null, myTeam, config);
  const userRankEntry = leaderboard.find((e) => e.isUser);

  // Top contributor
  let topPlayer = '';
  let topPoints = -Infinity;
  for (const [p, data] of Object.entries(teamResult.byPlayer)) {
    if (data.totalPts > topPoints) {
      topPoints = data.totalPts;
      topPlayer = p;
    }
  }

  return (
    <DialogShell onClose={() => setShowRecap(false)} label="Match recap" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 mb-4 shadow-lg shadow-amber-500/20">
          <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
        </div>

        <h2 className="text-xl font-black text-white mb-1">Match Finished!</h2>
        <p className="text-xs text-slate-400 mb-6">
          Rajasthan Royals won by 2 runs in a nail-biter thriller!
        </p>

        {/* Scorecard Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Total Points
            </div>
            <div className="text-2xl font-black text-white mt-0.5">
              {teamResult.total}
            </div>
          </div>

          <div className="bg-slate-900/80 rounded-2xl p-3 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              League Rank
            </div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">
              #{userRankEntry?.rank || 1} <span className="text-xs text-slate-400 font-normal">/ 5</span>
            </div>
          </div>
        </div>

        {/* Top Contributor */}
        <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800 mb-6 flex items-center justify-between text-left">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Top Contributor</div>
              <div className="text-sm font-bold text-white">{topPlayer}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-black text-emerald-400">+{topPoints}</div>
            <div className="text-[9px] text-slate-500 uppercase font-semibold">pts</div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <div className="flex justify-center mb-1">
            <ShareBragButton
              text={`Maine Pulse par match follow kiya! Meri fantasy team ne banaye ${teamResult.total} pts aur Rank #${userRankEntry?.rank || 1} aayi! Top player: ${topPlayer} (+${topPoints} pts) 🔥`}
              label="Share Final Result on WhatsApp"
              className="w-full py-2.5 justify-center text-xs"
            />
          </div>

          <button
            onClick={() => {
              resetReplay();
              setShowRecap(false);
            }}
            className="w-full min-h-11 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow-lg shadow-red-600/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay Match Again</span>
          </button>

          <Link
            href="/"
            onClick={() => setShowRecap(false)}
            className="w-full min-h-11 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center space-x-1.5 border border-slate-700/80 transition-colors block"
          >
            <span>Change / Pick Another Team</span>
          </Link>
        </div>
      </div>
    </DialogShell>
  );
}

