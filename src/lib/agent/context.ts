import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';
import sampleTeam from '../../data/sample-team.json';
import type { AgentContext, Lang } from './types';

export const SAMPLE_TEAM = sampleTeam as TeamSelection;

/**
 * Client-supplied teams are untrusted input. Accept only 11 distinct real players with distinct C/VC from the XI;
 * otherwise use the demo team. Prevents the request body from smuggling arbitrary strings into tool results.
 */
export function sanitizeTeam(team: unknown, players: string[]): TeamSelection {
  try {
    const t = team as Partial<TeamSelection> | null | undefined;
    if (!t || !Array.isArray(t.xi) || typeof t.c !== 'string' || typeof t.vc !== 'string') return SAMPLE_TEAM;
    const set = new Set(players);
    const xi = [...new Set(t.xi.filter((p): p is string => typeof p === 'string'))];
    if (xi.length !== 11 || !xi.every((p) => set.has(p))) return SAMPLE_TEAM;
    if (!xi.includes(t.c) || !xi.includes(t.vc) || t.c === t.vc) return SAMPLE_TEAM;
    return { xi, c: t.c, vc: t.vc };
  } catch {
    return SAMPLE_TEAM;
  }
}

export function buildAgentContext(args: {
  frames: Frame[];
  config: ScoringConfig;
  cursor: number;
  team: unknown;
  lang: Lang;
}): AgentContext {
  const players = Object.keys(args.frames[0]?.stats ?? {});
  const cursor = Math.max(0, Math.min(Math.floor(Number(args.cursor) || 0), Math.max(0, args.frames.length - 1)));
  return { frames: args.frames, config: args.config, cursor, team: sanitizeTeam(args.team, players), lang: args.lang };
}
