/**
 * Pulse Builder: shared types. Everything here is owned by Stream 1 (Builder).
 * Nothing in this folder imports React; it is all pure and unit-testable.
 */

export type Role = 'WK' | 'BAT' | 'AR' | 'BOWL';
export type Lang = 'en' | 'hinglish' | 'hi';
export type Mode = 'safe' | 'balanced' | 'grand';

export const ROLES: Role[] = ['WK', 'BAT', 'AR', 'BOWL'];
export const MODES: Mode[] = ['safe', 'balanced', 'grand'];

/** Per-player projection. ALL values come from a ProjectionProvider (model or user import). */
export interface Projection {
  expectedPoints: number;
  /** "Bad day" scenario points. Not a statistical percentile. */
  floor: number;
  /** "Great day" scenario points. Not a statistical percentile. */
  ceiling: number;
  /** Illustrative share of teams (0-100) that would pick this player. */
  ownershipPct: number;
}

export interface BuilderPlayer {
  /** Cricsheet name, identical to the names used by the Pulse engine (e.g. "YBK Jaiswal"). */
  name: string;
  team: string;
  teamShort: string;
  role: Role;
  /** Credits in 0.5 steps (7.5 to 11). */
  credits: number;
  /** Assumed batting position 1-11 (assumption, see projection.ts). */
  battingPos: number;
  /** Assumed overs bowled (role-based default, not actual usage). */
  expectedOvers: number;
  projection: Projection;
}

export interface Rules {
  _comment?: string;
  teamSize: number;
  creditBudget: number;
  maxPerTeam: number;
  roles: Record<Role, { min: number; max: number }>;
}

export interface SquadsFile {
  _comment?: string;
  matchId: string;
  matchLabel: string;
  modelId: string;
  modelLabel: string;
  disclaimer: string;
  players: BuilderPlayer[];
}

/** A machine-readable error that can be rendered in en / hinglish / hi. */
export interface BuilderError {
  code: BuilderErrorCode;
  params: Record<string, string | number>;
}

export type BuilderErrorCode =
  | 'UNKNOWN_PLAYER'
  | 'LOCK_EXCLUDE_CONFLICT'
  | 'TOO_MANY_LOCKS'
  | 'LOCK_TEAM_LIMIT'
  | 'LOCK_ROLE_LIMIT'
  | 'LOCK_CREDITS'
  | 'POOL_TOO_SMALL'
  | 'ROLE_UNREACHABLE'
  | 'NO_FEASIBLE_TEAM'
  | 'WRONG_COUNT'
  | 'DUPLICATE_PLAYER'
  | 'TEAM_LIMIT'
  | 'ROLE_MIN'
  | 'ROLE_MAX'
  | 'CREDITS_OVER'
  | 'CAPTAIN_MISSING'
  | 'VC_MISSING'
  | 'CAPTAIN_NOT_IN_XI'
  | 'VC_NOT_IN_XI'
  | 'CAPTAIN_IS_VC';

export interface TeamTotals {
  /** Sum of expectedPoints of the XI, no multipliers. */
  expectedPoints: number;
  floor: number;
  ceiling: number;
  /** Expected total once C (2x) and VC (1.5x) multipliers are applied. */
  expectedWithCaptains: number;
  avgOwnership: number;
}

export interface BuiltTeam {
  id: string;
  mode: Mode;
  xi: string[];
  c: string;
  vc: string;
  creditsUsed: number;
  totals: TeamTotals;
  /** true if the solver proved optimality (no node-limit cut-off). */
  exact: boolean;
}
