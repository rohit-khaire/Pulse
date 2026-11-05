/**
 * Per-frame intel (win probability + my fantasy points/rank) for the whole match.
 * Chunked job so precomputation never blocks the main thread.
 */
import type { Frame, TeamSelection } from '../engine/types';
import { computeLeaderboard } from '../engine/league';
import { stepWinProbBuild, winProbForFrame } from './winprob';
import type { IntelContext } from './types';

export interface FrameIntel {
  frameIndex: number;
  /** P(side batting first wins) / P(side chasing wins) */
  batFirst: number;
  chase: number;
  myPts: number;
  myRank: number;
}

export function frameIntel(ctx: IntelContext, sel: TeamSelection, frame: Frame): FrameIntel {
  const wp = winProbForFrame(frame);
  const lb = computeLeaderboard(frame, null, sel, ctx.config);
  const me = lb.find((e) => e.isUser);
  return {
    frameIndex: frame.i,
    batFirst: wp.batFirst,
    chase: wp.chase,
    myPts: me?.totalPts ?? 0,
    myRank: me?.rank ?? 1,
  };
}

export interface TimelineJob {
  step(budgetMs?: number): boolean;
  progress(): number;
  result(): FrameIntel[];
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export function createTimelineJob(ctx: IntelContext, sel: TeamSelection): TimelineJob {
  const out: FrameIntel[] = [];
  const total = ctx.frames.length;
  return {
    step(budgetMs = 8) {
      const t0 = now();
      if (!stepWinProbBuild(budgetMs)) return false; // model first
      while (out.length < total) {
        out.push(frameIntel(ctx, sel, ctx.frames[out.length]));
        if (now() - t0 >= budgetMs) break;
      }
      return out.length >= total;
    },
    progress: () => (total === 0 ? 1 : out.length / total),
    result: () => out,
  };
}

/** Synchronous version (tests / server). */
export function computeFrameTimeline(ctx: IntelContext, sel: TeamSelection): FrameIntel[] {
  const job = createTimelineJob(ctx, sel);
  while (!job.step(1e9));
  return job.result();
}
