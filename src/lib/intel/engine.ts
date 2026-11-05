/**
 * IntelEngine — shared, framework-free scheduler. One instance per (frames, team);
 * all four cards read from it through useIntel(), so work is done once.
 *
 * Budget rules: every task slice is ≤ ~8-10 ms and yields via requestIdleCallback
 * (falls back to setTimeout), so scrubbing/animations stay smooth.
 *   1. win-prob DP tables + per-frame timeline (≈250 ms of idle time in total)
 *   2. swing moments (instant once the timeline exists)
 *   3. Monte Carlo rank forecast for the focused frame (progressive, cached)
 */
import { createTimelineJob, type FrameIntel, type TimelineJob } from './timelines';
import { createForecastJob, DEFAULT_SIMS, type ForecastJob, type RankForecast } from './rankforecast';
import { findSwingMoments, type SwingMoment } from './swings';
import { isWinProbModelReady } from './winprob';
import { teamKey, userTeam } from './context';
import type { IntelContext } from './types';
import type { TeamSelection } from '../engine/types';

export interface EngineSnapshot {
  version: number;
  modelReady: boolean;
  timelineProgress: number;
  timeline: FrameIntel[] | null;
  swings: SwingMoment[];
  forecast: RankForecast | null;
  forecastRunning: boolean;
  forecastProgress: number;
  error: string | null;
}

export const EMPTY_SNAPSHOT: EngineSnapshot = {
  version: 0,
  modelReady: false,
  timelineProgress: 0,
  timeline: null,
  swings: [],
  forecast: null,
  forecastRunning: false,
  forecastProgress: 0,
  error: null,
};

type Cancel = () => void;
function scheduleIdle(cb: () => void): Cancel {
  const g = globalThis as unknown as {
    requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof g.requestIdleCallback === 'function') {
    const id = g.requestIdleCallback(cb, { timeout: 120 });
    return () => g.cancelIdleCallback?.(id);
  }
  const id = setTimeout(cb, 0);
  return () => clearTimeout(id);
}

const SLICE_MS = 9;
const PARTIAL_EVERY = 250;
const DEBOUNCE_MS = 220;
const MAX_WAIT_MS = 1200;
const CACHE_LIMIT = 80;

export class IntelEngine {
  readonly ctx: IntelContext;
  readonly sel: TeamSelection;
  readonly key: string;
  private sims: number;
  private listeners = new Set<() => void>();
  private snap: EngineSnapshot = { ...EMPTY_SNAPSHOT };
  private timelineJob: TimelineJob;
  private fcJob: ForecastJob | null = null;
  private fcFrame = -1;
  private lastPartialAt = 0;
  private cache = new Map<number, RankForecast>();
  private cancelPump: Cancel | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastStart = 0;
  private wanted = -1;
  private disposed = false;

  constructor(ctx: IntelContext, sel: TeamSelection, sims = DEFAULT_SIMS) {
    this.ctx = ctx;
    this.sel = sel;
    this.sims = sims;
    this.key = IntelEngine.keyOf(ctx, sel);
    this.timelineJob = createTimelineJob(ctx, sel);
    this.pump();
  }

  static keyOf(ctx: IntelContext, sel: TeamSelection): string {
    return `${ctx.frames.length}:${teamKey(sel)}`;
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): EngineSnapshot => this.snap;

  private emit(patch: Partial<EngineSnapshot>) {
    this.snap = { ...this.snap, ...patch, version: this.snap.version + 1 };
    this.listeners.forEach((l) => l());
  }

  /** Tell the engine which frame the UI is looking at. */
  focus(frameIndex: number) {
    if (this.disposed || frameIndex === this.wanted) return;
    this.wanted = frameIndex;
    const cached = this.cache.get(frameIndex);
    if (cached) {
      this.fcJob = null;
      this.fcFrame = frameIndex;
      this.emit({ forecast: cached, forecastRunning: false, forecastProgress: 1 });
      return;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    const first = this.snap.forecast === null && this.fcJob === null;
    const waited = Date.now() - this.lastStart;
    const delay = first || waited > MAX_WAIT_MS ? 0 : DEBOUNCE_MS;
    this.debounceTimer = setTimeout(() => this.startForecast(this.wanted), delay);
  }

  private startForecast(frameIndex: number) {
    if (this.disposed) return;
    const frame = this.ctx.frames[frameIndex];
    if (!frame) return;
    if (this.cache.has(frameIndex)) return;
    this.lastStart = Date.now();
    this.fcFrame = frameIndex;
    this.lastPartialAt = 0;
    this.fcJob = createForecastJob({
      frame,
      squads: this.ctx.squads,
      teams: [userTeam(this.sel), ...this.ctx.rivals],
      config: this.ctx.config,
      sims: this.sims,
    });
    this.emit({ forecastRunning: true, forecastProgress: 0 });
    this.pump();
  }

  private pump() {
    if (this.disposed || this.cancelPump) return;
    this.cancelPump = scheduleIdle(() => {
      this.cancelPump = null;
      this.tick();
    });
  }

  private tick() {
    if (this.disposed) return;
    try {
      if (!this.timelineJob.step(SLICE_MS) && this.snap.timeline === null) {
        this.emit({
          modelReady: isWinProbModelReady(),
          timelineProgress: this.timelineJob.progress(),
        });
        this.pump();
        return;
      }
      if (this.snap.timeline === null) {
        const timeline = this.timelineJob.result();
        const swings = findSwingMoments(this.ctx, timeline, this.sel, { max: 6 });
        this.emit({ modelReady: true, timelineProgress: 1, timeline, swings });
      }
      if (this.fcJob) {
        const job = this.fcJob;
        const finished = job.step(SLICE_MS);
        if (finished) {
          const res = job.result();
          this.cache.set(this.fcFrame, res);
          if (this.cache.size > CACHE_LIMIT) {
            const oldest = this.cache.keys().next().value;
            if (oldest !== undefined) this.cache.delete(oldest);
          }
          this.fcJob = null;
          this.emit({ forecast: res, forecastRunning: false, forecastProgress: 1 });
        } else if (job.done - this.lastPartialAt >= PARTIAL_EVERY || (this.lastPartialAt === 0 && job.done >= 150)) {
          this.lastPartialAt = job.done;
          this.emit({ forecast: job.result(), forecastRunning: true, forecastProgress: job.done / job.targetSims });
        }
        this.pump();
      }
    } catch (e) {
      this.fcJob = null;
      this.emit({ error: e instanceof Error ? e.message : 'intel engine error', forecastRunning: false });
    }
  }

  dispose() {
    this.disposed = true;
    this.cancelPump?.();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.listeners.clear();
  }
}

let shared: { engine: IntelEngine; frames: unknown; config: unknown } | null = null;

/** Reuse one engine per (frames array, config, team). */
export function getIntelEngine(ctx: IntelContext, sel: TeamSelection): IntelEngine {
  const key = IntelEngine.keyOf(ctx, sel);
  if (shared && shared.frames === ctx.frames && shared.config === ctx.config && shared.engine.key === key) {
    return shared.engine;
  }
  shared?.engine.dispose();
  const engine = new IntelEngine(ctx, sel);
  shared = { engine, frames: ctx.frames, config: ctx.config };
  return engine;
}
