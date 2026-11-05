import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';

/** One fantasy team in the (simulated) mini-league. */
export interface IntelTeam {
  id: string;
  name: string;
  owner: string;
  isUser: boolean;
  sel: TeamSelection;
}

/** Everything the intel engine needs; built from store data, no React involved. */
export interface IntelContext {
  frames: Frame[];
  config: ScoringConfig;
  /** team name -> XI in team-sheet order (from the match file) */
  squads: Record<string, string[]>;
  /** rivals are SAMPLE data (src/data/rivals.json) */
  rivals: IntelTeam[];
}

export type IntelLang = 'en' | 'hinglish' | 'hi';
