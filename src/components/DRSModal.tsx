'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { explainWicket } from '@/lib/engine/drs';
import { X, Scale, HelpCircle } from 'lucide-react';
import { DialogShell } from '@/app/match/_shell/Dialog';

interface DRSModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DRSModal({ isOpen, onClose }: DRSModalProps) {
  const { frames, cursor, lang } = usePulseStore();

  if (!isOpen || frames.length === 0) return null;

  // Use the current ball if it is a wicket, else the most recent wicket before it.
  let target = frames[cursor] || frames[0];
  if (!target.delivery.wickets?.length) {
    for (let i = cursor; i >= 0; i--) {
      if (frames[i].delivery.wickets?.length) {
        target = frames[i];
        break;
      }
    }
  }

  const w = explainWicket(target);
  const explanation = w ? w.plainExplanation[lang] || w.plainExplanation.hinglish : '';

  return (
    <DialogShell onClose={onClose} label="Why out? Wicket explainer" className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Why Out?</h3>
              <p className="text-[11px] text-slate-400">Who gets fantasy credit for this wicket</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
          {!w ? (
            <p className="text-slate-400">No wicket has fallen yet. Check back after the first dismissal.</p>
          ) : (
            <>
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-rose-500/30">
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">
                  Ball {w.ballNumber} • {w.bowler} to {w.batter}
                </div>
                <div className="text-base font-black text-rose-400">{w.decision}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{w.lawReference}</div>
              </div>

              <div className="bg-slate-900/70 rounded-2xl p-3.5 border border-slate-700 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-amber-400 font-bold text-[11px]">
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Samjho kya hua</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">{explanation}</p>
              </div>

              <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Fantasy credit (before C/VC multiplier)
                </span>
                {w.credits.length === 0 ? (
                  <p className="text-slate-400 text-[11px]">No bowling or fielding points for this dismissal.</p>
                ) : (
                  w.credits.map((c, i) => (
                    <div
                      key={`${c.player}-${i}`}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px]"
                    >
                      <span className="text-slate-200 font-semibold">
                        {c.player} <span className="text-slate-500 font-normal">· {c.note}</span>
                      </span>
                      <span className="font-bold text-emerald-400">+{c.pts}</span>
                    </div>
                  ))
                )}
                {!w.bowlerCredited && (
                  <p className="text-[11px] text-amber-400">Bowler gets no wicket points on this one.</p>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-3 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full min-h-11 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
