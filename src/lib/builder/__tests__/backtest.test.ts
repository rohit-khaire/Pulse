import { describe, it, expect } from 'vitest';
import scoringConfig from '../../engine/scoring.t20.json';
import type { ScoringConfig } from '../../engine/types';
import { buildTimeline } from '../../engine/timeline';
import { teamPoints } from '../../engine/points';
import matchData from '../../../../public/matches/1254111.json';
import { getPool, loadRules } from '../pool';
import { autoBuild } from '../autobuild';
import { runBacktest } from '../backtest';
import { validateTeam } from '../rulesCheck';

const config = scoringConfig as ScoringConfig;
const pool = getPool();
const rules = loadRules();
const { frames } = buildTimeline(matchData as any, config);

describe('backtest over the replay', () => {
  const team = autoBuild({ pool, rules, mode: 'balanced', count: 1 }).teams[0];
  const res = runBacktest({ frames, team, pool, rules, config });

  it('total equals the engine team points on the final frame', () => {
    expect(res.total).toBe(teamPoints(frames[frames.length - 1].points, team, config).total);
  });

  it('ranks among the 4 sample rivals (5 entries) with a sorted leaderboard', () => {
    expect(res.of).toBe(5);
    expect(res.rank).toBeGreaterThanOrEqual(1);
    expect(res.rank).toBeLessThanOrEqual(5);
    const totals = res.leaderboard.map((r) => r.total);
    expect([...totals].sort((a, b) => b - a)).toEqual(totals);
    expect(res.leaderboard.filter((r) => r.isUser)).toHaveLength(1);
  });

  it('ties share the better rank', () => {
    const rivals = [
      { id: 'a', name: 'A', owner: 'a', xi: team.xi, c: team.c, vc: team.vc },
      { id: 'b', name: 'B', owner: 'b', xi: team.xi, c: team.c, vc: team.vc },
    ];
    expect(runBacktest({ frames, team, pool, rules, config, rivals }).rank).toBe(1);
  });

  it('hindsight best is a valid team and scores >= the generated one', () => {
    expect(validateTeam(res.hindsight.xi, res.hindsight.c, res.hindsight.vc, pool, rules)).toEqual([]);
    expect(res.hindsight.total).toBeGreaterThanOrEqual(res.total);
    expect(res.pctOfHindsight).toBeGreaterThan(0);
    expect(res.pctOfHindsight).toBeLessThanOrEqual(100);
  });

  it('throws a clear error without frames', () => {
    expect(() => runBacktest({ frames: [], team, pool, rules, config })).toThrow(/No replay frames/);
  });
});
