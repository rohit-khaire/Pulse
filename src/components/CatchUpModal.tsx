'use client';

import React, { useState } from 'react';
import { usePulseStore } from '@/lib/store';
import { generateCatchUpSummary, CatchUpSummary } from '@/lib/engine/catchup';
import { X, Sparkles, Clock, TrendingUp, ShieldAlert, CheckCircle2, Flame, RotateCcw } from 'lucide-react';
import { DialogShell } from '@/app/match/_shell/Dialog';

interface CatchUpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CatchUpModal({ isOpen, onClose }: CatchUpModalProps) {
  const { frames, cursor, lang } = usePulseStore();
  const [lookback, setLookback] = useState<12 | 24 | 36>(24);

  if (!isOpen || frames.length === 0) return null;

  const summary = generateCatchUpSummary(frames, cursor, lookback);
  const text = summary.summaryText[lang] || summary.summaryText.hinglish;

  return (
    <DialogShell onClose={onClose} label="Catch me up" className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">
                Catch Me Up (What Did I Miss?)
              </h3>
              <p className="text-[11px] text-slate-400">
                10-Second Instant Live Match Recap
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close" className="min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Lookback Selector */}
          <div className="flex items-center justify-between p-1 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-bold uppercase px-2">Recap window:</span>
            <div className="flex space-x-1">
              {([12, 24, 36] as const).map((balls) => (
                <button
                  key={balls}
                  onClick={() => setLookback(balls)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    lookback === balls
                      ? 'bg-red-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Last {balls / 6} Overs
                </button>
              ))}
            </div>
          </div>

          {/* Key Stats Pill Grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Overs</span>
              <span className="text-sm font-black text-white">{summary.fromOver} - {summary.toOver}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Runs Scored</span>
              <span className="text-sm font-black text-amber-400">+{summary.runsScored}</span>
            </div>
            <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Wickets</span>
              <span className="text-sm font-black text-rose-400">{summary.wicketsFallen} Wkts</span>
            </div>
          </div>

          {/* AI Narrative Summary */}
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-3.5 rounded-2xl border border-red-500/20 text-slate-200 leading-relaxed shadow-inner">
            <div className="flex items-center space-x-1.5 text-red-400 font-bold text-[11px] mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Match Narrative ({lang.toUpperCase()})</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-100 font-normal leading-relaxed">
              {text}
            </p>
          </div>

          {/* Turning Points List */}
          {summary.keyMoments.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Key Turning Points While You Were Away:
              </span>
              {summary.keyMoments.map((km, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center space-x-2 text-slate-200 text-xs"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{km}</span>
                </div>
              ))}
            </div>
          )}

          {/* Current Momentum */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Current Momentum</span>
              <span className="text-xs font-semibold text-emerald-400">{summary.momentumShift}</span>
            </div>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full min-h-11 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Back to Live Action
          </button>
        </div>
      </div>
    </DialogShell>
  );
}

