import { describe, it, expect } from 'vitest';
import { diffStandings, gapToNextAbove, isBanterWorthy, isNaturalStep, standingsAt, toBanterFacts } from '../contest';
import { factNumbers, templateBanter, validateBanter } from '../banter';
import { LANGS, numbersIn } from '../text';
import { frames, team, config } from './helpers';

describe('standings and overtaking', () => {
  it('standings at a frame have the user plus 4 demo friends, ranked 1..5', () => {
    const s = standingsAt(frames, 200, team, config);
    expect(s).toHaveLength(5);
    expect(s.map((e) => e.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(s.filter((e) => e.isUser)).toHaveLength(1);
  });

  it('diffStandings agrees with a brute-force rank comparison over the whole replay', () => {
    let flips = 0;
    let prev = standingsAt(frames, 0, team, config);
    for (let i = 1; i < frames.length; i++) {
      const cur = standingsAt(frames, i, team, config);
      const found = diffStandings(prev, cur);
      const youP = prev.find((e) => e.isUser)!.rank;
      const youC = cur.find((e) => e.isUser)!.rank;
      let expected = 0;
      for (const r of cur.filter((e) => !e.isUser)) {
        const rp = prev.find((e) => e.id === r.id)!.rank;
        if ((rp < youP) !== (r.rank < youC)) expected++;
      }
      expect(found).toHaveLength(expected);
      flips += found.length;
      prev = cur;
    }
    expect(flips).toBeGreaterThan(0); // the demo match really has overtakes
  });

  it('banter built from every real overtake only contains fact numbers and passes validation', () => {
    let prev = standingsAt(frames, 0, team, config);
    let n = 0;
    for (let i = 1; i < frames.length; i++) {
      const cur = standingsAt(frames, i, team, config);
      for (const o of diffStandings(prev, cur)) {
        const facts = toBanterFacts(o, `${frames[i].over}.${frames[i].ballInOver}`, cur.length);
        expect(facts.gap).toBeGreaterThanOrEqual(0);
        const allowed = factNumbers(facts);
        for (const lang of LANGS) {
          const line = templateBanter(facts, lang);
          expect(validateBanter(line, facts).ok).toBe(true);
          for (const num of numbersIn(line)) expect(allowed.has(num)).toBe(true);
          n++;
        }
      }
      prev = cur;
    }
    expect(n).toBeGreaterThan(0);
  });

  it('classifies taking / losing the top spot', () => {
    const mk = (id: string, owner: string, rank: number, pts: number, isUser = false) =>
      ({ id, name: id, owner, isUser, totalPts: pts, rank, rankDelta: 0 }) as never;
    const before = [mk('r1', 'Aman S', 1, 100), mk('user-team', 'You', 2, 90, true)];
    const after = [mk('user-team', 'You', 1, 110, true), mk('r1', 'Aman S', 2, 105)];
    const took = diffStandings(before, after);
    expect(took[0].type).toBe('overtook');
    expect(toBanterFacts(took[0], '3.2', 2).kind).toBe('took_lead');
    expect(toBanterFacts(took[0], '3.2', 2).gap).toBe(5);
    const lost = diffStandings(after, before);
    expect(lost[0].type).toBe('overtaken');
    expect(toBanterFacts(lost[0], '3.3', 2).kind).toBe('lost_lead');
  });

  it('flicker filter: sub-2-point overtakes are not banter-worthy', () => {
    const mk = (id: string, rank: number, pts: number, isUser = false) =>
      ({ id, name: id, owner: isUser ? 'You' : 'Aman S', isUser, totalPts: pts, rank, rankDelta: 0 }) as never;
    const close = diffStandings([mk('user-team', 1, 10, true), mk('r1', 2, 9.5)], [mk('r1', 1, 10.5), mk('user-team', 2, 10, true)]);
    expect(isBanterWorthy(close[0])).toBe(false);
    const real = diffStandings([mk('user-team', 1, 20, true), mk('r1', 2, 19)], [mk('r1', 1, 25), mk('user-team', 2, 20, true)]);
    expect(isBanterWorthy(real[0])).toBe(true);
  });

  it('natural-step rule: small forward steps only (no banter spam on scrubs or going back)', () => {
    expect(isNaturalStep(10, 11)).toBe(true);
    expect(isNaturalStep(10, 22)).toBe(true);
    expect(isNaturalStep(10, 23)).toBe(false);
    expect(isNaturalStep(10, 9)).toBe(false);
    expect(isNaturalStep(10, 10)).toBe(false);
  });

  it('gap to next above is computed from points', () => {
    const s = standingsAt(frames, 250, team, config);
    const g = gapToNextAbove(s);
    const you = s.find((e) => e.isUser)!;
    if (you.rank === 1) expect(g).toBeNull();
    else expect(g!.gap).toBe(s.find((e) => e.rank === you.rank - 1)!.totalPts - you.totalPts);
  });
});
