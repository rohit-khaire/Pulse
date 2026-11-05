/**
 * Over Predictor — pure, deterministic game logic.
 *
 * Design rule: *progress is always DERIVED* from (overs, predictions, cursor).
 * We never accumulate XP incrementally, so scrubbing back, replaying or jumping
 * around can never leave the score in a wrong state: an over only "counts" while
 * the replay cursor is at or past its final ball.
 *
 * No React, no store, no randomness.
 */

import type { Frame } from '../engine/types';
import type { Lang } from './text';

export type RunsBand = '0-5' | '6-10' | '11+';
export const RUNS_BANDS: readonly RunsBand[] = ['0-5', '6-10', '11+'] as const;

/** Death overs = overs 17-20 (0-based over index >= 16). */
export const DEATH_OVER_START = 16;

export const XP = {
  band: 10,
  wicketYes: 20,
  wicketNo: 6,
  perfectBonus: 10,
} as const;

export function bandOf(runs: number): RunsBand {
  if (runs <= 5) return '0-5';
  if (runs <= 10) return '6-10';
  return '11+';
}

/** Combo multiplier carried INTO an over, from the current band-hit streak. */
export function comboMultiplier(streak: number): number {
  const table = [1, 1, 1.5, 2, 2.5, 3];
  return table[Math.max(0, Math.min(streak, table.length - 1))];
}

type FrameLike = Pick<Frame, 'i' | 'innings' | 'over' | 'bowler'> & {
  delivery: Pick<Frame['delivery'], 'runsTotal' | 'wickets' | 'isLegal'>;
};

export interface OverInfo {
  key: string; // `${innings}-${over}`
  innings: number; // 1 | 2
  over: number; // 0-based
  startFrame: number; // first ball of the over
  endFrame: number; // last ball of the over (inclusive)
  runs: number; // all runs in the over (bat + extras)
  wickets: number;
  legalBalls: number;
  bowler: string;
  isDeath: boolean;
  label: string; // "Over 17" (1-based, innings shown separately in UI)
}

/** Group frames (skipping the pre-match frame 0) into overs. */
export function buildOvers(frames: readonly FrameLike[]): OverInfo[] {
  const overs: OverInfo[] = [];
  let cur: OverInfo | null = null;
  for (let idx = 1; idx < frames.length; idx++) {
    const f = frames[idx];
    const key = `${f.innings}-${f.over}`;
    if (!cur || cur.key !== key) {
      cur = {
        key,
        innings: f.innings,
        over: f.over,
        startFrame: idx,
        endFrame: idx,
        runs: 0,
        wickets: 0,
        legalBalls: 0,
        bowler: f.bowler,
        isDeath: f.over >= DEATH_OVER_START,
        label: `Over ${f.over + 1}`,
      };
      overs.push(cur);
    }
    cur.endFrame = idx;
    cur.runs += f.delivery.runsTotal;
    cur.wickets += f.delivery.wickets?.length ?? 0;
    if (f.delivery.isLegal) cur.legalBalls += 1;
  }
  return overs;
}

export interface Prediction {
  overKey: string;
  band: RunsBand;
  wicket: boolean;
  madeAtCursor: number;
  /** Over had already been watched when the pick was made -> 0 XP, no streak effect. */
  practice: boolean;
}

/** The first over that has not started yet. null when the match is over. */
export function upcomingOver(overs: readonly OverInfo[], cursor: number): OverInfo | null {
  return overs.find((o) => o.startFrame > cursor) ?? null;
}

export interface PredictGate {
  allowed: boolean;
  practice: boolean;
  reason?: 'already_started' | 'already_predicted';
}

/**
 * A pick is allowed only before the over starts. If the fan has *ever* watched past the
 * start of that over (maxSeen, e.g. before scrubbing back) the pick is practice-only.
 */
export function canPredict(
  over: OverInfo,
  cursor: number,
  maxSeen: number,
  existing?: Prediction | null
): PredictGate {
  if (existing) return { allowed: false, practice: existing.practice, reason: 'already_predicted' };
  if (over.startFrame <= cursor) return { allowed: false, practice: false, reason: 'already_started' };
  return { allowed: true, practice: over.startFrame <= maxSeen };
}

export function makePrediction(
  over: OverInfo,
  band: RunsBand,
  wicket: boolean,
  cursor: number,
  maxSeen: number
): Prediction | null {
  const gate = canPredict(over, cursor, maxSeen);
  if (!gate.allowed) return null;
  return { overKey: over.key, band, wicket, madeAtCursor: cursor, practice: gate.practice };
}

export type BadgeId = 'first_hit' | 'hot_streak' | 'crystal_ball' | 'death_whisperer' | 'wicket_hunter';

export interface BadgeDef {
  id: BadgeId;
  title: string;
  desc: Record<Lang, string>;
}

export const BADGES: Record<BadgeId, BadgeDef> = {
  first_hit: {
    id: 'first_hit',
    title: 'Pehli Jeet',
    desc: {
      en: 'Called your first over band correctly.',
      hinglish: 'Pehla over band sahi guess kiya.',
      hi: 'पहला ओवर बैंड सही पहचाना।',
    },
  },
  hot_streak: {
    id: 'hot_streak',
    title: 'Hot Streak',
    desc: {
      en: '3 over bands in a row.',
      hinglish: 'Lagatar 3 over band sahi.',
      hi: 'लगातार 3 ओवर बैंड सही।',
    },
  },
  crystal_ball: {
    id: 'crystal_ball',
    title: 'Crystal Ball',
    desc: {
      en: '2 perfect overs in a row (runs band + wicket call).',
      hinglish: 'Lagatar 2 perfect over (runs band + wicket dono sahi).',
      hi: 'लगातार 2 परफेक्ट ओवर (रन बैंड + विकेट दोनों सही)।',
    },
  },
  death_whisperer: {
    id: 'death_whisperer',
    title: 'Death Overs Whisperer',
    desc: {
      en: '3 correct run bands in overs 17-20.',
      hinglish: 'Overs 17-20 mein 3 run band sahi.',
      hi: 'ओवर 17-20 में 3 रन बैंड सही।',
    },
  },
  wicket_hunter: {
    id: 'wicket_hunter',
    title: 'Wicket Hunter',
    desc: {
      en: 'Called 2 wickets before they fell.',
      hinglish: 'Wicket girne se pehle 2 baar sahi bola.',
      hi: 'विकेट गिरने से पहले 2 बार सही बताया।',
    },
  },
};

export const BADGE_IDS = Object.keys(BADGES) as BadgeId[];

export interface OverResult {
  over: OverInfo;
  prediction: Prediction;
  bandHit: boolean;
  wicketHit: boolean;
  perfect: boolean;
  counted: boolean; // false for practice picks
  streakBefore: number;
  streakAfter: number;
  multiplier: number;
  xp: number;
}

export interface BadgeUnlock {
  id: BadgeId;
  overKey: string;
}

export interface Progress {
  results: OverResult[]; // resolved, chronological (includes practice)
  pending: Prediction[]; // locked in, over not finished at this cursor
  xp: number;
  streak: number;
  bestStreak: number;
  nextMultiplier: number;
  played: number; // counted results
  bandHits: number;
  perfectCount: number;
  accuracy: number; // % of counted overs with the right band (integer)
  badges: BadgeUnlock[];
}

export function computeProgress(
  overs: readonly OverInfo[],
  predictions: Readonly<Record<string, Prediction>>,
  cursor: number
): Progress {
  const results: OverResult[] = [];
  const pending: Prediction[] = [];
  const badges: BadgeUnlock[] = [];
  const unlock = (id: BadgeId, overKey: string) => {
    if (!badges.some((b) => b.id === id)) badges.push({ id, overKey });
  };

  let xp = 0;
  let streak = 0;
  let bestStreak = 0;
  let perfectRun = 0;
  let perfectCount = 0;
  let played = 0;
  let bandHits = 0;
  let deathHits = 0;
  let wicketCalls = 0;

  for (const over of overs) {
    const prediction = predictions[over.key];
    if (!prediction) continue;
    if (over.endFrame > cursor) {
      pending.push(prediction);
      continue;
    }

    const bandHit = bandOf(over.runs) === prediction.band;
    const actualWicket = over.wickets > 0;
    const wicketHit = actualWicket === prediction.wicket;
    const perfect = bandHit && wicketHit;

    if (prediction.practice) {
      results.push({
        over,
        prediction,
        bandHit,
        wicketHit,
        perfect,
        counted: false,
        streakBefore: streak,
        streakAfter: streak,
        multiplier: 1,
        xp: 0,
      });
      continue;
    }

    const multiplier = comboMultiplier(streak);
    const base =
      (bandHit ? XP.band : 0) +
      (wicketHit ? (prediction.wicket ? XP.wicketYes : XP.wicketNo) : 0) +
      (perfect ? XP.perfectBonus : 0);
    const gained = Math.round(base * multiplier);

    const streakBefore = streak;
    streak = bandHit ? streak + 1 : 0;
    bestStreak = Math.max(bestStreak, streak);
    perfectRun = perfect ? perfectRun + 1 : 0;

    played += 1;
    xp += gained;
    if (bandHit) bandHits += 1;
    if (perfect) perfectCount += 1;
    if (bandHit && over.isDeath) deathHits += 1;
    if (prediction.wicket && wicketHit) wicketCalls += 1;

    if (bandHit) unlock('first_hit', over.key);
    if (streak >= 3) unlock('hot_streak', over.key);
    if (perfectRun >= 2) unlock('crystal_ball', over.key);
    if (deathHits >= 3) unlock('death_whisperer', over.key);
    if (wicketCalls >= 2) unlock('wicket_hunter', over.key);

    results.push({
      over,
      prediction,
      bandHit,
      wicketHit,
      perfect,
      counted: true,
      streakBefore,
      streakAfter: streak,
      multiplier,
      xp: gained,
    });
  }

  return {
    results,
    pending,
    xp,
    streak,
    bestStreak,
    nextMultiplier: comboMultiplier(streak),
    played,
    bandHits,
    perfectCount,
    accuracy: played === 0 ? 0 : Math.round((bandHits / played) * 100),
    badges,
  };
}

/* ------------------------------------------------------------------ */
/* Celebrations: decide WHAT to celebrate, once, without UI.          */
/* ------------------------------------------------------------------ */

export type Celebration =
  | { level: 'none' }
  | { level: 'hit'; overKey: string }
  | { level: 'perfect'; overKey: string }
  | { level: 'badge'; badge: BadgeId };

export const resultKey = (overKey: string) => `r:${overKey}`;
export const badgeKey = (id: BadgeId) => `b:${id}`;

/**
 * @param celebrated keys already celebrated (persisted) so scrubbing back and forth never replays confetti
 * @param natural    true only when the cursor moved forward a few balls (normal playback). A big jump = silent.
 */
export function decideCelebration(
  progress: Progress,
  celebrated: Readonly<Record<string, true>>,
  natural: boolean
): { celebration: Celebration; markAsCelebrated: string[] } {
  const keys: string[] = [];
  const freshResults = progress.results.filter((r) => r.counted && !celebrated[resultKey(r.over.key)]);
  const freshBadges = progress.badges.filter((b) => !celebrated[badgeKey(b.id)]);
  for (const r of freshResults) keys.push(resultKey(r.over.key));
  for (const b of freshBadges) keys.push(badgeKey(b.id));

  if (!natural || keys.length === 0) return { celebration: { level: 'none' }, markAsCelebrated: keys };

  if (freshBadges.length > 0) {
    return { celebration: { level: 'badge', badge: freshBadges[freshBadges.length - 1].id }, markAsCelebrated: keys };
  }
  const perfect = [...freshResults].reverse().find((r) => r.perfect);
  if (perfect) {
    return { celebration: { level: 'perfect', overKey: perfect.over.key }, markAsCelebrated: keys };
  }
  const hit = [...freshResults].reverse().find((r) => r.bandHit);
  if (hit) {
    return { celebration: { level: 'hit', overKey: hit.over.key }, markAsCelebrated: keys };
  }
  return { celebration: { level: 'none' }, markAsCelebrated: keys };
}

/** Cheap identity for "is this still the same match?" so a stale persisted round is dropped. */
export function matchFingerprint(frames: readonly Pick<Frame, 'batter' | 'bowler'>[]): string {
  if (frames.length < 2) return '';
  return `${frames.length}:${frames[1].batter}:${frames[1].bowler}`;
}
