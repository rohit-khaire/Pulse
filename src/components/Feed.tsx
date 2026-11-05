'use client';

import React, { memo, useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Play, FastForward, ChevronDown } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePulseStore } from '@/lib/store';
import { NudgeCard } from './NudgeCard';
import { FEED_WINDOW, FEED_WINDOW_STEP, windowSlice } from '@/app/match/_shell/window-list';

/** Smooth live ticker: the line slides in on every ball instead of snapping. */
const LiveTicker = memo(function LiveTicker() {
  const frame = usePulseStore(useShallow((s) => (s.cursor > 0 ? s.frames[s.cursor] : undefined)));
  const setOpenModal = usePulseStore((s) => s.setOpenModal);
  if (!frame || !frame.delivery) return null;
  const d = frame.delivery;
  const wicket = d.wickets.length > 0;
  return (
    <div
      className="bg-slate-900/60 rounded-xl px-3.5 py-2 border border-slate-800/80 flex items-center justify-between text-xs min-h-11"
      data-testid="live-ticker"
    >
      <motion.div
        key={frame.i}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="flex items-center space-x-2 truncate"
      >
        <span aria-hidden="true" className={`w-2 h-2 rounded-full shrink-0 ${wicket ? 'bg-rose-500' : 'bg-emerald-400'}`} />
        <span className="text-slate-400 font-mono">{frame.currentScore.oversStr} ov:</span>
        <span className="text-slate-200 font-medium truncate">
          {d.bowler} to {d.batter}: {d.runsTotal} runs
          {wicket ? ` (WICKET: ${d.wickets[0].playerOut})` : ''}
        </span>
      </motion.div>
      <div className="flex items-center space-x-2 shrink-0 ml-2">
        {wicket && (
          <button
            type="button"
            onClick={() => setOpenModal('drs')}
            className="px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] tracking-wide transition-colors shadow-sm"
          >
            Why Out?
          </button>
        )}
        <span className="text-[10px] font-bold text-slate-400 uppercase">Ball {frame.ballInOver}/6</span>
      </div>
    </div>
  );
});

function EmptyFeed() {
  const isPlaying = usePulseStore((s) => s.isPlaying);
  const togglePlay = usePulseStore((s) => s.togglePlay);
  const nextKeyEvent = usePulseStore((s) => s.nextKeyEvent);
  return (
    <div className="text-center py-10 px-4 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
      <div className="w-12 h-12 mx-auto rounded-full bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
        <Sparkles className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-bold text-white mb-1">Har Ball Ka Matlab, Tumhari Team Ke Liye</h3>
      <p className="text-xs text-slate-400 max-w-xs mx-auto mb-4">
        Watch the match unfold! Press play below or jump to key moments to get fantasy explanations for your players.
      </p>
      <div className="flex items-center justify-center space-x-2">
        <button
          type="button"
          onClick={togglePlay}
          className="min-h-11 px-4 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-500 transition-colors flex items-center space-x-1.5 shadow-md shadow-red-600/30"
        >
          <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
          <span>{isPlaying ? 'Pause' : 'Start Replay'}</span>
        </button>
        <button
          type="button"
          onClick={nextKeyEvent}
          className="min-h-11 px-4 rounded-xl bg-slate-800 text-slate-100 text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center space-x-1.5 border border-slate-700"
        >
          <FastForward className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Next Key Event</span>
        </button>
      </div>
    </div>
  );
}

export function Feed() {
  const nudges = usePulseStore((s) => s.nudges);
  const [visible, setVisible] = useState(FEED_WINDOW);
  const { shown, hidden } = windowSlice(nudges, visible);

  return (
    <div className="space-y-3" data-tour="feed" data-testid="feed">
      <LiveTicker />

      {nudges.length === 0 ? (
        <EmptyFeed />
      ) : (
        <>
          {/* New nudges are announced politely by screen readers; the ticker is not (it would talk every ball). */}
          <ol
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Fantasy nudges"
            className="space-y-2"
          >
            {shown.map((nudge) => (
              <li key={nudge.id}>
                <NudgeCard nudge={nudge} />
              </li>
            ))}
          </ol>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + FEED_WINDOW_STEP)}
              className="w-full min-h-11 rounded-xl border border-slate-700 bg-slate-900 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-slate-800"
            >
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
              Show {Math.min(hidden, FEED_WINDOW_STEP)} older ({hidden} more)
            </button>
          )}
        </>
      )}
    </div>
  );
}
