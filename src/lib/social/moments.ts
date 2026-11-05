/**
 * Moments Reel logic — picks the moments worth sharing and writes captions.
 *
 * This is deliberately NOT StoryMode: StoryMode steps the replay cursor through moments that
 * touched the fan's XI. Here we score every key event by (fantasy swing + rank swing + clutch
 * factor), never move the cursor, and produce share-ready captions per language.
 *
 * Zero-math: every number printed in a caption is a field on the Moment, computed here.
 */

import type { Frame, KeyEvent, KeyEventType, ScoringConfig, TeamSelection } from '../engine/types';
import { teamPoints } from '../engine/points';
import { computeLeaderboard } from '../engine/league';
import { fmtSigned, shortName, type Lang } from './text';
import type { EventTag } from './payload';

export interface Moment {
  id: string;
  frameIndex: number;
  type: KeyEventType;
  tag: EventTag;
  innings: number;
  overLabel: string; // "19.6"
  headline: { en: string; hinglish: string };
  caption: Record<Lang, string>;
  delta: number; // fantasy-point swing for the fan's team on this ball
  rankBefore: number;
  rankAfter: number;
  score: number;
  /** numbers that appear in captions, for validation/tests */
  facts: number[];
}

const TYPE_WEIGHT: Partial<Record<KeyEventType, number>> = {
  HAUL: 30,
  MILESTONE: 20,
  WICKET: 12,
  MAIDEN: 10,
  SIX: 6,
};

export function overLabelOf(f: Pick<Frame, 'over' | 'ballInOver'>): string {
  return `${f.over}.${Math.max(1, f.ballInOver)}`;
}

function headlines(e: KeyEvent): { en: string; hinglish: string } | null {
  const d = (e.details ?? {}) as Record<string, any>;
  switch (e.type) {
    case 'HAUL': {
      const b = shortName(String(d.bowler ?? e.players[0] ?? ''));
      const n = Number(d.wickets ?? 0);
      return { en: `${b} takes ${n} wickets`, hinglish: `${b} ke ${n} wicket!` };
    }
    case 'WICKET': {
      const out = shortName(String(d.playerOut ?? ''));
      const b = shortName(String(d.bowler ?? ''));
      if (String(d.kind) === 'run out') return { en: `${out} run out`, hinglish: `${out} run out ho gaya` };
      return { en: `${b} gets ${out}`, hinglish: `${b} ne ${out} ko out kiya` };
    }
    case 'MILESTONE': {
      const b = shortName(String(d.batter ?? ''));
      const ms = Number(d.milestone ?? 0);
      return { en: `${b} reaches ${ms}`, hinglish: `${b} ke ${ms} run poore` };
    }
    case 'SIX': {
      const bat = shortName(String(d.batter ?? ''));
      const bowl = shortName(String(d.bowler ?? ''));
      return { en: `${bat} hits ${bowl} for six`, hinglish: `${bat} ka ${bowl} par chhakka` };
    }
    case 'MAIDEN': {
      const b = shortName(String(d.bowler ?? ''));
      return { en: `${b} bowls a maiden`, hinglish: `${b} ka maiden over` };
    }
    default:
      return null;
  }
}

function captionFor(
  lang: Lang,
  head: { en: string; hinglish: string },
  delta: number,
  before: number,
  after: number
): string {
  const h = (lang === 'en' ? head.en : head.hinglish).replace(/[.!\s]+$/, '');
  const impact =
    delta !== 0
      ? { en: `Your XI ${fmtSigned(delta)} pts.`, hinglish: `Tumhari team ${fmtSigned(delta)} pts.`, hi: `आपकी टीम ${fmtSigned(delta)} पॉइंट्स।` }[lang]
      : {
          en: 'Not your players, but it shaped the match.',
          hinglish: 'Tumhare players nahi the, par match yahin mudha.',
          hi: 'आपके खिलाड़ी नहीं थे, पर मैच यहीं पलटा।',
        }[lang];
  const rank =
    before === after
      ? { en: `Still #${after}.`, hinglish: `Rank abhi bhi #${after}.`, hi: `रैंक अब भी #${after}।` }[lang]
      : { en: `Rank #${before} → #${after}.`, hinglish: `Rank #${before} → #${after}.`, hi: `रैंक #${before} → #${after}।` }[lang];
  return `${h}. ${impact} ${rank}`;
}

/** Score every key event once. Cheap enough to memoise on (frames, events, team). */
export function buildMomentCandidates(
  frames: readonly Frame[],
  events: readonly KeyEvent[],
  team: TeamSelection,
  config: ScoringConfig
): Moment[] {
  const bestByFrame = new Map<number, Moment>();

  for (const e of events) {
    const weight = TYPE_WEIGHT[e.type];
    if (weight === undefined) continue;
    const frame = frames[e.frameIndex];
    const prev = frames[e.frameIndex - 1];
    if (!frame || !prev) continue;
    const head = headlines(e);
    if (!head) continue;

    const delta = teamPoints(frame.points, team, config).total - teamPoints(prev.points, team, config).total;
    const board = computeLeaderboard(frame, prev, team, config);
    const you = board.find((x) => x.isUser);
    const rankAfter = you?.rank ?? 1;
    const rankBefore = you?.prevRank ?? rankAfter;

    const clutch = frame.innings === 2 && frame.over >= 17 ? 25 : 0;
    // A 5-wicket haul outranks a 4-wicket haul even when the fantasy swing is identical.
    const haulBonus = e.type === 'HAUL' ? 5 * (Number((e.details as Record<string, unknown> | undefined)?.wickets ?? 3) - 3) : 0;
    const score = weight + haulBonus + Math.abs(delta) + 15 * Math.abs(rankBefore - rankAfter) + clutch;

    const facts = [delta, rankBefore, rankAfter];
    const d = (e.details ?? {}) as Record<string, any>;
    if (e.type === 'HAUL') facts.push(Number(d.wickets ?? 0));
    if (e.type === 'MILESTONE') facts.push(Number(d.milestone ?? 0));

    const m: Moment = {
      id: `m-${e.frameIndex}-${e.type}`,
      frameIndex: e.frameIndex,
      type: e.type,
      tag: e.type as EventTag,
      innings: frame.innings,
      overLabel: overLabelOf(frame),
      headline: head,
      caption: {
        en: captionFor('en', head, delta, rankBefore, rankAfter),
        hinglish: captionFor('hinglish', head, delta, rankBefore, rankAfter),
        hi: captionFor('hi', head, delta, rankBefore, rankAfter),
      },
      delta,
      rankBefore,
      rankAfter,
      score,
      facts,
    };
    const existing = bestByFrame.get(e.frameIndex);
    if (!existing || m.score > existing.score) bestByFrame.set(e.frameIndex, m);
  }
  return [...bestByFrame.values()].sort((a, b) => a.frameIndex - b.frameIndex);
}

/** Top moments that have ALREADY happened at `upTo` (no spoilers), in match order. */
export function topMoments(candidates: readonly Moment[], upTo: number, max = 8): Moment[] {
  const seen = candidates.filter((m) => m.frameIndex <= upTo);
  const ranked = [...seen].sort((a, b) => b.score - a.score || a.frameIndex - b.frameIndex).slice(0, max);
  return ranked.sort((a, b) => a.frameIndex - b.frameIndex);
}
