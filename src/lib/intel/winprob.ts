/**
 * WIN PROBABILITY — a documented parametric ball-outcome model solved exactly
 * by dynamic programming (no randomness at all, so results are deterministic).
 *
 * !! THIS IS AN APPROXIMATION !!  Every batter and bowler is treated as an
 * "average IPL player". Phase (powerplay / middle / death), wickets lost and
 * (in a chase) the required run-rate shape the outcome of each legal ball.
 * Parameters are hand-set to IPL-like scoring rates, NOT fitted to any
 * proprietary data, and extras are folded into the run distribution.
 * It explains the *shape* of a match; it is not betting or winning advice.
 *
 * Model per legal ball, given (overs bowled, wickets lost, intent):
 *   P(wicket)            = phaseWicketRate * (1 + WK_RISK*wicketsLost) * (1 + intentRisk)
 *   P(r | no wicket)    ∝ phaseRunDist[r] * exp(theta * r)         r ∈ {0,1,2,3,4,6}
 *   theta               = -TILT[phase]*wicketsLost + INTENT_TILT*intent
 *   intent (chase only) = clamp((requiredRate - 8.5)/6, -0.5, 1)
 *
 * Chase table  W[b][w][n] = P(chasing side wins | b balls left, w wickets lost, n runs needed)
 * First-innings table D[b][w][r] = P(score r more runs | b balls left, w wickets lost)
 * First innings win prob = Σ_r D[..][r] * (1 - W[120][0][runs+r+1])
 * (a tie is not modelled: needing exactly the first-innings score ends as a loss).
 */

export const MATCH_BALLS = 120;
export const MAX_NEED = 320; // runs-needed values above this are treated as ~0%
export const MODEL_LABEL = 'Model estimate — simplified ball-outcome simulation, not a prediction guarantee';

export const RUN_VALUES = [0, 1, 2, 3, 4, 6] as const;
export type Phase = 0 | 1 | 2; // powerplay, middle, death

interface PhaseParams {
  /** P(run value | no wicket) for RUN_VALUES, sums to 1 */
  runDist: readonly number[];
  wicketRate: number;
  /** exponential tilt per wicket lost (reduces scoring as wickets fall) */
  tilt: number;
}

export const PHASE_PARAMS: Record<Phase, PhaseParams> = {
  0: { runDist: [0.40, 0.32, 0.07, 0.01, 0.13, 0.07], wicketRate: 0.036, tilt: 0.012 },
  1: { runDist: [0.36, 0.37, 0.08, 0.01, 0.11, 0.07], wicketRate: 0.042, tilt: 0.012 },
  2: { runDist: [0.30, 0.32, 0.08, 0.01, 0.13, 0.16], wicketRate: 0.066, tilt: 0.004 },
};
const WK_RISK = 0.045;
const INTENT_TILT = 0.05;
const INTENT_WICKET_RISK = 0.6;
const BASE_RATE = 8.5;

export function phaseOf(ballsBowled: number): Phase {
  const over = Math.floor(ballsBowled / 6);
  return over < 6 ? 0 : over < 15 ? 1 : 2;
}

export interface BallProbs {
  pWicket: number;
  /** P(r | no wicket), aligned with RUN_VALUES (already normalised) */
  runProbs: number[];
  /** unconditional P(run value r on this ball), aligned with RUN_VALUES */
  pRuns: number[];
}

const probCache = new Map<number, BallProbs>();

/** Outcome probabilities of one legal ball. Single source of truth for DP and Monte Carlo. */
export function ballOutcomeProbs(ballsBowled: number, wicketsLost: number, intent = 0): BallProbs {
  const phase = phaseOf(ballsBowled);
  const iq = Math.round(intent * 20) / 20; // quantise for caching
  const key = (phase * 16 + wicketsLost) * 64 + Math.round((iq + 1) * 20);
  const hit = probCache.get(key);
  if (hit) return hit;

  const p = PHASE_PARAMS[phase];
  const theta = -p.tilt * wicketsLost + INTENT_TILT * iq;
  const w = p.runDist.map((q, k) => q * Math.exp(theta * RUN_VALUES[k]));
  const sum = w.reduce((a, b) => a + b, 0);
  const runProbs = w.map((x) => x / sum);
  const risk = (1 + WK_RISK * wicketsLost) * (1 + INTENT_WICKET_RISK * Math.max(0, iq) + 0.1 * Math.min(0, iq));
  const pWicket = Math.min(0.35, p.wicketRate * risk);
  const out: BallProbs = {
    pWicket,
    runProbs,
    pRuns: runProbs.map((x) => x * (1 - pWicket)),
  };
  probCache.set(key, out);
  return out;
}

export function chaseIntent(ballsLeft: number, runsNeeded: number): number {
  if (ballsLeft <= 0) return 1;
  const rrr = (runsNeeded * 6) / ballsLeft;
  return Math.max(-0.5, Math.min(1, (rrr - BASE_RATE) / 6));
}

// ---------------------------------------------------------------- tables

interface Tables {
  /** W[(b*11 + w)*(MAX_NEED+1) + n] */
  W: Float32Array;
  /** D[(b*11 + w)*(MAX_ADD+1) + r] */
  D: Float32Array;
}
const MAX_ADD = 320;
let tables: Tables | null = null;
const NW = 11;
const wIdx = (b: number, w: number, n: number) => (b * NW + w) * (MAX_NEED + 1) + n;
const dIdx = (b: number, w: number, r: number) => (b * NW + w) * (MAX_ADD + 1) + r;

interface Builder {
  t: Tables;
  nextB: number;
}
let builder: Builder | null = null;

function initBuilder(): Builder {
  const W = new Float32Array((MATCH_BALLS + 1) * NW * (MAX_NEED + 1));
  const D = new Float32Array((MATCH_BALLS + 1) * NW * (MAX_ADD + 1));
  for (let w = 0; w <= 10; w++) {
    for (let n = 0; n <= MAX_NEED; n++) W[wIdx(0, w, n)] = n <= 0 ? 1 : 0;
    D[dIdx(0, w, 0)] = 1;
  }
  return { t: { W, D }, nextB: 1 };
}

/** Fill the DP table for one value of "balls left". */
function buildRow(t: Tables, b: number): void {
  const { W, D } = t;
  const bowled = MATCH_BALLS - b;
  for (let n = 0; n <= MAX_NEED; n++) W[wIdx(b, 10, n)] = n <= 0 ? 1 : 0;
  D[dIdx(b, 10, 0)] = 1;
  for (let w = 0; w <= 9; w++) {
    // chase table
    for (let n = 0; n <= MAX_NEED; n++) {
      if (n <= 0) {
        W[wIdx(b, w, n)] = 1;
        continue;
      }
      const pr = ballOutcomeProbs(bowled, w, chaseIntent(b, n));
      let v = pr.pWicket * W[wIdx(b - 1, w + 1, n)];
      for (let k = 0; k < RUN_VALUES.length; k++) {
        const left = n - RUN_VALUES[k];
        v += pr.pRuns[k] * (left <= 0 ? 1 : W[wIdx(b - 1, w, left)]);
      }
      W[wIdx(b, w, n)] = v;
    }
    // first-innings additional-runs distribution
    const pr = ballOutcomeProbs(bowled, w, 0);
    const base = dIdx(b, w, 0);
    const nextW = dIdx(b - 1, w + 1, 0);
    for (let r = 0; r <= MAX_ADD; r++) D[base + r] += pr.pWicket * D[nextW + r];
    const nextS = dIdx(b - 1, w, 0);
    for (let k = 0; k < RUN_VALUES.length; k++) {
      const add = RUN_VALUES[k];
      const p = pr.pRuns[k];
      for (let r = add; r <= MAX_ADD; r++) D[base + r] += p * D[nextS + r - add];
    }
  }
}

/** Advance the table build for ~budgetMs. Returns true when the model is ready. */
export function stepWinProbBuild(budgetMs = 8): boolean {
  if (tables) return true;
  if (!builder) builder = initBuilder();
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  while (builder.nextB <= MATCH_BALLS) {
    buildRow(builder.t, builder.nextB++);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (now - start >= budgetMs) break;
  }
  if (builder.nextB > MATCH_BALLS) {
    tables = builder.t;
    builder = null;
    return true;
  }
  return false;
}

export function isWinProbModelReady(): boolean {
  return tables !== null;
}

function getTables(): Tables {
  if (!tables) stepWinProbBuild(Infinity); // synchronous completion (tests / SSR)
  return tables as Tables;
}

/** Warm the tables synchronously. Prefer stepWinProbBuild() in the browser. */
export function warmWinProbModel(): void {
  getTables();
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** P(chasing side wins) for a chase state. */
export function chaseWinProb(ballsLeft: number, wicketsLost: number, runsNeeded: number): number {
  if (runsNeeded <= 0) return 1;
  if (wicketsLost >= 10 || ballsLeft <= 0) return 0;
  if (runsNeeded > MAX_NEED) return 0;
  const b = Math.min(MATCH_BALLS, Math.max(0, Math.round(ballsLeft)));
  const w = Math.min(10, Math.max(0, Math.round(wicketsLost)));
  return clamp01(getTables().W[(b * 11 + w) * (MAX_NEED + 1) + Math.round(runsNeeded)]);
}

/** P(chasing side wins) from the very start of a chase of `target` runs. */
export function chaseWinProbFromStart(target: number): number {
  return chaseWinProb(MATCH_BALLS, 0, target);
}

/** Distribution of additional runs the batting-first side will score. */
export function firstInningsAddDist(ballsLeft: number, wicketsLost: number): Float32Array {
  const b = Math.min(MATCH_BALLS, Math.max(0, Math.round(ballsLeft)));
  const w = Math.min(10, Math.max(0, Math.round(wicketsLost)));
  const start = (b * 11 + w) * (MAX_ADD + 1);
  return getTables().D.subarray(start, start + MAX_ADD + 1);
}

/** Expected final score of the batting-first side. */
export function projectedFirstInningsScore(runs: number, ballsLeft: number, wicketsLost: number): number {
  if (wicketsLost >= 10 || ballsLeft <= 0) return runs;
  const d = firstInningsAddDist(ballsLeft, wicketsLost);
  let e = 0;
  for (let r = 0; r < d.length; r++) e += r * d[r];
  return runs + e;
}

/** P(batting-first side wins) while the first innings is in progress. */
export function firstInningsWinProb(runs: number, ballsLeft: number, wicketsLost: number): number {
  if (wicketsLost >= 10 || ballsLeft <= 0) return clamp01(1 - chaseWinProbFromStart(runs + 1));
  const d = firstInningsAddDist(ballsLeft, wicketsLost);
  let p = 0;
  for (let r = 0; r < d.length; r++) {
    if (d[r] > 0) p += d[r] * (1 - chaseWinProbFromStart(runs + r + 1));
  }
  return clamp01(p);
}

// ---------------------------------------------------------------- frames

export interface WinProbFrameInput {
  innings: number;
  runs: number;
  wickets: number;
  /** legal balls bowled in this innings */
  ballsBowled: number;
  target?: number;
}

export interface WinProbPoint {
  frameIndex: number;
  /** P(side batting first wins) */
  batFirst: number;
  /** P(side chasing wins) = 1 - batFirst */
  chase: number;
}

/** "5.2" -> 32 legal balls */
export function oversStrToBalls(oversStr: string): number {
  const [o, b] = oversStr.split('.');
  return (parseInt(o, 10) || 0) * 6 + (parseInt(b, 10) || 0);
}

export function winProbForState(s: WinProbFrameInput): { batFirst: number; chase: number } {
  const ballsLeft = Math.max(0, MATCH_BALLS - s.ballsBowled);
  let chase: number;
  if (s.innings >= 2 && s.target !== undefined) {
    chase = chaseWinProb(ballsLeft, s.wickets, s.target - s.runs);
  } else {
    chase = 1 - firstInningsWinProb(s.runs, ballsLeft, s.wickets);
  }
  chase = clamp01(chase);
  return { batFirst: 1 - chase, chase };
}

interface FrameLike {
  i: number;
  innings: number;
  target?: number;
  currentScore: { runs: number; wickets: number; oversStr: string };
}

export function winProbForFrame(f: FrameLike): WinProbPoint {
  const { batFirst, chase } = winProbForState({
    innings: f.innings,
    runs: f.currentScore.runs,
    wickets: f.currentScore.wickets,
    ballsBowled: oversStrToBalls(f.currentScore.oversStr),
    target: f.target,
  });
  return { frameIndex: f.i, batFirst, chase };
}

/**
 * Win probability for every frame. The innings-1 end-of-innings frame is exact
 * (all balls bowled); the first frame of innings 2 already uses the target.
 */
export function computeWinProbTimeline(frames: FrameLike[]): WinProbPoint[] {
  getTables();
  return frames.map(winProbForFrame);
}
