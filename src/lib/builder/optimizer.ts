import type { BuilderError, BuilderPlayer, Role, Rules } from './types';
import { ROLES } from './types';
import { err } from './errors';

/**
 * Exact constraint solver (branch and bound), not a greedy heuristic.
 *
 * Maximizes sum(value(player)) over XIs that satisfy: exactly `teamSize` players,
 * credits <= budget, <= maxPerTeam from one team, per-role min/max, plus
 * lock (must include), exclude (never include) and a DIVERSITY constraint
 * (overlap with each previously generated team <= teamSize - minDifferent).
 *
 * Pruning: (1) not enough candidates left, (2) cheapest completion exceeds budget,
 * (3) role minimums can no longer be met, (4) optimistic bound (current + best k remaining
 * values, candidates pre-sorted by value) cannot beat the incumbent, (5) diversity overlap.
 * Credits are handled in integer tenths so 0.5-credit steps never suffer float drift.
 * A node limit guarantees the UI never hangs; `exact` is false only if it was hit.
 */

export interface SolveOptions {
  pool: BuilderPlayer[];
  rules: Rules;
  value: (p: BuilderPlayer) => number;
  locks?: string[];
  excludes?: string[];
  /** Previously generated XIs (player names). */
  avoid?: string[][];
  /** Each new team must differ from every avoided team by at least this many players. */
  minDifferent?: number;
  nodeLimit?: number;
}

export type SolveResult =
  | { ok: true; xi: string[]; creditsUsed: number; objective: number; exact: boolean; nodes: number }
  | { ok: false; errors: BuilderError[] };

const to10 = (c: number) => Math.round(c * 10);
const EPS = 1e-9;

/** Cheap pre-checks that give a SPECIFIC, human-readable reason instead of a generic failure. */
export function preflight(opts: SolveOptions): BuilderError[] {
  const { pool, rules } = opts;
  const locks = opts.locks ?? [];
  const excludes = opts.excludes ?? [];
  const errors: BuilderError[] = [];
  const byName = new Map(pool.map((p) => [p.name, p]));

  for (const n of [...locks, ...excludes]) {
    if (!byName.has(n)) errors.push(err('UNKNOWN_PLAYER', { name: n }));
  }
  if (errors.length) return errors;

  for (const n of locks) if (excludes.includes(n)) errors.push(err('LOCK_EXCLUDE_CONFLICT', { name: n }));
  if (errors.length) return errors;

  if (locks.length > rules.teamSize) {
    return [err('TOO_MANY_LOCKS', { count: locks.length, max: rules.teamSize })];
  }

  const locked = locks.map((n) => byName.get(n)!);
  const teamCount: Record<string, number> = {};
  const roleCount: Record<Role, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  let credits10 = 0;
  for (const p of locked) {
    teamCount[p.teamShort] = (teamCount[p.teamShort] ?? 0) + 1;
    roleCount[p.role]++;
    credits10 += to10(p.credits);
  }
  for (const [team, count] of Object.entries(teamCount)) {
    if (count > rules.maxPerTeam) errors.push(err('LOCK_TEAM_LIMIT', { team, count, max: rules.maxPerTeam }));
  }
  for (const r of ROLES) {
    if (roleCount[r] > rules.roles[r].max) errors.push(err('LOCK_ROLE_LIMIT', { role: r, count: roleCount[r], max: rules.roles[r].max }));
  }
  if (credits10 > to10(rules.creditBudget)) errors.push(err('LOCK_CREDITS', { used: credits10 / 10, budget: rules.creditBudget }));
  if (errors.length) return errors;

  const available = pool.filter((p) => !excludes.includes(p.name));
  if (available.length < rules.teamSize) {
    return [err('POOL_TOO_SMALL', { count: available.length, need: rules.teamSize })];
  }
  for (const r of ROLES) {
    const count = available.filter((p) => p.role === r).length;
    if (count < rules.roles[r].min) errors.push(err('ROLE_UNREACHABLE', { role: r, count, min: rules.roles[r].min }));
  }
  return errors;
}

export function solve(opts: SolveOptions): SolveResult {
  const pre = preflight(opts);
  if (pre.length) return { ok: false, errors: pre };

  const { pool, rules, value } = opts;
  const locks = new Set(opts.locks ?? []);
  const excludes = new Set(opts.excludes ?? []);
  const avoid = (opts.avoid ?? []).map((t) => new Set(t));
  const maxOverlap = rules.teamSize - (opts.minDifferent ?? 0);
  const nodeLimit = opts.nodeLimit ?? 4_000_000;
  const budget10 = to10(rules.creditBudget);
  const size = rules.teamSize;

  // Candidates sorted by value desc, then cheaper, then name: fully deterministic.
  const lockedPlayers = pool.filter((p) => locks.has(p.name));
  const cands = pool
    .filter((p) => !locks.has(p.name) && !excludes.has(p.name))
    .map((p) => ({ p, v: value(p), c: to10(p.credits) }))
    .sort((a, b) => b.v - a.v || a.c - b.c || (a.p.name < b.p.name ? -1 : 1));
  const n = cands.length;

  // prefix sums of values for the optimistic bound
  const prefix = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + cands[i].v;

  // suffixCheapest[i] = candidate credits sorted ascending, restricted to index >= i is costly,
  // so keep a per-role-agnostic simple bound: sum of the k cheapest among cands[i..].
  const cheapestSuffix: number[][] = new Array(n + 1);
  cheapestSuffix[n] = [];
  for (let i = n - 1; i >= 0; i--) {
    const arr = cheapestSuffix[i + 1].slice();
    const c = cands[i].c;
    let j = 0;
    while (j < arr.length && arr[j] < c) j++;
    arr.splice(j, 0, c);
    cheapestSuffix[i] = arr;
  }
  // role availability suffix counts
  const roleSuffix: Record<Role, number[]> = { WK: [], BAT: [], AR: [], BOWL: [] };
  for (const r of ROLES) {
    roleSuffix[r] = new Array(n + 1).fill(0);
    for (let i = n - 1; i >= 0; i--) roleSuffix[r][i] = roleSuffix[r][i + 1] + (cands[i].p.role === r ? 1 : 0);
  }

  const roleCount: Record<Role, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  const teamCount: Record<string, number> = {};
  const overlap = avoid.map(() => 0);
  let count = 0;
  let credits10 = 0;
  let obj = 0;
  const chosen: number[] = [];

  const addPlayer = (p: BuilderPlayer, v: number, c: number, sign: 1 | -1) => {
    roleCount[p.role] += sign;
    teamCount[p.teamShort] = (teamCount[p.teamShort] ?? 0) + sign;
    for (let k = 0; k < avoid.length; k++) if (avoid[k].has(p.name)) overlap[k] += sign;
    count += sign;
    credits10 += sign * c;
    obj += sign * v;
  };

  for (const p of lockedPlayers) addPlayer(p, value(p), to10(p.credits), 1);
  if (overlap.some((o) => o > maxOverlap)) {
    return { ok: false, errors: [err('NO_FEASIBLE_TEAM')] };
  }

  let best = -Infinity;
  let bestSet: number[] | null = null;
  let nodes = 0;
  let cut = false;

  const rec = (i: number) => {
    if (cut) return;
    if (++nodes > nodeLimit) {
      cut = true;
      return;
    }
    const need = size - count;
    if (need === 0) {
      for (const r of ROLES) if (roleCount[r] < rules.roles[r].min) return;
      if (obj > best + EPS) {
        best = obj;
        bestSet = chosen.slice();
      }
      return;
    }
    if (n - i < need) return;

    // credit feasibility: cheapest `need` remaining must fit
    const cheap = cheapestSuffix[i];
    let minCost = 0;
    for (let k = 0; k < need; k++) minCost += cheap[k];
    if (credits10 + minCost > budget10) return;

    // role minimums still reachable?
    let slotsNeeded = 0;
    for (const r of ROLES) {
      const short = rules.roles[r].min - roleCount[r];
      if (short > 0) {
        if (roleSuffix[r][i] < short) return;
        slotsNeeded += short;
      }
    }
    if (slotsNeeded > need) return;

    // optimistic bound
    if (obj + (prefix[i + need] - prefix[i]) <= best + EPS) return;

    // include cands[i]
    const { p, v, c } = cands[i];
    const roleOk = roleCount[p.role] < rules.roles[p.role].max;
    const teamOk = (teamCount[p.teamShort] ?? 0) < rules.maxPerTeam;
    const creditOk = credits10 + c <= budget10;
    if (roleOk && teamOk && creditOk) {
      addPlayer(p, v, c, 1);
      if (!overlap.some((o) => o > maxOverlap)) {
        chosen.push(i);
        rec(i + 1);
        chosen.pop();
      }
      addPlayer(p, v, c, -1);
    }
    // skip cands[i]
    rec(i + 1);
  };

  rec(0);

  if (!bestSet) return { ok: false, errors: [err('NO_FEASIBLE_TEAM')] };

  const xiPlayers = [...lockedPlayers, ...(bestSet as number[]).map((idx) => cands[idx].p)];
  return {
    ok: true,
    xi: xiPlayers.map((p) => p.name),
    creditsUsed: xiPlayers.reduce((s, p) => s + to10(p.credits), 0) / 10,
    objective: best,
    exact: !cut,
    nodes,
  };
}
