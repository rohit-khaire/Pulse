'use client';

import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePulseStore } from '@/lib/store';
import { Play, Pause, FastForward, RotateCcw, Zap } from 'lucide-react';

export function ReplayBar() {
  const { totalFrames, cursor, isPlaying, speed, smartReplay, oversStr } = usePulseStore(
    useShallow((s) => ({
      totalFrames: s.frames.length,
      cursor: s.cursor,
      isPlaying: s.isPlaying,
      speed: s.speed,
      smartReplay: s.smartReplay,
      oversStr: s.frames[s.cursor]?.currentScore.oversStr ?? '',
    }))
  );
  const togglePlay = usePulseStore((s) => s.togglePlay);
  const setCursor = usePulseStore((s) => s.setCursor);
  const setSpeed = usePulseStore((s) => s.setSpeed);
  const setSmartReplay = usePulseStore((s) => s.setSmartReplay);
  const nextKeyEvent = usePulseStore((s) => s.nextKeyEvent);
  const resetReplay = usePulseStore((s) => s.resetReplay);

  const max = totalFrames > 0 ? totalFrames - 1 : 0;

  return (
    <nav
      aria-label="Replay controls"
      data-tour="replay"
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 shadow-2xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="max-w-md mx-auto px-4 py-2 space-y-1">
        {/* Scrubber */}
        <div className="flex items-center space-x-2">
          <span className="text-[10px] font-mono text-slate-400 w-8 text-right" aria-hidden="true">
            {cursor}
          </span>
          <input
            type="range"
            min={0}
            max={max}
            value={cursor}
            onChange={(e) => setCursor(parseInt(e.target.value, 10))}
            aria-label="Replay position"
            aria-valuetext={oversStr ? `Over ${oversStr}, ball ${cursor} of ${max}` : `Ball ${cursor} of ${max}`}
            className="w-full h-11 bg-transparent appearance-none cursor-pointer accent-red-600"
          />
          <span className="text-[10px] font-mono text-slate-400 w-8" aria-hidden="true">
            {max}
          </span>
        </div>

        {/* Controls row: thumb-reachable, 44px targets */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={() => setSmartReplay(!smartReplay)}
              aria-pressed={smartReplay}
              title="Smart Replay: auto-pauses on key moments"
              className={`min-h-11 px-2.5 rounded-lg text-[11px] font-bold flex items-center space-x-1 transition-all ${
                smartReplay
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-700'
              }`}
            >
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Smart</span>
            </button>

            <div role="group" aria-label="Replay speed" className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
              {([1, 5, 10] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  aria-pressed={speed === s}
                  aria-label={`${s} times speed`}
                  className={`min-h-10 min-w-9 px-1.5 text-[11px] font-bold rounded-md transition-colors ${
                    speed === s ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={resetReplay}
              className="min-h-11 min-w-11 flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Rewind to start"
              aria-label="Rewind to start"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              data-testid="play-toggle"
              aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
              className="min-h-11 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm flex items-center space-x-1.5 shadow-lg shadow-red-600/30 transition-all active:scale-95 motion-reduce:active:scale-100"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={nextKeyEvent}
              className="min-h-11 min-w-11 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs flex items-center justify-center border border-slate-700 transition-colors"
              title="Jump to next key event"
              aria-label="Jump to next key event"
            >
              <FastForward className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
