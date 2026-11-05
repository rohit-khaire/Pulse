import type { BuilderPlayer, Lang, Mode, Role } from './types';
import { ROLES } from './types';
import { countsOf, creditsOf } from './rulesCheck';
import { summarize } from './autobuild';
import scoringData from '../engine/scoring.t20.json';
import type { ScoringConfig } from '../engine/types';

const scoring = scoringData as ScoringConfig;

export interface PickFacts {
  name: string;
  team: string;
  role: Role;
  credits: number;
  expectedPoints: number;
  floor: number;
  ceiling: number;
  ownershipPct: number;
  /** 'C' | 'VC' | 'XI' (plain member) */
  slot: 'C' | 'VC' | 'XI';
  /** deterministic flags computed in TypeScript, never by the LLM */
  isTopExpected: boolean;
  isTopFloor: boolean;
  isTopCeiling: boolean;
  isLowOwned: boolean;
}

export interface ExplainFacts {
  lang: Lang;
  mode: Mode;
  modeLabel: string;
  kind: 'team' | 'player';
  constants: {
    teamSize: number;
    creditBudget: number;
    maxPerTeam: number;
    captainMultiplier: number;
    viceCaptainMultiplier: number;
  };
  team: {
    creditsUsed: number;
    creditsLeft: number;
    split: Record<string, number>;
    roles: Record<Role, number>;
    projectedTotal: number;
    floorTotal: number;
    ceilingTotal: number;
    avgOwnership: number;
  };
  captain: PickFacts;
  viceCaptain: PickFacts;
  picks: PickFacts[];
  focus?: PickFacts;
  disclaimer: string;
}

export const MODE_LABEL: Record<Mode, string> = {
  safe: 'Safe',
  balanced: 'Balanced',
  grand: 'Grand League',
};

export const DISCLAIMER = 'Illustrative model, not real form data';

export function buildExplainFacts(args: {
  lang: Lang;
  mode: Mode;
  xi: string[];
  c: string;
  vc: string;
  pool: BuilderPlayer[];
  creditBudget: number;
  teamSize: number;
  maxPerTeam: number;
  focusName?: string;
}): ExplainFacts {
  const { pool, xi, c, vc } = args;
  const byName = new Map(pool.map((p) => [p.name, p]));
  const ps = xi.map((n) => {
    const p = byName.get(n);
    if (!p) throw new Error(`Unknown player ${n}`);
    return p;
  });
  const max = (f: (p: BuilderPlayer) => number) => Math.max(...ps.map(f));
  const topE = max((p) => p.projection.expectedPoints);
  const topF = max((p) => p.projection.floor);
  const topC = max((p) => p.projection.ceiling);

  const toPick = (p: BuilderPlayer): PickFacts => ({
    name: p.name,
    team: p.teamShort,
    role: p.role,
    credits: p.credits,
    expectedPoints: p.projection.expectedPoints,
    floor: p.projection.floor,
    ceiling: p.projection.ceiling,
    ownershipPct: p.projection.ownershipPct,
    slot: p.name === c ? 'C' : p.name === vc ? 'VC' : 'XI',
    isTopExpected: p.projection.expectedPoints === topE,
    isTopFloor: p.projection.floor === topF,
    isTopCeiling: p.projection.ceiling === topC,
    isLowOwned: p.projection.ownershipPct < 25,
  });

  const t = summarize(xi, c, vc, pool, args.mode);
  const { byRole, byTeam } = countsOf(ps);
  const picks = ps.map(toPick);
  const focus = args.focusName ? picks.find((p) => p.name === args.focusName) : undefined;
  const used = creditsOf(ps);

  return {
    lang: args.lang,
    mode: args.mode,
    modeLabel: MODE_LABEL[args.mode],
    kind: focus ? 'player' : 'team',
    constants: {
      teamSize: args.teamSize,
      creditBudget: args.creditBudget,
      maxPerTeam: args.maxPerTeam,
      captainMultiplier: scoring.multipliers.C,
      viceCaptainMultiplier: scoring.multipliers.VC,
    },
    team: {
      creditsUsed: used,
      creditsLeft: Math.round((args.creditBudget - used) * 10) / 10,
      split: byTeam,
      roles: ROLES.reduce((o, r) => ({ ...o, [r]: byRole[r] }), {} as Record<Role, number>),
      projectedTotal: t.totals.expectedWithCaptains,
      floorTotal: t.totals.floor,
      ceilingTotal: t.totals.ceiling,
      avgOwnership: t.totals.avgOwnership,
    },
    captain: picks.find((p) => p.slot === 'C')!,
    viceCaptain: picks.find((p) => p.slot === 'VC')!,
    picks,
    focus,
    disclaimer: DISCLAIMER,
  };
}
