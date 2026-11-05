/**
 * Turns replay state into share payloads (rank journey, moment, streak) and the
 * "match story" line ("Tyagi defended 4 off the last over, my C Arshdeep took 5/32").
 * Pure functions of (frames, team, config, cursor). Every number is computed here.
 */

import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';
import { teamPoints } from '../engine/points';
import { computeLeaderboard } from '../engine/league';
import { buildOvers, type Progress } from './predictor';
import { buildMomentCandidates, overLabelOf, topMoments, type Moment } from './moments';
import { cleanText, shortName, teamAbbr, type Lang } from './text';
import type { MomentPayload, RankPayload, StreakPayload } from './payload';
import type { KeyEvent } from '../engine/types';

export function matchLabel(frames: readonly Frame[]): string {
  const f = frames[1];
  if (!f) return 'IPL replay';
  return `${teamAbbr(f.battingTeam)} vs ${teamAbbr(f.bowlingTeam)}`;
}

/** The Latin-script language used on image cards (Satori has no Devanagari font offline). */
export const cardLang = (l: Lang): 'en' | 'hinglish' => (l === 'en' ? 'en' : 'hinglish');

export interface MatchStory {
  headline: string;
  sub: string;
  overLabel: string;
  facts: number[];
}

export function buildMatchStory(
  frames: readonly Frame[],
  team: TeamSelection,
  config: ScoringConfig,
  upTo: number,
  lang: Lang
): MatchStory | null {
  const overs = buildOvers(frames);
  const last = overs[overs.length - 1];
  if (!last || last.innings !== 2 || upTo < last.endFrame) return null;

  const before = frames[last.startFrame - 1];
  const end = frames[last.endFrame];
  if (!before || !end || end.target === undefined) return null;

  const target = end.target;
  const needed = target - before.currentScore.runs;
  if (needed <= 0) return null;
  const chased = end.currentScore.runs >= target;
  const l = cardLang(lang);
  const facts: number[] = [needed];

  const bowler = shortName(last.bowler);
  const headline = chased
    ? l === 'en'
      ? `${teamAbbr(end.battingTeam)} chased ${needed} off the last over`
      : `${teamAbbr(end.battingTeam)} ne last over mein ${needed} run chase kiye`
    : l === 'en'
    ? `${bowler} defended ${needed} off the last over`
    : `${bowler} ne last over mein ${needed} run defend kiye`;

  // The fan's C or VC — whichever earned more fantasy points — as the second line.
  const final = frames[Math.min(upTo, frames.length - 1)];
  const pick = [
    { name: team.c, role: 'C' },
    { name: team.vc, role: 'VC' },
  ]
    .map((p) => ({ ...p, pts: final.points[p.name]?.total ?? 0 }))
    .sort((a, b) => b.pts - a.pts)[0];

  let sub = '';
  const st = final.stats[pick.name];
  if (st) {
    const n = shortName(pick.name);
    if (st.wickets >= 2) {
      facts.push(st.wickets, st.runsConceded);
      sub =
        l === 'en'
          ? `my ${pick.role} ${n} took ${st.wickets}/${st.runsConceded}`
          : `mera ${pick.role} ${n} ne ${st.wickets}/${st.runsConceded} liya`;
    } else if (st.balls > 0) {
      facts.push(st.runs, st.balls);
      sub =
        l === 'en'
          ? `my ${pick.role} ${n} scored ${st.runs} (${st.balls})`
          : `mere ${pick.role} ${n} ne ${st.runs} (${st.balls}) banaye`;
    }
  }
  return { headline, sub, overLabel: overLabelOf(end), facts };
}

export interface RankJourney {
  rank: number;
  teams: number;
  pts: number;
  series: number[];
  best: Moment | null;
}

export function buildRankJourney(
  frames: readonly Frame[],
  events: readonly KeyEvent[],
  team: TeamSelection,
  config: ScoringConfig,
  upTo: number,
  samples = 24
): RankJourney | null {
  if (frames.length === 0) return null;
  const end = Math.max(0, Math.min(upTo, frames.length - 1));
  const idxs: number[] = [];
  const count = Math.min(samples, end + 1);
  for (let k = 0; k < count; k++) idxs.push(count === 1 ? end : Math.round((k * end) / (count - 1)));
  const series = idxs.map((i) => Math.round(teamPoints(frames[i].points, team, config).total));

  const board = computeLeaderboard(frames[end], null, team, config);
  const you = board.find((e) => e.isUser);
  if (!you) return null;

  const cands = buildMomentCandidates(frames, events, team, config);
  const best = topMoments(cands, end, 1)[0] ?? null;
  return { rank: you.rank, teams: board.length, pts: you.totalPts, series, best };
}

export function buildRankPayload(
  j: RankJourney,
  opts: { name: string; lang: Lang; match: string; sim?: boolean }
): RankPayload {
  const l = cardLang(opts.lang);
  return {
    v: 1,
    k: 'rank',
    n: cleanText(opts.name, 24) || 'Pulse fan',
    m: opts.match,
    l: opts.lang,
    r: j.rank,
    t: j.teams,
    p: j.pts,
    s: j.series,
    b: j.best ? cleanText(j.best.caption[l], 120) : '',
    sim: opts.sim ?? true,
  };
}

export function buildMomentPayload(
  m: Moment,
  opts: { name: string; lang: Lang; match: string; sim?: boolean }
): MomentPayload {
  const l = cardLang(opts.lang);
  const sub = m.delta !== 0 ? m.caption[l].split('. ').slice(1).join('. ') : '';
  return {
    v: 1,
    k: 'moment',
    n: cleanText(opts.name, 24) || 'Pulse fan',
    m: opts.match,
    l: opts.lang,
    h: cleanText(m.headline[l], 100),
    x: cleanText(sub, 160),
    o: m.overLabel,
    e: m.tag,
    d: m.delta,
    sim: opts.sim ?? true,
  };
}

export function buildStoryPayload(
  s: MatchStory,
  opts: { name: string; lang: Lang; match: string; sim?: boolean }
): MomentPayload {
  return {
    v: 1,
    k: 'moment',
    n: cleanText(opts.name, 24) || 'Pulse fan',
    m: opts.match,
    l: opts.lang,
    h: cleanText(s.headline, 100),
    x: cleanText(s.sub, 160),
    o: s.overLabel,
    e: 'STORY',
    sim: opts.sim ?? true,
  };
}

export function buildStreakPayload(
  p: Progress,
  opts: { name: string; lang: Lang; match: string }
): StreakPayload {
  return {
    v: 1,
    k: 'streak',
    n: cleanText(opts.name, 24) || 'Pulse fan',
    m: opts.match,
    l: opts.lang,
    xp: Math.min(p.xp, 99999),
    bs: Math.min(p.bestStreak, 60),
    pf: Math.min(p.perfectCount, 60),
    ov: Math.min(p.played, 60),
    ac: p.accuracy,
    bd: p.badges.map((b) => b.id).slice(0, 5),
  };
}
