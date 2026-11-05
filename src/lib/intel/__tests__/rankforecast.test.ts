import { describe, it, expect } from 'vitest';
import { createForecastJob, planInnings, runRankForecast } from '../rankforecast';
import { defaultRivals, userTeam } from '../context';
import { teamPoints } from '../../engine/points';
import { computeLeaderboard } from '../../engine/league';
import { ctx, config, team, frames, lastFrame, lastInn1, firstInn2 } from './fixture';

const teams = [userTeam(team), ...defaultRivals()];
const input = (fi: number, sims = 150, seed?: number) => ({
  frame: frames[fi],
  squads: ctx.squads,
  teams,
  config,
  sims,
  seed,
});

describe('rank forecast (Monte Carlo)', () => {
  it('is reproducible for the same seed and differs for another seed', () => {
    const a = runRankForecast(input(60, 120, 5));
    const b = runRankForecast(input(60, 120, 5));
    const c = runRankForecast(input(60, 120, 6));
    expect(a.my.meanPts).toBe(b.my.meanPts);
    expect(a.my.pRank1).toBe(b.my.pRank1);
    expect(a.my.meanPts === c.my.meanPts).toBe(false);
  });

  it('chunked execution gives identical numbers to a single run', () => {
    const full = runRankForecast(input(40, 90, 11));
    const job = createForecastJob(input(40, 90, 11));
    let steps = 0;
    while (!job.step(0.01)) steps++;
    const part = job.result();
    expect(steps).toBeGreaterThan(1);
    expect(part.my.meanPts).toBe(full.my.meanPts);
    expect(part.my.expectedRank).toBe(full.my.expectedRank);
  });

  it('probabilities are coherent', () => {
    const r = runRankForecast(input(80, 200));
    expect(r.sims).toBe(200);
    // exactly one rank-1 per simulation
    const sumP1 = r.teams.reduce((a, t) => a + t.pRank1, 0);
    expect(Math.abs(sumP1 - 1)).toBeLessThan(1e-9);
    // rank distribution sums to 1
    expect(Math.abs(r.myRankDist.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-9);
    for (const t of r.teams) {
      expect(t.pRank1).toBeGreaterThanOrEqual(0);
      expect(t.pTop3).toBeGreaterThanOrEqual(t.pRank1);
      expect(t.pTop3).toBeLessThanOrEqual(1);
      expect(t.expectedRank).toBeGreaterThanOrEqual(1);
      expect(t.expectedRank).toBeLessThanOrEqual(teams.length);
      expect(t.p10).toBeLessThanOrEqual(t.p50);
      expect(t.p50).toBeLessThanOrEqual(t.p90);
    }
    expect(r.myRankBand[0]).toBeLessThanOrEqual(r.myRankBand[1]);
    expect(r.mcMarginPct).toBeGreaterThan(0);
  });

  it('fan chart starts at the current points and is ordered p10<=p50<=p90', () => {
    const r = runRankForecast(input(100, 150));
    const cur = teamPoints(frames[100].points, team, config).total;
    expect(r.fan[0].p50).toBe(cur);
    expect(r.fan[0].p10).toBe(cur);
    for (const p of r.fan) {
      expect(p.p10).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p90);
    }
    expect(r.fan[r.fan.length - 1].over).toBeGreaterThan(r.fan[0].over);
  });

  it('uncertainty shrinks as the match progresses', () => {
    const early = runRankForecast(input(10, 150));
    const late = runRankForecast(input(lastFrame - 6, 150));
    expect(late.my.sdPts).toBeLessThan(early.my.sdPts);
  });

  it('settled match: no simulation, numbers equal the real final leaderboard', () => {
    const r = runRankForecast(input(lastFrame));
    expect(r.settled).toBe(true);
    expect(r.sims).toBe(1);
    expect(r.mcMarginPct).toBe(0);
    const lb = computeLeaderboard(frames[lastFrame], null, team, config);
    const me = lb.find((e) => e.isUser)!;
    expect(r.my.currentPts).toBe(me.totalPts);
    expect(r.my.meanPts).toBe(me.totalPts);
    expect(r.my.expectedRank).toBe(me.rank);
    expect(r.my.pRank1).toBe(me.rank === 1 ? 1 : 0);
  });

  it('reuses the real points engine: sim totals use the same scoring config', () => {
    // At frame 0 every XI player already has the playing-XI bonus; mean must exceed it
    const r = runRankForecast(input(0, 100));
    const base = teamPoints(frames[0].points, team, config).total;
    expect(r.my.currentPts).toBe(base);
    expect(r.my.meanPts).toBeGreaterThan(base + 100);
  });

  it('plans the right innings from different frames', () => {
    expect(planInnings(frames[0], frames[0].stats)).toHaveLength(2);
    const endOf1 = planInnings(frames[lastInn1], frames[lastInn1].stats);
    expect(endOf1).toHaveLength(1);
    expect(endOf1[0].target).toBe(frames[lastInn1].currentScore.runs + 1);
    expect(endOf1[0].chasesFirst).toBe(false);
    const mid1 = planInnings(frames[50], frames[50].stats);
    expect(mid1).toHaveLength(2);
    expect(mid1[1].chasesFirst).toBe(true);
    const mid2 = planInnings(frames[firstInn2 + 30], frames[firstInn2 + 30].stats);
    expect(mid2).toHaveLength(1);
    expect(mid2[0].target).toBe(frames[lastInn1].currentScore.runs + 1);
    expect(planInnings(frames[lastFrame], frames[lastFrame].stats)).toHaveLength(0);
  });

  it('does not mutate the replay frames', () => {
    const before = JSON.stringify(frames[70].stats);
    runRankForecast(input(70, 60));
    expect(JSON.stringify(frames[70].stats)).toBe(before);
  });

  it('expected remaining points are never negative and cover only my XI', () => {
    const r = runRankForecast(input(90, 80));
    expect(Object.keys(r.expectedRemainingBase).sort()).toEqual([...team.xi].sort());
    for (const v of Object.values(r.expectedRemainingBase)) expect(v).toBeGreaterThanOrEqual(0);
  });

  it('time slices stay within the main-thread budget', () => {
    const job = createForecastJob(input(0, 400));
    const slices: number[] = [];
    while (true) {
      const t0 = performance.now();
      const done = job.step(8);
      slices.push(performance.now() - t0);
      if (done) break;
    }
    slices.sort((a, b) => a - b);
    const p90 = slices[Math.floor(slices.length * 0.9)];
    // 8 ms budget + one simulation of overhead. p90 is the real budget check;
    // the worst-case ceiling is generous because a cold JIT / GC pause on shared CI
    // can spike a single slice without meaning the design is wrong.
    expect(p90).toBeLessThan(50);
    expect(slices[slices.length - 1]).toBeLessThan(250);
  });
});
