import type { BuilderPlayer } from '../types';
import { getPool } from '../pool';

/** Small deterministic PRNG so "random seeds" tests are reproducible. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The real 22-player pool with randomized credits (7.5-11) and projections. */
export function randomPool(seed: number): BuilderPlayer[] {
  const rnd = mulberry32(seed);
  return getPool().map((p) => {
    const e = 30 + rnd() * 60;
    return {
      ...p,
      credits: 7.5 + Math.floor(rnd() * 8) * 0.5,
      projection: {
        expectedPoints: Math.round(e * 10) / 10,
        floor: Math.round(e * (0.2 + rnd() * 0.4) * 10) / 10,
        ceiling: Math.round(e * (1.3 + rnd() * 1.2) * 10) / 10,
        ownershipPct: Math.round(3 + rnd() * 85),
      },
    };
  });
}
