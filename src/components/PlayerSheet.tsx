'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { teamPoints } from '@/lib/engine/points';
import { X, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';
import { DialogShell } from '@/app/match/_shell/Dialog';

export function PlayerSheet() {
  const {
    frames,
    cursor,
    myTeam,
    config,
    selectedPlayerForSheet,
    setSelectedPlayerForSheet,
  } = usePulseStore();

  if (!selectedPlayerForSheet || !myTeam) return null;

  const frame = frames[cursor] || frames[0];
  const teamResult = teamPoints(frame.points, myTeam, config);
  const pData = teamResult.byPlayer[selectedPlayerForSheet];
  const stats = frame.stats[selectedPlayerForSheet];

  if (!pData || !stats) return null;

  const b = pData.breakdown;
  const isCaptain = selectedPlayerForSheet === myTeam.c;
  const isVC = selectedPlayerForSheet === myTeam.vc;

  const breakdownRows = [
    { label: 'Announced XI Bonus', value: b.playingXI, note: 'Starting XI' },
    { label: 'Runs Scored', value: b.runs, note: `${stats.runs} runs (${stats.balls}b)` },
    { label: 'Boundary Bonus (4s)', value: b.boundaries, note: `${stats.fours} fours` },
    { label: 'Six Bonus (6s)', value: b.sixes, note: `${stats.sixes} sixes` },
    { label: 'Milestone Bonus', value: b.milestones, note: stats.runs >= 50 ? '50+ runs' : stats.runs >= 25 ? '25+ runs' : 'None' },
    { label: 'Duck Penalty', value: b.duck, note: stats.out && stats.runs === 0 ? 'Out for 0' : 'Safe' },
    { label: 'Wickets Taken', value: b.wickets, note: `${stats.wickets} wickets` },
    { label: 'LBW / Bowled Bonus', value: b.lbwBowled, note: `${stats.lbwBowled} dismissals` },
    { label: 'Wicket Haul Bonus', value: b.hauls, note: stats.wickets >= 5 ? '5-wkt haul' : stats.wickets >= 3 ? '3-wkt haul' : 'None' },
    { label: 'Maiden Overs', value: b.maidens, note: `${stats.maidens} maidens` },
    { label: 'Dot Balls', value: b.dots, note: `${stats.dots} dots` },
    { label: 'Economy Rate Bonus', value: b.economy, note: stats.legalBalls >= 12 ? `${(stats.runsConceded / (stats.legalBalls / 6)).toFixed(1)} rpo` : 'Min 2 ov required' },
    { label: 'Catches', value: b.catches, note: `${stats.catches} catches` },
    { label: 'Stumpings', value: b.stumpings, note: `${stats.stumpings} stumpings` },
    { label: 'Run Outs', value: b.runOuts, note: `${stats.runOutDirect + stats.runOutIndirect} run outs` },
  ].filter((r) => r.value !== 0);

  return (
    <DialogShell onClose={() => setSelectedPlayerForSheet(null)} label="Player points breakdown" className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-bold text-white">{selectedPlayerForSheet}</h3>
              {isCaptain && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-xs font-black">
                  Captain (2×)
                </span>
              )}
              {isVC && (
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-950 text-xs font-black">
                  Vice-Captain (1.5×)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">Points Breakdown & Calculation</p>
          </div>
          <button
            onClick={() => setSelectedPlayerForSheet(null)}
            aria-label="Close" className="min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 text-sm">
          <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Total Fantasy Points
              </span>
              <div className="text-2xl font-black text-white">
                {pData.totalPts} <span className="text-xs font-normal text-slate-400">PTS</span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <div>Base Points: <span className="text-slate-200 font-bold">{pData.basePts}</span></div>
              <div>Multiplier: <span className="text-amber-400 font-bold">{pData.multiplier}×</span></div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Itemized Scoring Rules
            </h4>
            {breakdownRows.map((row, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60"
              >
                <div>
                  <div className="font-semibold text-slate-200 text-xs">{row.label}</div>
                  <div className="text-[11px] text-slate-400">{row.note}</div>
                </div>
                <div
                  className={`font-mono font-bold text-sm ${
                    row.value > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {row.value > 0 ? `+${row.value}` : row.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center">
          <button
            onClick={() => setSelectedPlayerForSheet(null)}
            className="w-full min-h-11 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Close Breakdown
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

