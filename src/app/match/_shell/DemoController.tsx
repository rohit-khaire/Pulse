'use client';

import React, { useEffect, useRef } from 'react';
import { RotateCcw, PlayCircle } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { findDramaFrame, isDemoSearch, TOUR_DISMISSED_KEY } from './demo';
import { useTourStore } from './tour-store';

/** Puts the app into its demo starting state: sample team, final over, replay paused, nothing open. */
export function resetDemoState() {
  const s = usePulseStore.getState();
  s.loadSampleTeam();
  s.resetReplay();
  s.setOpenModal(null);
  s.setSamjhaoOpen(false);
  s.setSelectedPlayerForSheet(null);
  s.setActiveTab('feed');
  s.setSpeed(1);
  s.setSmartReplay(true);
  s.setCursor(findDramaFrame(s.frames));
  s.setIsPlaying(false);
}

/**
 * Render-nothing driver for ?demo=1: flips demo mode on, and once the match has loaded
 * jumps to the high-drama moment and opens the tour (once per browser session).
 */
export function DemoController() {
  const demoMode = usePulseStore((s) => s.demoMode);
  const status = usePulseStore((s) => s.matchStatus);
  const setDemoMode = usePulseStore((s) => s.setDemoMode);
  const dispatch = useTourStore((s) => s.dispatch);
  const booted = useRef(false);

  useEffect(() => {
    if (isDemoSearch(window.location.search)) setDemoMode(true);
  }, [setDemoMode]);

  useEffect(() => {
    if (!demoMode || status !== 'ready' || booted.current) return;
    booted.current = true;
    resetDemoState();
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(TOUR_DISMISSED_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (!dismissed) dispatch({ type: 'start' });
  }, [demoMode, status, dispatch]);

  useEffect(() => {
    const onReopen = () => dispatch({ type: 'start' });
    window.addEventListener('pulse-reopen-tour', onReopen);
    return () => window.removeEventListener('pulse-reopen-tour', onReopen);
  }, [dispatch]);

  return null;
}

/** Visible judge-mode strip: badge + "Replay tour" + "Reset demo". */
export function DemoControls() {
  const demoMode = usePulseStore((s) => s.demoMode);
  const dispatch = useTourStore((s) => s.dispatch);
  if (!demoMode) return null;

  return (
    <section
      aria-label="Judge mode"
      data-testid="demo-controls"
      className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5"
    >
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">Judge mode</span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => dispatch({ type: 'start' })}
          className="min-h-11 px-3 rounded-lg text-xs font-bold text-amber-200 hover:bg-amber-500/20 flex items-center gap-1.5"
        >
          <PlayCircle className="w-4 h-4" aria-hidden="true" />
          <span>Tour</span>
        </button>
        <button
          type="button"
          data-testid="reset-demo"
          onClick={() => {
            try {
              sessionStorage.removeItem(TOUR_DISMISSED_KEY);
            } catch {
              /* ignore */
            }
            resetDemoState();
            dispatch({ type: 'start' });
          }}
          className="min-h-11 px-3 rounded-lg text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 flex items-center gap-1.5"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          <span>Reset demo</span>
        </button>
      </div>
    </section>
  );
}
