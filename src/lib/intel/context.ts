import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';
import type { CricsheetData } from '../engine/timeline';
import rivalsData from '../../data/rivals.json';
import type { IntelContext, IntelTeam } from './types';

export function defaultRivals(): IntelTeam[] {
  return (rivalsData as Array<TeamSelection & { id: string; name: string; owner: string }>).map((r) => ({
    id: r.id,
    name: r.name,
    owner: r.owner,
    isUser: false,
    sel: { xi: r.xi, c: r.c, vc: r.vc },
  }));
}

export function createIntelContext(
  frames: Frame[],
  config: ScoringConfig,
  match: CricsheetData | null,
  rivals: IntelTeam[] = defaultRivals()
): IntelContext {
  const squads: Record<string, string[]> = {};
  if (match) for (const t of match.info.teams) squads[t] = match.info.players[t] ?? [];
  return { frames, config, squads, rivals };
}

export function userTeam(sel: TeamSelection): IntelTeam {
  return { id: 'user-team', name: 'My Team', owner: 'You', isUser: true, sel };
}

/** Stable key for a team selection (used for memoisation). */
export function teamKey(sel: TeamSelection): string {
  return `${sel.xi.join('|')}#${sel.c}#${sel.vc}`;
}
