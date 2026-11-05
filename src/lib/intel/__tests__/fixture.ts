import scoringConfig from '../../engine/scoring.t20.json';
import type { ScoringConfig, TeamSelection } from '../../engine/types';
import { buildTimeline, type CricsheetData } from '../../engine/timeline';
import matchData from '../../../../public/matches/1254111.json';
import sampleTeam from '../../../data/sample-team.json';
import { createIntelContext } from '../context';

export const config = scoringConfig as ScoringConfig;
export const match = matchData as unknown as CricsheetData;
export const team = sampleTeam as TeamSelection;
export const { frames, events } = buildTimeline(match, config);
export const ctx = createIntelContext(frames, config, match);

/** first frame of the second innings and the last frame of the first */
export const firstInn2 = frames.findIndex((f) => f.innings === 2);
export const lastInn1 = firstInn2 - 1;
export const lastFrame = frames.length - 1;
