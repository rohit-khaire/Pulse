'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { teamPoints } from '@/lib/engine/points';
import { ChevronRight } from 'lucide-react';

interface PlayerRowProps {
  player: string;
}

export function PlayerRow({ player }: PlayerRowProps) {
  const frame = usePulseStore((s) => s.frames[s.cursor] || s.frames[0]);
  const myTeam = usePulseStore((s) => s.myTeam);
  const config = usePulseStore((s) => s.config);
  const setSelectedPlayerForSheet = usePulseStore((s) => s.setSelectedPlayerForSheet);

  if (!myTeam || !frame) return null;

  const teamResult = teamPoints(frame.points, myTeam, config);
  const pData = teamResult.byPlayer[player];

  if (!pData) return null;

  const isCaptain = player === myTeam.c;
  const isVC = player === myTeam.vc;

  return (
    <button
      type="button"
      onClick={() => setSelectedPlayerForSheet(player)}
      aria-label={`${player}, ${pData.totalPts} points. Open breakdown`}
      className="w-full min-h-11 text-left flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/85 cursor-pointer transition-all duration-150 active:scale-[0.99]"
    >
      <div className="flex items-center space-x-2.5">
        <div className="flex items-center space-x-1">
          {isCaptain && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-sm">
              C
            </span>
          )}
          {isVC && (
            <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-sm">
              VC
            </span>
          )}
          {!isCaptain && !isVC && (
            <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-500 font-bold text-[10px] flex items-center justify-center">
              •
            </span>
          )}
        </div>

        <div>
          <div className="font-semibold text-slate-200 text-sm">{player}</div>
          <div className="text-[11px] text-slate-500">
            {pData.multiplier > 1 ? `Base ${pData.basePts} × ${pData.multiplier}` : 'Standard 1x'}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="text-right">
          <div className="font-bold text-white text-base">{pData.totalPts}</div>
          <div className="text-[10px] text-slate-400 uppercase font-semibold">pts</div>
        </div>
        <ChevronRight aria-hidden="true" className="w-4 h-4 text-slate-500" />
      </div>
    </button>
  );
}

