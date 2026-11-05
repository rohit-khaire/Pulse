'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { usePulseStore } from '../store';
import type { Frame, TeamSelection } from '../engine/types';
import { createIntelContext } from './context';
import { EMPTY_SNAPSHOT, getIntelEngine, type EngineSnapshot, type IntelEngine } from './engine';
import { frameIntel, type FrameIntel } from './timelines';
import { captainWhatIfAtFrame, bestCaptainFromHere, type CaptainWhatIf, type LiveCaptainAdvice } from './whatif';
import type { SwingMoment } from './swings';
import type { RankForecast } from './rankforecast';
import { getIntelFacts, type IntelFacts } from './facts';
import { isWinProbModelReady } from './winprob';
import { teamShort } from './copy';
import type { IntelLang } from './types';

export interface IntelView {
  status: 'idle' | 'loading' | 'ready' | 'error';
  frames: Frame[];
  cursor: number;
  frame: Frame | null;
  team: TeamSelection | null;
  lang: IntelLang;
  modelReady: boolean;
  timelineProgress: number;
  timeline: FrameIntel[] | null;
  current: FrameIntel | null;
  previous: FrameIntel | null;
  teamNames: { batFirst: string; chase: string };
  /** all swing moments in the match (for markers on the sparkline) */
  swingsAll: SwingMoment[];
  /** only moments that already happened at the current ball (no spoilers) */
  swingsSoFar: SwingMoment[];
  forecast: RankForecast | null;
  /** forecast belongs to a different ball than the one on screen */
  forecastStale: boolean;
  forecastRunning: boolean;
  forecastProgress: number;
  whatIf: CaptainWhatIf | null;
  whatIfFinal: CaptainWhatIf | null;
  liveCaptain: LiveCaptainAdvice | null;
  error: string | null;
}

const noopSubscribe = () => () => {};
const emptyGet = () => EMPTY_SNAPSHOT;

/**
 * Single entry point for every Intel card. Heavy work is shared and chunked
 * (see engine.ts); this hook only reads snapshots and derives cheap values.
 */
export function useIntel(): IntelView {
  const frames = usePulseStore((s) => s.frames);
  const cursor = usePulseStore((s) => s.cursor);
  const team = usePulseStore((s) => s.myTeam);
  const config = usePulseStore((s) => s.config);
  const match = usePulseStore((s) => s.match);
  const lang = usePulseStore((s) => s.lang) as IntelLang;

  const ctx = useMemo(
    () => (frames.length > 0 ? createIntelContext(frames, config, match) : null),
    [frames, config, match]
  );
  const engine: IntelEngine | null = useMemo(() => {
    if (!ctx || !team) return null;
    try {
      return getIntelEngine(ctx, team);
    } catch {
      return null;
    }
  }, [ctx, team]);

  const snap: EngineSnapshot = useSyncExternalStore(
    engine ? engine.subscribe : noopSubscribe,
    engine ? engine.getSnapshot : emptyGet,
    emptyGet
  );

  useEffect(() => {
    engine?.focus(cursor);
  }, [engine, cursor]);

  const frame = frames[cursor] ?? null;

  const current = useMemo<FrameIntel | null>(() => {
    if (!ctx || !team || !frame) return null;
    if (snap.timeline) return snap.timeline[cursor] ?? null;
    if (!isWinProbModelReady()) return null;
    try {
      return frameIntel(ctx, team, frame);
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, team, frame, cursor, snap.timeline, snap.modelReady]);

  const previous = snap.timeline ? snap.timeline[Math.max(0, cursor - 1)] ?? null : null;

  const whatIf = useMemo(() => {
    if (!frame || !team) return null;
    try {
      return captainWhatIfAtFrame(frame, team, config);
    } catch {
      return null;
    }
  }, [frame, team, config]);

  const whatIfFinal = useMemo(() => {
    if (frames.length === 0 || !team) return null;
    try {
      return captainWhatIfAtFrame(frames[frames.length - 1], team, config);
    } catch {
      return null;
    }
  }, [frames, team, config]);

  const liveCaptain = useMemo(() => {
    if (!snap.forecast || !team) return null;
    try {
      return bestCaptainFromHere(snap.forecast.expectedRemainingBase, team, config);
    } catch {
      return null;
    }
  }, [snap.forecast, team, config]);

  const swingsSoFar = useMemo(() => snap.swings.filter((s) => s.frameIndex <= cursor), [snap.swings, cursor]);

  const names = useMemo(() => {
    const f0 = frames[0];
    return f0
      ? { batFirst: teamShort(f0.battingTeam), chase: teamShort(f0.bowlingTeam) }
      : { batFirst: '—', chase: '—' };
  }, [frames]);

  const status: IntelView['status'] = snap.error
    ? 'error'
    : !ctx || !team
    ? 'idle'
    : current
    ? 'ready'
    : 'loading';

  return {
    status,
    frames,
    cursor,
    frame,
    team,
    lang,
    modelReady: snap.modelReady || isWinProbModelReady(),
    timelineProgress: snap.timelineProgress,
    timeline: snap.timeline,
    current,
    previous,
    teamNames: names,
    swingsAll: snap.swings,
    swingsSoFar,
    forecast: snap.forecast,
    forecastStale: !!snap.forecast && snap.forecast.frameIndex !== cursor,
    forecastRunning: snap.forecastRunning,
    forecastProgress: snap.forecastProgress,
    whatIf,
    whatIfFinal,
    liveCaptain,
    error: snap.error,
  };
}

/**
 * Convenience for non-React callers (e.g. the AI narration layer):
 * facts for the current store state. Returns null until frames + team exist.
 */
export function getIntelFactsFromStore(frameIndex?: number, opts: { forecastSims?: number } = {}): IntelFacts | null {
  const s = usePulseStore.getState();
  if (!s.myTeam || s.frames.length === 0) return null;
  const ctx = createIntelContext(s.frames, s.config, s.match);
  return getIntelFacts(frameIndex ?? s.cursor, s.myTeam, ctx, { forecastSims: opts.forecastSims });
}
