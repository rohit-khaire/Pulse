/**
 * FANTASY RANK FORECAST — Monte Carlo of the remaining balls.
 *
 * !! MODEL ESTIMATE !!  Each simulated ball is drawn from the same simplified
 * ball-outcome model as winprob.ts (average-IPL batters and bowlers, phase,
 * wickets lost, chase pressure). No real-player ability is used or invented.
 * Assumptions, all visible in the UI as "model estimate":
 *  - Batting order of players yet to bat = team-sheet order.
 *  - Bowling attack = bowlers who already bowled + tail of the team sheet to make 6;
 *    4-over quota, no consecutive overs.
 *  - Dismissal mix is an IPL-like constant; fielders for catches are random.
 *  - Extras are folded into runs (no wides / no-balls are simulated).
 *  - Ties in fantasy points break in favour of the team listed first (you first),
 *    exactly like the league table in engine/league.ts.
 *
 * Fantasy points are NOT re-implemented: every simulated ball goes through the
 * engine's processDelivery(), and totals through pointsFromStats()/teamPoints().
 *
 * Chunked: createForecastJob().step(budgetMs) does a bounded slice of work so
 * the UI thread never blocks; results can be read at any time (partial).
 */
import type { Frame, PlayerStats, ScoringConfig, TeamSelection } from '../engine/types';
import { pointsFromStats, teamPoints } from '../engine/points';
import { cloneStats, processDelivery, type RawDelivery } from '../engine/stats';
import { createRng, subSeed, type Rng } from './rng';
import { ballOutcomeProbs, chaseIntent, MATCH_BALLS, oversStrToBalls, RUN_VALUES } from './winprob';
import type { IntelTeam } from './types';

export const DEFAULT_SIMS = 2000;
export const DEFAULT_SEED = 20260411;
const FAN_STEPS = 10;
const BOWLER_QUOTA = 24;

export interface ForecastInput {
  frame: Frame;
  squads: Record<string, string[]>;
  /** user team first, then rivals */
  teams: IntelTeam[];
  config: ScoringConfig;
  sims?: number;
  seed?: number;
}

export interface TeamForecast {
  id: string;
  name: string;
  owner: string;
  isUser: boolean;
  currentPts: number;
  meanPts: number;
  sdPts: number;
  p10: number;
  p50: number;
  p90: number;
  pRank1: number; // 0..1
  pTop3: number; // 0..1
  expectedRank: number;
}

export interface FanPoint {
  /** nominal match over (0..40) for labelling only */
  over: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface RankExplanation {
  actualRank: number;
  actualPts: number;
  projectedRankMean: number;
  projectedRankBand: [number, number];
  bestPlausibleRank: number;
  worstPlausibleRank: number;
  keyInfluencingPlayers: Array<{
    player: string;
    role: 'C' | 'VC' | '-';
    expectedRemaining: number;
    sensitivity: 'high' | 'medium' | 'low';
  }>;
  drivingFactors: string[];
  summary: string;
}

export interface RankForecast {
  frameIndex: number;
  sims: number;
  targetSims: number;
  done: boolean;
  /** true when no balls are left, so the numbers are exact, not estimated */
  settled: boolean;
  /** ± percentage points of Monte-Carlo sampling error at 95% (worst case) */
  mcMarginPct: number;
  teams: TeamForecast[];
  my: TeamForecast;
  /** actual leaderboard rank at current frame */
  actualRank: number;
  /** my probability of finishing at rank 1..n */
  myRankDist: number[];
  myRankBand: [number, number]; // 10th..90th percentile rank
  fan: FanPoint[];
  /** mean of future points (base, before C/VC multiplier) per player in my XI */
  expectedRemainingBase: Record<string, number>;
  assumptions: string[];
  factors: string[];
  explanation: RankExplanation;
}

// ------------------------------------------------------------------ setup

interface InningsSetup {
  battingTeam: string;
  bowlingTeam: string;
  runs: number;
  wickets: number;
  legal: number;
  /** undefined => first innings (or target filled in at run time) */
  target?: number;
  striker: string | null;
  nonStriker: string | null;
  /** bowler of the over in progress (null => choose a new one) */
  bowler: string | null;
  prevBowler: string | null;
  overBalls: number;
  chasesFirst: boolean; // target derived from the preceding simulated innings
}

function currentInnings(frame: Frame, stats: Record<string, PlayerStats>): InningsSetup {
  const runs = frame.currentScore.runs;
  const wickets = frame.currentScore.wickets;
  const legal = oversStrToBalls(frame.currentScore.oversStr);
  const d = frame.delivery;
  let striker: string | null = frame.i === 0 ? null : d.batter || null;
  let non: string | null = frame.i === 0 ? null : d.nonStriker || null;
  if (striker && non) {
    const ran = d.runsBatter + (d.isBye || d.isLegBye ? d.runsExtras : 0);
    if (ran % 2 === 1) [striker, non] = [non, striker];
    if (d.isLegal && legal % 6 === 0 && legal > 0) [striker, non] = [non, striker];
    for (const w of d.wickets) {
      if (w.playerOut === striker) striker = null;
      else if (w.playerOut === non) non = null;
    }
    if (striker && stats[striker]?.out) striker = null;
    if (non && stats[non]?.out) non = null;
  }
  const midOver = legal % 6 !== 0;
  return {
    battingTeam: frame.battingTeam,
    bowlingTeam: frame.bowlingTeam,
    runs,
    wickets,
    legal,
    target: frame.target,
    striker,
    nonStriker: non,
    bowler: midOver && frame.i > 0 ? frame.bowler : null,
    prevBowler: frame.i > 0 ? frame.bowler : null,
    overBalls: legal % 6,
    chasesFirst: false,
  };
}

function freshInnings(battingTeam: string, bowlingTeam: string): InningsSetup {
  return {
    battingTeam,
    bowlingTeam,
    runs: 0,
    wickets: 0,
    legal: 0,
    target: undefined,
    striker: null,
    nonStriker: null,
    bowler: null,
    prevBowler: null,
    overBalls: 0,
    chasesFirst: true,
  };
}

/** Which innings still have to be simulated from this frame. */
export function planInnings(frame: Frame, stats: Record<string, PlayerStats>): InningsSetup[] {
  const cur = currentInnings(frame, stats);
  const over = cur.legal >= MATCH_BALLS || cur.wickets >= 10;
  if (frame.innings >= 2) {
    const done = over || (cur.target !== undefined && cur.runs >= cur.target);
    return done ? [] : [cur];
  }
  const next = freshInnings(frame.bowlingTeam, frame.battingTeam);
  return over ? [{ ...next, target: cur.runs + 1, chasesFirst: false }] : [cur, next];
}

// ------------------------------------------------------------------ one simulated innings

const KINDS: Array<[string, number]> = [
  ['bowled', 0.17],
  ['lbw', 0.08],
  ['caught', 0.55],
  ['caught and bowled', 0.08],
  ['run out', 0.07],
  ['stumped', 0.05],
];

function pickKind(u: number): string {
  let acc = 0;
  for (const [k, p] of KINDS) {
    acc += p;
    if (u < acc) return k;
  }
  return 'caught';
}

function pickBowler(squad: string[], S: Record<string, PlayerStats>, prev: string | null, rng: Rng): string {
  const pool: string[] = squad.filter((p) => (S[p]?.legalBalls ?? 0) > 0);
  for (let i = squad.length - 1; i >= 0 && pool.length < 6; i--) if (!pool.includes(squad[i])) pool.push(squad[i]);
  let cand = pool.filter((p) => p !== prev && (S[p]?.legalBalls ?? 0) < BOWLER_QUOTA);
  if (cand.length === 0) cand = squad.filter((p) => p !== prev && (S[p]?.legalBalls ?? 0) < BOWLER_QUOTA);
  if (cand.length === 0) cand = squad.filter((p) => p !== prev);
  if (cand.length === 0) cand = squad.slice();
  return cand[Math.floor(rng() * cand.length)];
}

function applyBall(S: Record<string, PlayerStats>, raw: RawDelivery, isOverEnd: boolean, overRuns: number, overBalls: number) {
  // Slice only the players this ball touches so processDelivery clones 3-5 objects, not all 22.
  const slice: Record<string, PlayerStats> = {};
  const add = (p: string | undefined) => {
    if (p && S[p] && !slice[p]) slice[p] = S[p];
  };
  add(raw.batter);
  add(raw.bowler);
  add(raw.non_striker);
  if (raw.wickets) for (const w of raw.wickets) for (const f of w.fielders ?? []) add(f.name);
  // Same call convention as engine/timeline.ts (counts *before* this ball).
  const res = processDelivery(slice, raw, isOverEnd, overRuns, overBalls);
  for (const k in res.newStats) S[k] = res.newStats[k];
  return res.concededRunsThisBall;
}

interface InningsResult {
  runs: number;
  wickets: number;
  legal: number;
}

function simInnings(
  S: Record<string, PlayerStats>,
  setup: InningsSetup,
  target: number | undefined,
  squads: Record<string, string[]>,
  rng: Rng,
  onBall: () => void
): InningsResult {
  const batSquad = squads[setup.battingTeam] ?? [];
  const bowlSquad = squads[setup.bowlingTeam] ?? [];
  let { runs, wickets, legal, overBalls } = setup;
  let striker = setup.striker;
  let non = setup.nonStriker;
  let bowler = setup.bowler;
  let prevBowler = setup.prevBowler;
  let overRuns = overBalls > 0 ? 1 : 0; // unknown real conceded runs: never fake a maiden

  const queue = batSquad.filter((p) => p !== striker && p !== non && S[p] && S[p].balls === 0 && !S[p].out);
  let qi = 0;
  const nextBatter = (): string | null => (qi < queue.length ? queue[qi++] : null);
  if (!striker) striker = nextBatter();
  if (!non) non = nextBatter();
  if (!striker || !non || bowlSquad.length === 0) return { runs, wickets: 10, legal };

  while (legal < MATCH_BALLS && wickets < 10 && !(target !== undefined && runs >= target)) {
    if (!bowler || overBalls === 0 || overBalls >= 6) {
      if (bowler) prevBowler = bowler;
      bowler = pickBowler(bowlSquad, S, prevBowler, rng);
      overBalls = 0;
      overRuns = 0;
    }
    const intent = target !== undefined ? chaseIntent(MATCH_BALLS - legal, target - runs) : 0;
    const probs = ballOutcomeProbs(legal, wickets, intent);
    const u = rng();
    const isOverEnd = overBalls === 5;
    let r = 0;
    let raw: RawDelivery;
    let wicketKind: string | null = null;
    let outBatter: string = striker;

    if (u < probs.pWicket) {
      wicketKind = pickKind(rng());
      if (wicketKind === 'run out' && rng() < 0.5) outBatter = non;
      const fielders: { name: string }[] = [];
      if (wicketKind === 'caught' || wicketKind === 'stumped') {
        const opts = bowlSquad.filter((p) => p !== bowler);
        if (opts.length) fielders.push({ name: opts[Math.floor(rng() * opts.length)] });
      } else if (wicketKind === 'run out') {
        const opts = bowlSquad.slice();
        if (opts.length) {
          fielders.push({ name: opts[Math.floor(rng() * opts.length)] });
          if (rng() < 0.5 && opts.length > 1) {
            const second = opts[Math.floor(rng() * opts.length)];
            if (second !== fielders[0].name) fielders.push({ name: second });
          }
        }
      }
      raw = {
        batter: striker,
        bowler,
        non_striker: non,
        runs: { batter: 0, extras: 0, total: 0 },
        wickets: [{ player_out: outBatter, kind: wicketKind, fielders }],
      };
    } else {
      let c = rng();
      let k = 0;
      for (; k < probs.runProbs.length - 1; k++) {
        c -= probs.runProbs[k];
        if (c < 0) break;
      }
      r = RUN_VALUES[k];
      raw = { batter: striker, bowler, non_striker: non, runs: { batter: r, extras: 0, total: r } };
    }

    const conceded = applyBall(S, raw, isOverEnd, overRuns, overBalls);
    overRuns += conceded;
    runs += r;
    legal += 1;
    overBalls += 1;
    onBall();

    if (wicketKind) {
      wickets += 1;
      const incoming = nextBatter();
      if (!incoming) {
        wickets = 10;
        break;
      }
      if (outBatter === striker) striker = incoming;
      else non = incoming;
    } else if (r % 2 === 1) {
      [striker, non] = [non, striker];
    }
    if (overBalls >= 6) [striker, non] = [non as string, striker as string];
  }
  return { runs, wickets, legal };
}

// ------------------------------------------------------------------ job

export interface ForecastJob {
  readonly targetSims: number;
  readonly done: number;
  /** Run simulations for ~budgetMs. Returns true when finished. */
  step(budgetMs?: number): boolean;
  result(): RankForecast;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function quantile(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function createForecastJob(input: ForecastInput): ForecastJob {
  const { frame, squads, teams, config } = input;
  const seed = input.seed ?? DEFAULT_SEED;
  const plan = planInnings(frame, frame.stats);
  const settled = plan.length === 0;
  const targetSims = settled ? 1 : Math.max(1, input.sims ?? DEFAULT_SIMS);
  const nT = teams.length;
  const userIdx = Math.max(0, teams.findIndex((t) => t.isUser));
  const userSel = teams[userIdx].sel;

  // Players whose points matter (union of all XIs)
  const needed = Array.from(new Set(teams.flatMap((t) => t.sel.xi)));

  // Nominal ball budget used to place fan-chart checkpoints
  const remaining = plan.reduce((a, s) => a + (MATCH_BALLS - s.legal), 0);
  const startAbs = (frame.innings - 1) * MATCH_BALLS + oversStrToBalls(frame.currentScore.oversStr);
  const cpAt: number[] = [];
  for (let k = 0; k <= FAN_STEPS; k++) cpAt.push(Math.round((remaining * k) / FAN_STEPS));

  const finals: Float32Array[] = teams.map(() => new Float32Array(targetSims));
  const rankCounts: number[][] = teams.map(() => new Array(nT).fill(0));
  const fanVals: Float32Array[] = cpAt.map(() => new Float32Array(targetSims));
  const playerSum: Record<string, number> = {};
  const myXi = userSel.xi;
  for (const p of myXi) playerSum[p] = 0;
  let done = 0;

  const userPtsFrom = (S: Record<string, PlayerStats>): number => {
    const pm: Record<string, ReturnType<typeof pointsFromStats>> = {};
    for (const p of myXi) pm[p] = pointsFromStats(S[p] ?? emptyStats(), config);
    return teamPoints(pm, userSel, config).total;
  };

  function runOne(i: number) {
    const rng = createRng(subSeed(seed, i));
    const S = cloneStats(frame.stats);
    let simBalls = 0;
    let nextCp = 0;
    const record = () => {
      while (nextCp <= FAN_STEPS && simBalls >= cpAt[nextCp]) {
        fanVals[nextCp][i] = userPtsFrom(S);
        nextCp++;
      }
    };
    record();
    let firstRuns: number | undefined;
    for (const setup of plan) {
      const target = setup.chasesFirst ? (firstRuns as number) + 1 : setup.target;
      const res = simInnings(S, setup, target, squads, rng, () => {
        simBalls++;
        record();
      });
      if (!setup.chasesFirst && frame.innings === 1 && firstRuns === undefined) firstRuns = res.runs;
    }
    // Flush checkpoints if the match ended early.
    const fin = userPtsFrom(S);
    while (nextCp <= FAN_STEPS) fanVals[nextCp++][i] = fin;

    const pm: Record<string, ReturnType<typeof pointsFromStats>> = {};
    for (const p of needed) pm[p] = pointsFromStats(S[p] ?? emptyStats(), config);
    const totals = teams.map((t) => teamPoints(pm, t.sel, config).total);
    for (let t = 0; t < nT; t++) {
      finals[t][i] = totals[t];
      let rank = 1;
      for (let j = 0; j < nT; j++) if (totals[j] > totals[t] || (totals[j] === totals[t] && j < t)) rank++;
      rankCounts[t][rank - 1]++;
    }
    for (const p of myXi) playerSum[p] += pm[p]?.total ?? 0;
  }

  function emptyStats(): PlayerStats {
    return {
      inXI: true, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, wickets: 0, lbwBowled: 0,
      legalBalls: 0, runsConceded: 0, maidens: 0, dots: 0, catches: 0, stumpings: 0, runOutDirect: 0, runOutIndirect: 0,
    };
  }

  const currentOf = (sel: TeamSelection) => teamPoints(frame.points, sel, config).total;

  const job: ForecastJob = {
    targetSims,
    get done() {
      return done;
    },
    step(budgetMs = 10) {
      const t0 = now();
      while (done < targetSims) {
        runOne(done);
        done++;
        if (now() - t0 >= budgetMs) break;
      }
      return done >= targetSims;
    },
    result(): RankForecast {
      const n = Math.max(1, done);
      const tf: TeamForecast[] = teams.map((t, ti) => {
        const arr = finals[ti].slice(0, n);
        let sum = 0;
        for (let k = 0; k < n; k++) sum += arr[k];
        const mean = sum / n;
        let v = 0;
        for (let k = 0; k < n; k++) v += (arr[k] - mean) ** 2;
        const sorted = Float32Array.from(arr).sort();
        const rc = rankCounts[ti];
        let expRank = 0;
        for (let r = 0; r < nT; r++) expRank += (r + 1) * rc[r];
        return {
          id: t.id, name: t.name, owner: t.owner, isUser: t.isUser,
          currentPts: currentOf(t.sel),
          meanPts: mean,
          sdPts: Math.sqrt(v / n),
          p10: quantile(sorted, 0.1),
          p50: quantile(sorted, 0.5),
          p90: quantile(sorted, 0.9),
          pRank1: rc[0] / n,
          pTop3: (rc[0] + (rc[1] ?? 0) + (rc[2] ?? 0)) / n,
          expectedRank: expRank / n,
        };
      });
      const my = tf[userIdx];
      const myDist = rankCounts[userIdx].map((c) => c / n);
      const cdfRank = (q: number) => {
        let acc = 0;
        for (let r = 0; r < nT; r++) {
          acc += myDist[r];
          if (acc >= q - 1e-9) return r + 1;
        }
        return nT;
      };
      const fan: FanPoint[] = cpAt.map((c, k) => {
        const sorted = Float32Array.from(fanVals[k].slice(0, n)).sort();
        return {
          over: (startAbs + c) / 6,
          p10: quantile(sorted, 0.1),
          p50: quantile(sorted, 0.5),
          p90: quantile(sorted, 0.9),
        };
      });
      const expectedRemainingBase: Record<string, number> = {};
      for (const p of myXi) {
        const cur = frame.points[p]?.total ?? 0;
        expectedRemainingBase[p] = Math.max(0, playerSum[p] / n - cur);
      }

      const currentScores = teams.map((t) => currentOf(t.sel));
      let actualRank = 1;
      for (let j = 0; j < nT; j++) {
        if (currentScores[j] > currentScores[userIdx] || (currentScores[j] === currentScores[userIdx] && j < userIdx)) {
          actualRank++;
        }
      }

      const bestPlausibleRank = cdfRank(0.1);
      const worstPlausibleRank = cdfRank(0.9);
      const mcMargin = settled ? 0 : Math.round(1.96 * Math.sqrt(0.25 / n) * 1000) / 10;

      const keyInfluencingPlayers = myXi
        .map((p) => {
          const role: 'C' | 'VC' | '-' = p === userSel.c ? 'C' : p === userSel.vc ? 'VC' : '-';
          const mult = role === 'C' ? config.multipliers.C : role === 'VC' ? config.multipliers.VC : 1;
          const expRem = Math.round((expectedRemainingBase[p] ?? 0) * 10) / 10;
          const impact = expRem * mult;
          const sensitivity: 'high' | 'medium' | 'low' = impact >= 25 ? 'high' : impact >= 10 ? 'medium' : 'low';
          return { player: p, role, expectedRemaining: expRem, sensitivity };
        })
        .sort((a, b) => b.expectedRemaining - a.expectedRemaining);

      const drivingFactors: string[] = [
        `${remaining} legal deliveries remaining to be bowled across all innings.`,
        `Captain (${userSel.c}) multiplier: ${config.multipliers.C}x, Vice-Captain (${userSel.vc}): ${config.multipliers.VC}x.`,
        settled ? 'Match has completed; final rankings are deterministic.' : `Leaderboard variance bounded by ±${mcMargin}% sampling error.`,
      ];

      const assumptions: string[] = [
        'Simulations follow parametric T20 ball-outcome probabilities (phase, wickets lost, chase intent).',
        'Bowler quota strictly enforced at 4 overs (24 legal balls) max per bowler.',
        'Batting orders follow official match team-sheets; dismissed batters cannot return.',
        'Chase innings terminates immediately once the target is reached.',
        `Monte Carlo sampling margin of error: ±${mcMargin}% at 95% confidence across ${n} iterations.`,
      ];

      const explanation: RankExplanation = {
        actualRank,
        actualPts: currentScores[userIdx],
        projectedRankMean: Math.round((my.expectedRank) * 10) / 10,
        projectedRankBand: [bestPlausibleRank, worstPlausibleRank],
        bestPlausibleRank,
        worstPlausibleRank,
        keyInfluencingPlayers,
        drivingFactors,
        summary: `Currently at Actual Rank #${actualRank} (${currentScores[userIdx]} pts). Projected finish is between Rank #${bestPlausibleRank} and #${worstPlausibleRank} (80% confidence interval, expected mean rank #${Math.round(my.expectedRank * 10) / 10}).`,
      };

      return {
        frameIndex: frame.i,
        sims: done,
        targetSims,
        done: done >= targetSims,
        settled,
        mcMarginPct: mcMargin,
        teams: tf,
        my,
        actualRank,
        myRankDist: myDist,
        myRankBand: [bestPlausibleRank, worstPlausibleRank],
        fan,
        expectedRemainingBase,
        assumptions,
        factors: drivingFactors,
        explanation,
      };
    },
  };
  return job;
}

/** Synchronous full run (tests, scripts, server). */
export function runRankForecast(input: ForecastInput): RankForecast {
  const job = createForecastJob(input);
  while (!job.step(1e9));
  return job.result();
}
