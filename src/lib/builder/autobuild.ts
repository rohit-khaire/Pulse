import type { BuilderError, BuilderPlayer, BuiltTeam, Mode, Rules } from './types';
import { solve } from './optimizer';
import { playerValue } from './modes';
import { pickCaptains } from './captain';
import { fmt } from './pool';
import scoringData from '../engine/scoring.t20.json';
import type { ScoringConfig } from '../engine/types';

const scoring = scoringData as ScoringConfig;

export function summarize(
  xi: string[],
  c: string,
  vc: string,
  pool: BuilderPlayer[],
  mode: Mode,
  exact = true,
  id = 'team'
): BuiltTeam {
  const byName = new Map(pool.map((p) => [p.name, p]));
  const ps = xi.map((n) => byName.get(n)!);
  const sum = (f: (p: BuilderPlayer) => number) => ps.reduce((s, p) => s + f(p), 0);
  const e = sum((p) => p.projection.expectedPoints);
  const ec =
    e +
    (byName.get(c)!.projection.expectedPoints * (scoring.multipliers.C - 1)) +
    (byName.get(vc)!.projection.expectedPoints * (scoring.multipliers.VC - 1));
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    id,
    mode,
    xi,
    c,
    vc,
    creditsUsed: r1(sum((p) => p.credits)),
    totals: {
      expectedPoints: r1(e),
      floor: r1(sum((p) => p.projection.floor)),
      ceiling: r1(sum((p) => p.projection.ceiling)),
      expectedWithCaptains: r1(ec),
      avgOwnership: r1(sum((p) => p.projection.ownershipPct) / ps.length),
    },
    exact,
  };
}

export interface AutoBuildResult {
  teams: BuiltTeam[];
  errors: BuilderError[];
  /** true if fewer teams than requested could be made under the diversity rule */
  fewerThanRequested: boolean;
}

/**
 * Up to `count` meaningfully different teams for one mode. Team k must differ from every
 * earlier team by >= minDifferent players (default 3) AND prefers a different captain.
 */
export function autoBuild(args: {
  pool: BuilderPlayer[];
  rules: Rules;
  mode: Mode;
  locks?: string[];
  excludes?: string[];
  count?: number;
  minDifferent?: number;
}): AutoBuildResult {
  const { pool, rules, mode } = args;
  const count = args.count ?? 3;
  const minDifferent = args.minDifferent ?? 3;
  const teams: BuiltTeam[] = [];
  const usedCaptains: string[] = [];

  for (let k = 0; k < count; k++) {
    const res = solve({
      pool,
      rules,
      value: (p) => playerValue(mode, p),
      locks: args.locks,
      excludes: args.excludes,
      avoid: teams.map((t) => t.xi),
      minDifferent,
    });
    if (!res.ok) {
      if (k === 0) return { teams: [], errors: res.errors, fewerThanRequested: true };
      break;
    }
    const byName = new Map(pool.map((p) => [p.name, p]));
    const { c, vc } = pickCaptains(res.xi.map((n) => byName.get(n)!), mode, usedCaptains);
    usedCaptains.push(c);
    teams.push(summarize(res.xi, c, vc, pool, mode, res.exact, `${mode}-${k + 1}`));
  }
  return { teams, errors: [], fewerThanRequested: teams.length < count };
}

export { fmt };
