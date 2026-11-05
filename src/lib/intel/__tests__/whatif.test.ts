import { describe, it, expect } from 'vitest';
import { bestCaptainFromHere, captainWhatIf, captainWhatIfAtFrame } from '../whatif';
import { teamPoints } from '../../engine/points';
import { config, team, frames, lastFrame } from './fixture';

describe('captain what-if', () => {
  const final = frames[lastFrame];
  const w = captainWhatIfAtFrame(final, team, config);

  it('actual total equals the real points engine', () => {
    expect(w.actual.total).toBe(teamPoints(final.points, team, config).total);
  });

  it('enumerates every valid C/VC pair (11 x 10)', () => {
    expect(w.options).toHaveLength(110);
    for (const o of w.options) expect(o.c === o.vc).toBe(false);
  });

  it('every counterfactual matches the engine re-run with that selection', () => {
    for (const o of w.options) {
      const real = teamPoints(final.points, { xi: team.xi, c: o.c, vc: o.vc }, config).total;
      expect(Math.abs(real - o.total)).toBeLessThan(1e-9);
    }
  });

  it('works at intermediate frames too', () => {
    for (const fi of [0, 30, 130, 200]) {
      const x = captainWhatIfAtFrame(frames[fi], team, config);
      for (const o of x.options.slice(0, 12)) {
        const real = teamPoints(frames[fi].points, { xi: team.xi, c: o.c, vc: o.vc }, config).total;
        expect(Math.abs(real - o.total)).toBeLessThan(1e-9);
      }
    }
  });

  it('best pair is never worse than the actual pick', () => {
    expect(w.bestPair.total).toBeGreaterThanOrEqual(w.actual.total);
    expect(w.regret).toBeGreaterThanOrEqual(0);
    expect(w.options[0].total).toBe(w.bestPair.total);
  });

  it('answers "if Arshdeep had been captain" with the swap rule', () => {
    const a = w.byCaptain.find((c) => c.player === 'Arshdeep Singh')!;
    expect(a.vc).toBe(team.c); // Arshdeep was VC, so KL Rahul becomes VC
    const real = teamPoints(final.points, { xi: team.xi, c: 'Arshdeep Singh', vc: team.c }, config).total;
    expect(a.total).toBe(real);
    expect(a.delta).toBeGreaterThan(0); // 5-wicket haul beats Rahul's 49
    expect(w.byCaptain.filter((c) => c.isActual)).toHaveLength(1);
  });

  it('at frame 0 nothing beats anything (all equal base points)', () => {
    const z = captainWhatIfAtFrame(frames[0], team, config);
    expect(z.regret).toBe(0);
  });

  it('live version picks the highest expected remaining points', () => {
    const exp: Record<string, number> = {};
    team.xi.forEach((p, i) => (exp[p] = i * 5));
    const adv = bestCaptainFromHere(exp, team, config);
    expect(adv.bestC).toBe(team.xi[team.xi.length - 1]);
    expect(adv.bestVC).toBe(team.xi[team.xi.length - 2]);
    expect(adv.expectedGain).toBeGreaterThan(0);
    expect(adv.currentIsBest).toBe(false);
    const equal = bestCaptainFromHere({ ...exp, [team.c]: 100, [team.vc]: 90 }, team, config);
    expect(equal.bestC).toBe(team.c);
    expect(equal.currentIsBest).toBe(true);
  });

  it('pure function: does not mutate inputs', () => {
    const pts = JSON.parse(JSON.stringify(final.points));
    captainWhatIf(final.points, team, config);
    expect(JSON.stringify(final.points)).toBe(JSON.stringify(pts));
  });
});
