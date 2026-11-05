import { describe, it, expect } from 'vitest';
import { collectNumbers, getIntelFacts } from '../facts';
import { computeFrameTimeline } from '../timelines';
import { ctx, team, lastFrame, frames } from './fixture';

describe('getIntelFacts', () => {
  const tl = computeFrameTimeline(ctx, team);

  it('returns plain JSON-serialisable data', () => {
    const f = getIntelFacts(150, team, ctx, { timeline: tl });
    expect(JSON.parse(JSON.stringify(f))).toEqual(JSON.parse(JSON.stringify(f)));
    expect(f.isModelEstimate).toBe(true);
    expect(f.disclaimers.length).toBeGreaterThan(0);
    expect(f.winProb.chasePct + f.winProb.batFirstPct).toBe(100);
  });

  it('forecast is null unless asked for', () => {
    expect(getIntelFacts(50, team, ctx, { timeline: tl }).rank.forecast).toBeNull();
    const f = getIntelFacts(50, team, ctx, { timeline: tl, forecastSims: 60 });
    expect(f.rank.forecast).toBeDefined();
    expect(f.rank.forecast!.rivalsAreSample).toBe(true);
    expect(f.rank.forecast!.pRank1Pct).toBeGreaterThanOrEqual(0);
    expect(f.rank.forecast!.pRank1Pct).toBeLessThanOrEqual(100);
    expect(f.captain.fromHere).toBeDefined();
  });

  it('never leaks future swings', () => {
    const f = getIntelFacts(20, team, ctx, { timeline: tl });
    for (const s of f.swings) expect(s.frameIndex).toBeLessThanOrEqual(20);
    const later = getIntelFacts(lastFrame, team, ctx, { timeline: tl });
    expect(later.swings.length).toBeGreaterThanOrEqual(f.swings.length);
  });

  it('whitelist contains every number present in the facts (zero-math guard)', () => {
    const f = getIntelFacts(180, team, ctx, { timeline: tl, forecastSims: 50 });
    const present = collectNumbers({ ...f, whitelist: undefined });
    for (const n of present) expect(f.whitelist.includes(n)).toBe(true);
  });

  it('final frame facts agree with the real result', () => {
    const f = getIntelFacts(lastFrame, team, ctx, { timeline: tl });
    expect(f.winProb.settled).toBe(true);
    expect(f.winProb.batFirstTeam).toBe('RR');
    expect(f.winProb.batFirstPct).toBe(100);
    expect(f.winProb.favourite).toBe('RR');
    expect(f.scoreLine).toBe(frames[lastFrame].scoreLine);
  });

  it('clamps out-of-range frame indexes', () => {
    expect(getIntelFacts(-5, team, ctx, { timeline: tl }).frameIndex).toBe(0);
    expect(getIntelFacts(99999, team, ctx, { timeline: tl }).frameIndex).toBe(lastFrame);
  });
});
