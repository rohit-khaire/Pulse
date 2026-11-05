import { describe, it, expect } from 'vitest';
import { IntelEngine, getIntelEngine } from '../engine';
import { ctx, team, lastFrame } from './fixture';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitFor(pred: () => boolean, ms = 15000) {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error('timeout waiting for engine');
    await sleep(15);
  }
}

describe('IntelEngine (shared chunked scheduler)', () => {
  it('precomputes the timeline and swings in idle slices, notifying subscribers', async () => {
    const e = new IntelEngine(ctx, team, 120);
    let notes = 0;
    e.subscribe(() => notes++);
    expect(e.getSnapshot().timeline).toBeNull();
    await waitFor(() => e.getSnapshot().timeline !== null);
    const s = e.getSnapshot();
    expect(s.timeline).toHaveLength(ctx.frames.length);
    expect(s.swings.length).toBeGreaterThan(0);
    expect(s.modelReady).toBe(true);
    expect(notes).toBeGreaterThan(1); // progress was reported in more than one slice
    e.dispose();
  });

  it('computes a forecast for the focused frame, caches it, and serves repeats instantly', async () => {
    const e = new IntelEngine(ctx, team, 120);
    e.focus(60);
    await waitFor(() => e.getSnapshot().forecast?.frameIndex === 60 && !e.getSnapshot().forecastRunning);
    const first = e.getSnapshot().forecast!;
    expect(first.done).toBe(true);
    expect(first.sims).toBe(120);

    e.focus(70);
    await waitFor(() => e.getSnapshot().forecast?.frameIndex === 70 && !e.getSnapshot().forecastRunning);

    e.focus(60); // cached: no waiting, same object
    expect(e.getSnapshot().forecast).toBe(first);
    expect(e.getSnapshot().forecastRunning).toBe(false);
    e.dispose();
  });

  it('settled final frame resolves immediately and exactly', async () => {
    const e = new IntelEngine(ctx, team, 120);
    e.focus(lastFrame);
    await waitFor(() => e.getSnapshot().forecast?.frameIndex === lastFrame);
    expect(e.getSnapshot().forecast!.settled).toBe(true);
    e.dispose();
  });

  it('rapid scrubbing only runs the forecast for the frame you stop on', async () => {
    const e = new IntelEngine(ctx, team, 100);
    await waitFor(() => e.getSnapshot().timeline !== null);
    e.focus(1); // first request starts immediately
    for (let i = 20; i < 40; i++) e.focus(i); // scrub burst, debounced
    await waitFor(() => e.getSnapshot().forecast?.frameIndex === 39 && !e.getSnapshot().forecastRunning);
    expect(e.getSnapshot().forecast!.frameIndex).toBe(39);
    e.dispose();
  });

  it('shares one engine per frames+team (four cards, one precompute)', () => {
    const a = getIntelEngine(ctx, team);
    const b = getIntelEngine(ctx, team);
    expect(a).toBe(b);
    const c = getIntelEngine(ctx, { ...team, c: team.vc, vc: team.c });
    expect(c === a).toBe(false);
    c.dispose();
  });
});
