import { describe, it, expect } from 'vitest';
import { findSwingMoments, isEventfulBall } from '../swings';
import { computeFrameTimeline } from '../timelines';
import { ctx, team, frames } from './fixture';

describe('swing moments', () => {
  const tl = computeFrameTimeline(ctx, team);
  const swings = findSwingMoments(ctx, tl, team, { max: 5 });

  it('timeline has one entry per frame with valid ranks', () => {
    expect(tl).toHaveLength(frames.length);
    for (const f of tl) {
      expect(f.myRank).toBeGreaterThanOrEqual(1);
      expect(f.myRank).toBeLessThanOrEqual(5);
    }
  });

  it('returns a bounded, chronologically sorted, well-spaced list', () => {
    expect(swings.length).toBeGreaterThan(0);
    expect(swings.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < swings.length; i++) {
      expect(swings[i].frameIndex).toBeGreaterThan(swings[i - 1].frameIndex);
      expect(swings[i].frameIndex - swings[i - 1].frameIndex).toBeGreaterThanOrEqual(4);
    }
  });

  it('numbers in each moment match the timeline exactly', () => {
    for (const s of swings) {
      const prev = tl[s.frameIndex - 1];
      const cur = tl[s.frameIndex];
      expect(s.rankBefore).toBe(prev.myRank);
      expect(s.rankAfter).toBe(cur.myRank);
      expect(s.chaseBeforePct).toBe(Math.round(prev.chase * 100));
      expect(s.chaseAfterPct).toBe(Math.round(cur.chase * 100));
      expect(s.deltaChasePct).toBe(s.chaseAfterPct - s.chaseBeforePct);
    }
  });

  it('contains the single biggest swing of the match', () => {
    let best = 0;
    let bestI = 1;
    for (let i = 1; i < tl.length; i++) {
      const dC = (tl[i].chase - tl[i - 1].chase) * 100;
      if (!isEventfulBall(frames[i], dC, tl[i].myPts - tl[i - 1].myPts)) continue;
      const sc = Math.abs(dC) + 8 * Math.abs(tl[i - 1].myRank - tl[i].myRank);
      if (sc > best) {
        best = sc;
        bestI = i;
      }
    }
    expect(swings.some((s) => s.frameIndex === bestI)).toBe(true);
  });

  it('writes a one-line explanation in every language with the over label and only known numbers', () => {
    for (const s of swings) {
      for (const lang of ['en', 'hinglish', 'hi'] as const) {
        expect(s.text[lang].length).toBeGreaterThan(10);
        expect(s.text[lang].includes(s.overLabel)).toBe(true);
        expect(s.text[lang].includes('\n')).toBe(false);
        const nums = (s.text[lang].match(/\d+(\.\d+)?/g) ?? []).map(Number);
        const allowed = new Set([Number(s.overLabel.split('.')[0]), Number(s.overLabel.split('.')[1]), s.overLabel === '' ? 0 : parseFloat(s.overLabel), s.chaseBeforePct, s.chaseAfterPct, s.rankBefore, s.rankAfter]);
        for (const n of nums) expect(allowed.has(n)).toBe(true);
      }
    }
  });

  it('never reports a swing on an uneventful ball (no wicket, boundary, win-chance or points move)', () => {
    for (const s of swings) {
      expect(isEventfulBall(frames[s.frameIndex], s.deltaChasePct, s.myPtsDelta)).toBe(true);
    }
  });

  it('wicket swings are labelled as wickets', () => {
    const w = swings.find((s) => s.event === 'wicket');
    if (w) expect(frames[w.frameIndex].delivery.wickets.length).toBeGreaterThan(0);
  });

  it('handles tiny / empty timelines without throwing', () => {
    expect(findSwingMoments(ctx, tl.slice(0, 1), team)).toHaveLength(0);
    expect(findSwingMoments(ctx, [], team)).toHaveLength(0);
  });
});
