import type { BuilderError, BuilderPlayer, Role, Rules } from './types';
import { ROLES } from './types';
import { err } from './errors';

const to10 = (c: number) => Math.round(c * 10);

export function creditsOf(xi: BuilderPlayer[]): number {
  return xi.reduce((s, p) => s + to10(p.credits), 0) / 10;
}

/** Counts by role and by team for any selection. */
export function countsOf(xi: BuilderPlayer[]) {
  const byRole: Record<Role, number> = { WK: 0, BAT: 0, AR: 0, BOWL: 0 };
  const byTeam: Record<string, number> = {};
  for (const p of xi) {
    byRole[p.role]++;
    byTeam[p.teamShort] = (byTeam[p.teamShort] ?? 0) + 1;
  }
  return { byRole, byTeam };
}

/**
 * Full validation of a finished team (11 players + C + VC).
 * Returns [] when valid. Every error is human-readable via describeError().
 */
export function validateTeam(
  names: string[],
  c: string | null,
  vc: string | null,
  pool: BuilderPlayer[],
  rules: Rules
): BuilderError[] {
  const errors: BuilderError[] = [];
  const byName = new Map(pool.map((p) => [p.name, p]));
  const seen = new Set<string>();
  const players: BuilderPlayer[] = [];

  for (const n of names) {
    if (seen.has(n)) {
      errors.push(err('DUPLICATE_PLAYER', { name: n }));
      continue;
    }
    seen.add(n);
    const p = byName.get(n);
    if (!p) errors.push(err('UNKNOWN_PLAYER', { name: n }));
    else players.push(p);
  }

  if (players.length !== rules.teamSize) {
    errors.push(err('WRONG_COUNT', { count: players.length, expected: rules.teamSize }));
  }

  const { byRole, byTeam } = countsOf(players);
  for (const [team, count] of Object.entries(byTeam)) {
    if (count > rules.maxPerTeam) errors.push(err('TEAM_LIMIT', { team, count, max: rules.maxPerTeam }));
  }
  for (const r of ROLES) {
    const { min, max } = rules.roles[r];
    // only complain about a MINIMUM once the team is full, otherwise it is just "not done yet"
    if (players.length === rules.teamSize && byRole[r] < min) errors.push(err('ROLE_MIN', { role: r, count: byRole[r], min }));
    if (byRole[r] > max) errors.push(err('ROLE_MAX', { role: r, count: byRole[r], max }));
  }
  const used = creditsOf(players);
  if (to10(used) > to10(rules.creditBudget)) errors.push(err('CREDITS_OVER', { used, budget: rules.creditBudget }));

  if (!c) errors.push(err('CAPTAIN_MISSING'));
  else if (!seen.has(c)) errors.push(err('CAPTAIN_NOT_IN_XI', { name: c }));
  if (!vc) errors.push(err('VC_MISSING'));
  else if (!seen.has(vc)) errors.push(err('VC_NOT_IN_XI', { name: vc }));
  if (c && vc && c === vc) errors.push(err('CAPTAIN_IS_VC'));

  return errors;
}
