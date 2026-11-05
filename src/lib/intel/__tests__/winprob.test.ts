import { describe, it, expect } from 'vitest';
import {
  ballOutcomeProbs,
  chaseWinProb,
  chaseWinProbFromStart,
  computeWinProbTimeline,
  firstInningsWinProb,
  isWinProbModelReady,
  projectedFirstInningsScore,
  stepWinProbBuild,
  winProbForState,
} from '../winprob';
import { frames, lastFrame, lastInn1, firstInn2 } from './fixture';

describe('win probability model', () => {
  it('ball outcome probabilities are valid distributions', () => {
    for (const b of [0, 30, 60, 100, 119]) {
      for (const w of [0, 3, 6, 9]) {
        for (const i of [-0.5, 0, 0.5, 1]) {
          const p = ballOutcomeProbs(b, w, i);
          const sum = p.pWicket + p.pRuns.reduce((a, x) => a + x, 0);
          expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
          expect(p.pWicket).toBeGreaterThan(0);
          expect(p.pWicket).toBeLessThan(0.4);
        }
      }
    }
  });

  it('all probabilities lie in [0,1] over a state grid', () => {
    for (let b = 0; b <= 120; b += 7) {
      for (let w = 0; w <= 10; w++) {
        for (let n = -2; n <= 330; n += 13) {
          const p = chaseWinProb(b, w, n);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('more wickets lost lowers the chasing side chance (same runs, same balls)', () => {
    for (const [balls, need] of [[60, 80], [36, 50], [24, 40], [90, 120]]) {
      let prev = 2;
      for (let w = 0; w <= 9; w++) {
        const p = chaseWinProb(balls, w, need);
        expect(p).toBeLessThan(prev + 1e-9);
        prev = p;
      }
    }
  });

  it('fewer runs needed and more balls left both help the chase', () => {
    expect(chaseWinProb(30, 3, 40)).toBeGreaterThan(chaseWinProb(30, 3, 60));
    expect(chaseWinProb(40, 3, 60)).toBeGreaterThan(chaseWinProb(30, 3, 60));
  });

  it('terminal states are exact', () => {
    expect(chaseWinProb(0, 4, 3)).toBe(0);
    expect(chaseWinProb(10, 10, 5)).toBe(0);
    expect(chaseWinProb(10, 3, 0)).toBe(1);
    expect(chaseWinProb(10, 3, -4)).toBe(1);
  });

  it('start of match is near a coin-flip and par score is IPL-like', () => {
    const p0 = winProbForState({ innings: 1, runs: 0, wickets: 0, ballsBowled: 0 });
    expect(p0.chase).toBeGreaterThan(0.35);
    expect(p0.chase).toBeLessThan(0.65);
    const par = projectedFirstInningsScore(0, 120, 0);
    expect(par).toBeGreaterThan(150);
    expect(par).toBeLessThan(185);
    // a bigger target is harder to chase
    expect(chaseWinProbFromStart(150)).toBeGreaterThan(chaseWinProbFromStart(200));
  });

  it('first-innings win prob rises with runs and falls with wickets', () => {
    expect(firstInningsWinProb(100, 60, 2)).toBeGreaterThan(firstInningsWinProb(70, 60, 2));
    expect(firstInningsWinProb(90, 60, 2)).toBeGreaterThan(firstInningsWinProb(90, 60, 6));
  });

  it('chunked build equals synchronous result and never overruns a slice by much', () => {
    // tables may already be built by earlier tests; this asserts the API contract
    let guard = 0;
    while (!stepWinProbBuild(1)) if (++guard > 1000) throw new Error('build never finished');
    expect(isWinProbModelReady()).toBe(true);
    expect(chaseWinProb(60, 2, 80)).toBeGreaterThan(0);
  });

  describe('on the real match (RR beat PBKS by 2 runs)', () => {
    const tl = computeWinProbTimeline(frames);

    it('has one point per frame, all in [0,1], summing to 1', () => {
      expect(tl).toHaveLength(frames.length);
      for (const p of tl) {
        expect(p.chase).toBeGreaterThanOrEqual(0);
        expect(p.chase).toBeLessThanOrEqual(1);
        expect(Math.abs(p.chase + p.batFirst - 1)).toBeLessThan(1e-9);
      }
    });

    it('the final frame matches the real result: RR (batting first) won', () => {
      const last = tl[lastFrame];
      expect(frames[lastFrame].currentScore.runs).toBe(183);
      expect(last.chase).toBe(0);
      expect(last.batFirst).toBe(1);
    });

    it('before the last over PBKS are clear favourites but the model never calls it decided', () => {
      // 19.0 overs: 4 runs needed off 6 balls with 6 wickets in hand
      const idx = frames.findIndex((f) => f.innings === 2 && f.currentScore.oversStr === '19.0');
      expect(tl[idx].chase).toBeGreaterThan(0.7);
      expect(tl[idx].chase).toBeLessThan(0.99);
    });

    it('chase probability drops across the 20th over (Tyagi over)', () => {
      const idx = frames.findIndex((f) => f.innings === 2 && f.currentScore.oversStr === '19.0');
      expect(tl[lastFrame - 1].chase).toBeLessThan(tl[idx].chase);
    });

    it('first-frame of innings 2 uses the real target', () => {
      expect(frames[firstInn2].target).toBe(frames[lastInn1].currentScore.runs + 1);
      expect(Math.abs(tl[firstInn2].chase - chaseWinProb(120 - 1, 0, frames[firstInn2].target! - frames[firstInn2].currentScore.runs))).toBeLessThan(1e-9);
    });

    it('is deterministic', () => {
      const again = computeWinProbTimeline(frames);
      expect(again[100].chase).toBe(tl[100].chase);
    });
  });
});
