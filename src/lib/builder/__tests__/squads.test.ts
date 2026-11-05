import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import matchData from '../../../../public/matches/1254111.json';
import { buildSquadsFile } from '../squadsBuilder';
import { loadSquads, loadRules } from '../pool';
import { ROLES } from '../types';

describe('squads.json', () => {
  const generated = buildSquadsFile('1254111', (matchData as any).info);

  it('REGEN_SQUADS=1 rewrites the file from the model', () => {
    if (process.env.REGEN_SQUADS) {
      fs.writeFileSync(path.join(__dirname, '../../../data/builder/squads.json'), JSON.stringify(generated, null, 2) + '\n');
    }
    expect(true).toBe(true);
  });

  it('is exactly what the documented heuristic generates (no hand-edited numbers)', () => {
    if (process.env.REGEN_SQUADS) return;
    expect(loadSquads()).toEqual(generated);
  });

  it('has the 22 players of the match with credits 7.5-11 in 0.5 steps', () => {
    const { players } = loadSquads();
    const info = (matchData as any).info.players as Record<string, string[]>;
    const real = Object.values(info).flat().sort();
    expect(players.map((p) => p.name).sort()).toEqual(real);
    for (const p of players) {
      expect(p.credits).toBeGreaterThanOrEqual(7.5);
      expect(p.credits).toBeLessThanOrEqual(11);
      expect(p.credits * 2).toBe(Math.round(p.credits * 2));
      const pr = p.projection;
      expect(pr.floor).toBeLessThanOrEqual(pr.expectedPoints);
      expect(pr.ceiling).toBeGreaterThanOrEqual(pr.expectedPoints);
      expect(pr.ownershipPct).toBeGreaterThanOrEqual(0);
      expect(pr.ownershipPct).toBeLessThanOrEqual(100);
    }
  });

  it('can always form at least one valid team (every role has enough players)', () => {
    const rules = loadRules();
    const { players } = loadSquads();
    for (const r of ROLES) expect(players.filter((p) => p.role === r).length).toBeGreaterThanOrEqual(rules.roles[r].min);
  });

  it('labels itself as illustrative', () => {
    expect(loadSquads().disclaimer).toMatch(/Illustrative model, not real form data/);
  });
});
