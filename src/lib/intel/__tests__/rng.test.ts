import { describe, it, expect } from 'vitest';
import { createRng, subSeed } from '../rng';

describe('seeded rng', () => {
  it('is reproducible for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });
  it('differs across seeds and stays in [0,1)', () => {
    const a = createRng(1);
    const b = createRng(2);
    let same = 0;
    for (let i = 0; i < 200; i++) {
      const x = a();
      const y = b();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      if (x === y) same++;
    }
    expect(same).toBe(0);
  });
  it('is roughly uniform', () => {
    const r = createRng(7);
    let s = 0;
    for (let i = 0; i < 20000; i++) s += r();
    expect(Math.abs(s / 20000 - 0.5)).toBeLessThan(0.01);
  });
  it('derives distinct sub-seeds', () => {
    const set = new Set<number>();
    for (let k = 0; k < 500; k++) set.add(subSeed(99, k));
    expect(set.size).toBe(500);
  });
});
