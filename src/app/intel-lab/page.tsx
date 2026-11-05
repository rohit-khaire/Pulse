'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useIntel } from '@/lib/intel/useIntel';
import { WinProbCard, RankForecastCard, CaptainWhatIfCard, SwingMomentsStrip } from '@/components/intel';
import { PageTour } from '@/components/demo/PageTour';
import { INTEL_TOUR_STEPS } from '@/lib/demo-system';
import { isDemoActive } from '@/components/demo/SystemDemoBar';
import sampleTeam from '@/data/sample-team.json';
import matchData from '../../../public/matches/1254111.json';

type Lang = 'en' | 'hinglish' | 'hi';
const LANGS: Array<[Lang, string]> = [
  ['hinglish', 'Hinglish'],
  ['hi', 'हिन्दी'],
  ['en', 'English'],
];

/** Verification helper: first-paint time of the cards and long main-thread tasks. */
function PerfReadout() {
  const intel = useIntel();
  const mountedAt = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const [firstReadyMs, setFirstReadyMs] = useState<number | null>(null);
  const [longTasks, setLongTasks] = useState({ count: 0, worst: 0 });

  useEffect(() => {
    if (firstReadyMs === null && intel.status === 'ready') {
      setFirstReadyMs(Math.round(performance.now() - mountedAt.current));
    }
  }, [intel.status, firstReadyMs]);

  useEffect(() => {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      const po = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        setLongTasks((p) => ({
          count: p.count + entries.length,
          worst: Math.max(p.worst, ...entries.map((e) => Math.round(e.duration))),
        }));
      });
      po.observe({ entryTypes: ['longtask'] });
      return () => po.disconnect();
    } catch {
      return undefined;
    }
  }, []);

  return (
    <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
      <div className="rounded-lg bg-slate-900 p-1.5">
        <div className="text-sm font-bold text-slate-100">{firstReadyMs === null ? '…' : `${firstReadyMs} ms`}</div>
        first cards (budget 300)
      </div>
      <div className="rounded-lg bg-slate-900 p-1.5">
        <div className="text-sm font-bold text-slate-100">{Math.round(intel.timelineProgress * 100)}%</div>
        timeline precompute
      </div>
      <div className="rounded-lg bg-slate-900 p-1.5">
        <div className="text-sm font-bold text-slate-100">
          {longTasks.count} / {longTasks.worst} ms
        </div>
        long tasks / worst
      </div>
    </div>
  );
}

export default function IntelLabPage() {
  const frames = usePulseStore((s) => s.frames);
  const cursor = usePulseStore((s) => s.cursor);
  const myTeam = usePulseStore((s) => s.myTeam);
  const lang = usePulseStore((s) => s.lang);
  const initMatch = usePulseStore((s) => s.initMatch);
  const setCursor = usePulseStore((s) => s.setCursor);
  const setTeam = usePulseStore((s) => s.setTeam);
  const setLang = usePulseStore((s) => s.setLang);
  const [playing, setPlaying] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (isDemoActive()) {
      try {
        const dismissed = sessionStorage.getItem('pulse_tour_intel_done') === '1';
        if (!dismissed) setTourOpen(true);
      } catch {}
    }
    const onReopen = () => setTourOpen(true);
    window.addEventListener('pulse-reopen-tour', onReopen);
    return () => window.removeEventListener('pulse-reopen-tour', onReopen);
  }, []);

  useEffect(() => {
    if (!myTeam) setTeam(sampleTeam);
  }, [myTeam, setTeam]);

  useEffect(() => {
    if (frames.length === 0) initMatch(matchData as never);
  }, [frames.length, initMatch]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const s = usePulseStore.getState();
      if (s.cursor >= s.frames.length - 1) {
        setPlaying(false);
        return;
      }
      s.setCursor(s.cursor + 1);
    }, 450);
    return () => clearInterval(id);
  }, [playing]);

  if (frames.length === 0 || !myTeam) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-3 bg-slate-950 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
        <span className="text-xs font-semibold">Loading match timeline…</span>
      </div>
    );
  }

  const frame = frames[cursor] ?? frames[0];
  const last = frames.length - 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-black uppercase tracking-wide text-white">
                Pulse <span className="text-red-500">Intel</span> Lab
              </h1>
              <p className="text-[10px] text-slate-400">Kya main jeetunga? Probabilities, not guesses.</p>
            </div>
            <div className="flex gap-1">
              {LANGS.map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setLang(k)}
                  className={`rounded-md px-2 py-1 text-[10px] font-bold ${lang === k ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px]">
            <div className="font-semibold text-slate-100">{frame.scoreLine}</div>
            <div className="text-[10px] text-slate-400">
              {frame.i === 0 ? 'Before the first ball' : `${frame.bowler} to ${frame.batter}${frame.delivery.wickets.length ? ' · WICKET' : frame.delivery.isSix ? ' · SIX' : frame.delivery.isFour ? ' · FOUR' : ''}`}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <button type="button" aria-label="Back one over" onClick={() => setCursor(cursor - 6)} className="rounded-md bg-slate-800 p-1.5 text-slate-200">
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button type="button" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)} className="rounded-md bg-red-600 p-1.5 text-white">
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button type="button" aria-label="Forward one over" onClick={() => setCursor(cursor + 6)} className="rounded-md bg-slate-800 p-1.5 text-slate-200">
              <SkipForward className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={last}
              value={cursor}
              onChange={(e: { target: { value: string } }) => setCursor(Number(e.target.value))}
              aria-label="Scrub through the match"
              className="h-1 flex-1 accent-red-500"
            />
            <span className="w-14 text-right text-[10px] tabular-nums text-slate-400">
              {cursor}/{last}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-4 py-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[10px] leading-snug text-slate-400">
          Replay of Cricsheet match 1254111 (not live). Team: <span className="font-semibold text-slate-200">{(sampleTeam as { name: string }).name}</span> (sample). Rivals are sample data. All numbers are deterministic or seeded simulations labelled “model estimate”.
          <button
            type="button"
            onClick={() => setTeam(sampleTeam)}
            className="ml-1 font-semibold text-red-400 underline"
          >
            Reset to sample team
          </button>
        </div>

        <PerfReadout />
        <div data-tour="intel-winprob" className="space-y-3">
          <WinProbCard />
          <SwingMomentsStrip />
        </div>
        <div data-tour="intel-forecast">
          <RankForecastCard />
        </div>
        <div data-tour="intel-whatif">
          <CaptainWhatIfCard />
        </div>
      </main>

      <PageTour
        steps={INTEL_TOUR_STEPS}
        storageKey="pulse_tour_intel_done"
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />
    </div>
  );
}
