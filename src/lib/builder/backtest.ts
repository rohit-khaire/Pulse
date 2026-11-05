import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';
import { teamPoints } from '../engine/points';
import rivalsData from '../../data/rivals.json';
import { solve } from './optimizer';
import type { BuilderPlayer, Rules } from './types';
import { pickCaptains } from './captain';

/**
 * "How would this have done?": HINDSIGHT on ONE replayed match.
 * Uses the existing points engine (final frame of the replay) and the SAMPLE rivals in
 * src/data/rivals.json. It is not a prediction and not evidence the projections are good.
 */

export interface BacktestRow {
  id: string;
  name: string;
  owner: string;
  isUser: boolean;
  total: number;
}

export interface BacktestPick {
  name: string;
  slot: 'C' | 'VC' | '-';
  basePts: number;
  totalPts: number;
}

export interface BacktestResult {
  total: number;
  /** 1 = top among the sample rivals (ties share the better rank). */
  rank: number;
  of: number;
  leaderboard: BacktestRow[];
  picks: BacktestPick[];
  best: BacktestPick;
  worst: BacktestPick;
  hindsight: { xi: string[]; c: string; vc: string; total: number };
  /** total / hindsight best, in whole percent */
  pctOfHindsight: number;
}

type RivalLike = { id: string; name: string; owner: string; xi: string[]; c: string; vc: string };

export function runBacktest(args: {
  frames: Frame[];
  team: TeamSelection;
  pool: BuilderPlayer[];
  rules: Rules;
  config: ScoringConfig;
  rivals?: RivalLike[];
}): BacktestResult {
  const { frames, team, pool, rules, config } = args;
  if (!frames.length) throw new Error('No replay frames to backtest against');
  const rivals = args.rivals ?? (rivalsData as RivalLike[]);
  const finalPoints = frames[frames.length - 1].points;

  const mine = teamPoints(finalPoints, team, config);
  const rows: BacktestRow[] = [
    { id: 'user-team', name: 'Your Builder XI', owner: 'You', isUser: true, total: mine.total },
    ...rivals.map((r) => ({
      id: r.id,
      name: r.name,
      owner: r.owner,
      isUser: false,
      total: teamPoints(finalPoints, r, config).total,
    })),
  ];
  const leaderboard = [...rows].sort((a, b) => b.total - a.total);
  const rank = 1 + rows.filter((r) => !r.isUser && r.total > mine.total).length;

  const picks: BacktestPick[] = team.xi
    .map((n) => {
      const b = mine.byPlayer[n];
      return { name: n, slot: b.role, basePts: b.basePts, totalPts: b.totalPts };
    })
    .sort((a, b) => b.totalPts - a.totalPts);

  // Hindsight best: same rules, but "value" is the ACTUAL points scored. C/VC = top two actuals.
  const actual = (n: string) => finalPoints[n]?.total ?? 0;
  const hs = solve({ pool, rules, value: (p) => actual(p.name) });
  let hindsight = { xi: [] as string[], c: '', vc: '', total: 0 };
  if (hs.ok) {
    const actualPool: BuilderPlayer[] = pool.map((p) => ({
      ...p,
      projection: { ...p.projection, expectedPoints: actual(p.name), floor: actual(p.name), ceiling: actual(p.name) },
    }));
    const byName = new Map(actualPool.map((p) => [p.name, p]));
    const { c, vc } = pickCaptains(hs.xi.map((n) => byName.get(n)!), 'balanced');
    hindsight = { xi: hs.xi, c, vc, total: teamPoints(finalPoints, { xi: hs.xi, c, vc }, config).total };
  }

  return {
    total: mine.total,
    rank,
    of: rows.length,
    leaderboard,
    picks,
    best: picks[0],
    worst: picks[picks.length - 1],
    hindsight,
    pctOfHindsight: hindsight.total > 0 ? Math.round((mine.total / hindsight.total) * 100) : 0,
  };
}
