import { buildTimeline } from '../../engine/timeline';
import scoringConfig from '../../engine/scoring.t20.json';
import matchData from '../../../../public/matches/1254111.json';
import sampleTeam from '../../../data/sample-team.json';
import type { ScoringConfig, TeamSelection } from '../../engine/types';
import { bandOf, type OverInfo, type Prediction } from '../predictor';

export const config = scoringConfig as unknown as ScoringConfig;
export const team = sampleTeam as unknown as TeamSelection;
export const timeline = buildTimeline(matchData as never, config);
export const { frames, events } = timeline;

export const perfectPick = (o: OverInfo, cursor = 0): Prediction => ({
  overKey: o.key,
  band: bandOf(o.runs),
  wicket: o.wickets > 0,
  madeAtCursor: cursor,
  practice: false,
});

export const wrongBandPick = (o: OverInfo): Prediction => {
  const actual = bandOf(o.runs);
  const band = actual === '0-5' ? '11+' : '0-5';
  return { overKey: o.key, band, wicket: o.wickets > 0, madeAtCursor: 0, practice: false };
};
