import squadsData from '../../data/builder/squads.json';
import rulesData from '../../data/builder/rules.json';
import type { BuilderPlayer, Projection, Rules, SquadsFile } from './types';

export function loadSquads(): SquadsFile {
  return squadsData as unknown as SquadsFile;
}

export function loadRules(): Rules {
  return rulesData as unknown as Rules;
}

/** Merge user-imported projections over the model's. Pure; never mutates the input. */
export function applyOverrides(
  base: BuilderPlayer[],
  overrides: Record<string, Partial<Projection>> | undefined
): BuilderPlayer[] {
  if (!overrides) return base;
  return base.map((p) => {
    const o = overrides[p.name];
    return o ? { ...p, projection: { ...p.projection, ...o } } : p;
  });
}

export function getPool(overrides?: Record<string, Partial<Projection>>): BuilderPlayer[] {
  return applyOverrides(loadSquads().players, overrides);
}

export const fmt = (n: number): string => String(Math.round(n * 10) / 10);
