import { describe, it, expect } from 'vitest';
import { getPool, loadRules } from '../pool';
import { solve } from '../optimizer';
import { autoBuild } from '../autobuild';
import { playerValue } from '../modes';
import { validateTeam, creditsOf } from '../rulesCheck';
import { randomPool } from './helpers';
import type { BuilderPlayer, Mode, Rules } from '../types';
import { ROLES } from '../types';

const rules = loadRules();
const MODES: Mode[] = ['safe', 'balanced', 'grand'];

function bruteForce(pool: BuilderPlayer[], value: (p: BuilderPlayer) => number, r: Rules): number {
  let best = -Infinity;
  const n = pool.length;
  const pick: number[] = [];
  const rec = (i: number) => {
    if (pick.length === r.teamSize) {
      const xi = pick.map((k) => pool[k]);
      if (Math.round(creditsOf(xi) * 10) > Math.round(r.creditBudget * 10)) return;
      const team: Record<string, number> = {};
      const role: Record<string, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
      for (const p of xi) {
        team[p.teamShort] = (team[p.teamShort] ?? 0) + 1;
        role[p.role]++;
      }
      if (Object.values(team).some((c) => c > r.maxPerTeam)) return;
      if (ROLES.some((x) => role[x] < r.roles[x].min || role[x] > r.roles[x].max)) return;
      best = Math.max(best, xi.reduce((s, p) => s + value(p), 0));
      return;
    }
    if (n - i < r.teamSize - pick.length) return;
    pick.push(i);
    rec(i + 1);
    pick.pop();
    rec(i + 1);
  };
  rec(0);
  return best;
}

describe('optimizer: constraints', () => {
  it('never violates any rule across 150 random seeds x 3 modes', () => {
    for (let seed = 1; seed <= 150; seed++) {
      const pool = randomPool(seed);
      for (const mode of MODES) {
        const res = solve({ pool, rules, value: (p) => playerValue(mode, p) });
        if (!res.ok) continue; // a random pool can be infeasible; that is allowed, a rule break is not
        const [c, vc] = res.xi;
        expect(validateTeam(res.xi, c, vc, pool, rules)).toEqual([]);
        expect(res.exact).toBe(true);
      }
    }
  });

  it('matches exhaustive search (true optimum) on random pools', () => {
    for (const seed of [3, 11, 29, 47, 83, 101]) {
      const pool = randomPool(seed);
      const value = (p: BuilderPlayer) => playerValue('balanced', p);
      const res = solve({ pool, rules, value });
      const expected = bruteForce(pool, value, rules);
      expect(res.ok).toBe(true);
      if (res.ok) expect(res.objective).toBeCloseTo(expected, 6);
    }
  });

  it('is not just greedy: beats a top-value-first greedy fill on at least one seed', () => {
    let better = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const pool = randomPool(seed);
      const value = (p: BuilderPlayer) => p.projection.expectedPoints;
      const res = solve({ pool, rules, value });
      if (!res.ok) continue;
      // greedy: best value first, take if still feasible-looking
      const sorted = [...pool].sort((a, b) => value(b) - value(a));
      const g: BuilderPlayer[] = [];
      for (const p of sorted) {
        const trial = [...g, p];
        const team = trial.filter((x) => x.teamShort === p.teamShort).length;
        const role = trial.filter((x) => x.role === p.role).length;
        if (g.length < 11 && team <= 7 && role <= rules.roles[p.role].max && creditsOf(trial) <= 100) g.push(p);
      }
      const greedyOk = g.length === 11 && validateTeam(g.map((x) => x.name), g[0].name, g[1].name, pool, rules).length === 0;
      const gv = greedyOk ? g.reduce((s, p) => s + value(p), 0) : -Infinity;
      expect(res.objective).toBeGreaterThanOrEqual(gv - 1e-9);
      if (res.objective > gv + 1e-9) better++;
    }
    expect(better).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const pool = getPool();
    const a = solve({ pool, rules, value: (p) => playerValue('grand', p) });
    const b = solve({ pool, rules, value: (p) => playerValue('grand', p) });
    expect(a).toEqual({ ...b, nodes: (a as any).nodes });
  });
});

describe('optimizer: locks and excludes', () => {
  it('always includes locks and never includes excludes', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const pool = randomPool(seed);
      const names = pool.map((p) => p.name);
      const locks = [names[seed % 22], names[(seed * 7 + 3) % 22]].filter((n, i, a) => a.indexOf(n) === i);
      const excludes = [names[(seed * 5 + 1) % 22], names[(seed * 11 + 9) % 22]].filter((n) => !locks.includes(n));
      const res = solve({ pool, rules, value: (p) => p.projection.expectedPoints, locks, excludes });
      if (!res.ok) continue;
      for (const l of locks) expect(res.xi).toContain(l);
      for (const x of excludes) expect(res.xi).not.toContain(x);
      expect(res.xi).toHaveLength(11);
    }
  });

  it('reports a human-readable error for conflicts and impossible locks', () => {
    const pool = getPool();
    const value = (p: BuilderPlayer) => p.projection.expectedPoints;
    const conflict = solve({ pool, rules, value, locks: ['KL Rahul'], excludes: ['KL Rahul'] });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.errors[0].code).toBe('LOCK_EXCLUDE_CONFLICT');

    const rr = pool.filter((p) => p.teamShort === 'RR').slice(0, 8).map((p) => p.name);
    const tooMany = solve({ pool, rules, value, locks: rr });
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.errors.some((e) => e.code === 'LOCK_TEAM_LIMIT')).toBe(true);

    const bowlersOut = pool.filter((p) => p.role === 'BOWL').map((p) => p.name);
    const noBowl = solve({ pool, rules, value, excludes: bowlersOut.slice(0, 6) });
    expect(noBowl.ok).toBe(false);
    if (!noBowl.ok) expect(noBowl.errors[0].code).toBe('ROLE_UNREACHABLE');

    const unknown = solve({ pool, rules, value, locks: ['Not A Player'] });
    expect(unknown.ok).toBe(false);
  });
});

describe('optimizer: credit-infeasible locks', () => {
  it('says so (instead of returning a rule-breaking team) when locks cannot fit 100 credits', () => {
    // KL Rahul (11) + E Lewis (10.5): the cheapest legal completion costs 100.5, proven by the solver
    const res = autoBuild({ pool: getPool(), rules, mode: 'balanced', locks: ['KL Rahul', 'E Lewis'] });
    expect(res.teams).toHaveLength(0);
    expect(res.errors[0].code).toBe('NO_FEASIBLE_TEAM');
  });
});

describe('optimizer: modes and diversity', () => {
  it('safe mode has the highest floor total, balanced the highest expected total', () => {
    const pool = getPool();
    const t = (mode: Mode) => autoBuild({ pool, rules, mode, count: 1 }).teams[0];
    const s = t('safe');
    const b = t('balanced');
    expect(s.totals.floor).toBeGreaterThanOrEqual(b.totals.floor - 1e-9);
    expect(b.totals.expectedPoints).toBeGreaterThanOrEqual(s.totals.expectedPoints - 1e-9);
  });

  it('grand league mode lowers average ownership vs balanced on the featured match', () => {
    const pool = getPool();
    const g = autoBuild({ pool, rules, mode: 'grand', count: 1 }).teams[0];
    const b = autoBuild({ pool, rules, mode: 'balanced', count: 1 }).teams[0];
    expect(g.totals.avgOwnership).toBeLessThan(b.totals.avgOwnership);
  });

  it('generates 3 valid teams that each differ by >= 3 players', () => {
    for (const mode of MODES) {
      const pool = getPool();
      const res = autoBuild({ pool, rules, mode, count: 3, minDifferent: 3 });
      expect(res.teams).toHaveLength(3);
      for (const t of res.teams) expect(validateTeam(t.xi, t.c, t.vc, pool, rules)).toEqual([]);
      for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
          const overlap = res.teams[i].xi.filter((n) => res.teams[j].xi.includes(n)).length;
          expect(11 - overlap).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it('keeps locks in every diverse team', () => {
    const pool = getPool();
    const res = autoBuild({ pool, rules, mode: 'balanced', locks: ['KL Rahul', 'MA Agarwal'], excludes: ['N Pooran'] });
    expect(res.teams.length).toBeGreaterThan(0);
    for (const t of res.teams) {
      expect(t.xi).toContain('KL Rahul');
      expect(t.xi).toContain('MA Agarwal');
      expect(t.xi).not.toContain('N Pooran');
    }
  });

  it('captain and vice-captain are in the XI and different', () => {
    const pool = getPool();
    for (const mode of MODES) {
      for (const t of autoBuild({ pool, rules, mode }).teams) {
        expect(t.xi).toContain(t.c);
        expect(t.xi).toContain(t.vc);
        expect(t.c).not.toBe(t.vc);
      }
    }
  });
});
