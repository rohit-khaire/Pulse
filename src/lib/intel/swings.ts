/**
 * SWING MOMENTS — the balls that moved win probability and/or my fantasy rank most.
 * Everything is derived from deterministic timelines; text is template-based.
 */
import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';
import { teamPoints } from '../engine/points';
import type { FrameIntel } from './timelines';
import type { IntelContext, IntelLang } from './types';
import { pct, r1, teamShort } from './copy';

export type SwingEvent = 'wicket' | 'six' | 'four' | 'other';

export interface SwingMoment {
  frameIndex: number;
  innings: number;
  /** commentary-style label, e.g. "14.3" */
  overLabel: string;
  kind: 'match' | 'rank' | 'both';
  event: SwingEvent;
  chaseTeam: string; // short code of the side whose win% is reported
  chaseBeforePct: number;
  chaseAfterPct: number;
  /** signed percentage-point change in the chasing side's win chance */
  deltaChasePct: number;
  rankBefore: number;
  rankAfter: number;
  myPtsDelta: number;
  score: number;
  /** short factual description of the ball, English, no numbers beyond the over label */
  what: string;
  text: Record<IntelLang, string>;
}

export interface SwingOptions {
  max?: number;
  minGapFrames?: number;
  minScore?: number;
}

const RANK_WEIGHT = 8; // one rank place counts like 8 win-probability points

/**
 * A ball can only be a "swing" if something real happened: a wicket, a boundary,
 * a visible move in win chance, or a real points jump for my team. This stops a
 * single run that merely re-orders two tied teams from being called a turning point.
 */
export function isEventfulBall(frame: Frame, dChasePct: number, myPtsDelta: number): boolean {
  const d = frame.delivery;
  return d.wickets.length > 0 || d.isSix || d.isFour || Math.abs(dChasePct) >= 4 || Math.abs(myPtsDelta) >= 8;
}

function describe(frame: Frame): { event: SwingEvent; what: string } {
  const d = frame.delivery;
  if (d.wickets.length > 0) {
    const w = d.wickets[0];
    const how = w.kind === 'run out' ? 'run out' : `${w.kind}, b ${d.bowler}`;
    return { event: 'wicket', what: `Wicket: ${w.playerOut} (${how})` };
  }
  if (d.isSix) return { event: 'six', what: `Six by ${d.batter}` };
  if (d.isFour) return { event: 'four', what: `Four by ${d.batter}` };
  return { event: 'other', what: `${d.runsTotal} run${d.runsTotal === 1 ? '' : 's'} (${d.batter})` };
}

export function overLabelOf(frame: Frame): string {
  return `${frame.over}.${frame.ball}`;
}

function buildText(m: Omit<SwingMoment, 'text'>): Record<IntelLang, string> {
  const ev = m.event;
  const rankPart = (lang: IntelLang) => {
    if (m.rankBefore === m.rankAfter) {
      return lang === 'hi' ? `तुम्हारी रैंक ${m.rankAfter} पर वही` : lang === 'en' ? `your rank stays ${m.rankAfter}` : `tumhara rank ${m.rankAfter} par wahi`;
    }
    return lang === 'hi'
      ? `तुम्हारी रैंक ${m.rankBefore} से ${m.rankAfter}`
      : lang === 'en'
      ? `your rank went ${m.rankBefore} to ${m.rankAfter}`
      : `tumhara rank ${m.rankBefore} se ${m.rankAfter}`;
  };
  const evWord = {
    wicket: { en: 'wicket', hinglish: 'wicket', hi: 'विकेट' },
    six: { en: 'six', hinglish: 'six', hi: 'छक्का' },
    four: { en: 'four', hinglish: 'four', hi: 'चौका' },
    other: m.what.startsWith('0 run')
      ? { en: 'dot ball', hinglish: 'dot ball', hi: 'डॉट बॉल' }
      : { en: 'ball', hinglish: 'ball', hi: 'गेंद' },
  }[ev];
  const a = m.chaseBeforePct;
  const b = m.chaseAfterPct;
  const team = m.chaseTeam;
  const chase = m.innings === 2;
  const ov = (lang: IntelLang) => `${lang === 'hi' ? 'ओवर' : 'Over'} ${m.overLabel}${chase ? (lang === 'hi' ? ' (चेज़)' : ' (chase)') : ''}`;
  return {
    en: `${ov('en')}: ${evWord.en}, ${team} win chance ${a}% to ${b}%; ${rankPart('en')}.`,
    hinglish: `${ov('hinglish')}: ${evWord.hinglish}, ${team} ke jeetne ka chance ${a}% se ${b}%; ${rankPart('hinglish')}.`,
    hi: `${ov('hi')}: ${evWord.hi}, ${team} की जीत की संभावना ${a}% से ${b}%; ${rankPart('hi')}।`,
  };
}

export function findSwingMoments(
  ctx: IntelContext,
  timeline: FrameIntel[],
  sel: TeamSelection,
  opts: SwingOptions = {}
): SwingMoment[] {
  const max = opts.max ?? 5;
  const gap = opts.minGapFrames ?? 4;
  const minScore = opts.minScore ?? 6;
  const { frames, config } = ctx;
  const cands: SwingMoment[] = [];

  for (let i = 1; i < Math.min(frames.length, timeline.length); i++) {
    const prev = timeline[i - 1];
    const cur = timeline[i];
    const dChase = (cur.chase - prev.chase) * 100;
    const dRank = prev.myRank - cur.myRank;
    const score = Math.abs(dChase) + RANK_WEIGHT * Math.abs(dRank);
    if (score < minScore) continue;
    const frame = frames[i];
    if (!isEventfulBall(frame, dChase, cur.myPts - prev.myPts)) continue;
    const { event, what } = describe(frame);
    const chaseTeamFull = frame.innings === 1 ? frame.bowlingTeam : frame.battingTeam;
    const base = {
      frameIndex: i,
      innings: frame.innings,
      overLabel: overLabelOf(frame),
      kind: (Math.abs(dChase) >= 3 && dRank !== 0 ? 'both' : dRank !== 0 && Math.abs(dChase) < 3 ? 'rank' : 'match') as SwingMoment['kind'],
      event,
      chaseTeam: teamShort(chaseTeamFull),
      chaseBeforePct: pct(prev.chase),
      chaseAfterPct: pct(cur.chase),
      deltaChasePct: pct(cur.chase) - pct(prev.chase),
      rankBefore: prev.myRank,
      rankAfter: cur.myRank,
      myPtsDelta: r1(cur.myPts - prev.myPts),
      score,
      what,
    };
    cands.push({ ...base, text: buildText(base) });
  }

  cands.sort((a, b) => b.score - a.score || a.frameIndex - b.frameIndex);
  const chosen: SwingMoment[] = [];
  for (const c of cands) {
    if (chosen.length >= max) break;
    if (chosen.every((x) => Math.abs(x.frameIndex - c.frameIndex) >= gap)) chosen.push(c);
  }
  return chosen.sort((a, b) => a.frameIndex - b.frameIndex);
}

/** My total points helper re-exported for callers building their own explanations. */
export function myPointsAt(frame: Frame, sel: TeamSelection, config: ScoringConfig): number {
  return teamPoints(frame.points, sel, config).total;
}
