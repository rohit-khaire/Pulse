'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Play, Sparkles, X } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { checkRelevance } from '@/lib/engine/triggers';
import { VoiceToggle } from './VoiceToggle';

const DWELL_MS = 6500;
const MAX_STOPS = 5;

export function StoryMode() {
  const { events, frames, myTeam, setCursor, setIsPlaying, resetReplay } = usePulseStore();
  const [step, setStep] = useState(-1);

  // The moments that actually moved THIS fan's team, spread across the match.
  const stops = useMemo(() => {
    if (!myTeam) return [];
    const relevant = events.filter((e) => {
      const r = checkRelevance(e, myTeam);
      return r.relevant && r.priority === 1;
    });
    if (relevant.length <= MAX_STOPS) return relevant;
    const stride = (relevant.length - 1) / (MAX_STOPS - 1);
    return Array.from({ length: MAX_STOPS }, (_, i) => relevant[Math.round(i * stride)]);
  }, [events, myTeam]);

  useEffect(() => {
    if (step < 0) return;
    if (step >= stops.length) {
      setStep(-1);
      if (frames.length > 0) setCursor(frames.length - 1); // finale: match recap
      return;
    }
    setIsPlaying(false);
    setCursor(stops[step].frameIndex);
    const t = setTimeout(() => setStep((s) => s + 1), DWELL_MS);
    return () => clearTimeout(t);
  }, [step, stops, frames.length, setCursor, setIsPlaying]);

  if (stops.length === 0) return null;

  if (step < 0) {
    return (
      <div className="rounded-2xl p-3 border border-red-500/30 bg-gradient-to-br from-red-950/50 via-slate-900 to-slate-900 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Watch the 60-second story</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
              Pulse walks you through the {stops.length} moments that moved your rank, with an explanation for each.
            </p>
          </div>
          <VoiceToggle />
        </div>
        <button
          onClick={() => {
            resetReplay();
            setStep(0);
          }}
          className="mt-2.5 w-full min-h-11 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-red-600/30 active:scale-95 transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start story</span>
        </button>
      </div>
    );
  }

  const current = stops[Math.min(step, stops.length - 1)];
  return (
    <div className="rounded-2xl p-3 border border-amber-500/40 bg-slate-900 shadow-lg" aria-live="polite">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
          Moment {step + 1} of {stops.length}
        </span>
        <div className="flex items-center space-x-2">
          <VoiceToggle />
          <button
            onClick={() => setStep(-1)}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-800"
            title="Exit story"
            aria-label="Exit story"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-200 font-medium leading-snug">{current.description}</p>
      <div className="flex space-x-1 mt-2">
        {stops.map((_, i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-amber-400' : 'bg-slate-800'}`} />
        ))}
      </div>
    </div>
  );
}
