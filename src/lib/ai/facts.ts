import {
  Frame,
  KeyEvent,
  TeamSelection,
  ScoringConfig,
  NudgeFacts,
  NudgeImpact
} from '../engine/types';
import { teamPoints } from '../engine/points';
import { computeRootFor } from '../engine/rootfor';

export function buildNudgeFacts(
  frame: Frame,
  prevFrame: Frame | null,
  event: KeyEvent,
  team: TeamSelection,
  config: ScoringConfig,
  lang: 'en' | 'hinglish' | 'hi',
  rankBefore?: number,
  rankAfter?: number
): NudgeFacts {
  const currentTeamPts = teamPoints(frame.points, team, config);
  const prevTeamPts = prevFrame
    ? teamPoints(prevFrame.points, team, config)
    : currentTeamPts;

  const userPlayersSet = new Set(team.xi);
  const impacts: NudgeImpact[] = [];

  for (const player of event.players) {
    if (userPlayersSet.has(player)) {
      const curP = currentTeamPts.byPlayer[player];
      const prevP = prevTeamPts.byPlayer[player];
      if (curP && prevP) {
        const delta = Math.round((curP.totalPts - prevP.totalPts) * 10) / 10;
        const why: string[] = [];

        // Determine why
        const curB = curP.breakdown;
        const prevB = prevP.breakdown;

        if (curB.runs > prevB.runs) why.push(`+${curB.runs - prevB.runs} runs`);
        if (curB.boundaries > prevB.boundaries) why.push(`+${curB.boundaries - prevB.boundaries} boundary bonus`);
        if (curB.sixes > prevB.sixes) why.push(`+${curB.sixes - prevB.sixes} six bonus`);
        if (curB.milestones > prevB.milestones) why.push(`+${curB.milestones - prevB.milestones} milestone`);
        if (curB.wickets > prevB.wickets) why.push(`+${curB.wickets - prevB.wickets} wicket`);
        if (curB.lbwBowled > prevB.lbwBowled) why.push(`+${curB.lbwBowled - prevB.lbwBowled} bowled/lbw`);
        if (curB.hauls > prevB.hauls) why.push(`+${curB.hauls - prevB.hauls} haul bonus`);
        if (curB.maidens > prevB.maidens) why.push(`+${curB.maidens - prevB.maidens} maiden`);
        if (curB.catches > prevB.catches) why.push(`+${curB.catches - prevB.catches} catch`);
        if (curB.stumpings > prevB.stumpings) why.push(`+${curB.stumpings - prevB.stumpings} stumping`);
        if (curB.runOuts > prevB.runOuts) why.push(`+${curB.runOuts - prevB.runOuts} run out`);
        if (curB.duck !== prevB.duck && curB.duck < 0) why.push(`${curB.duck} duck penalty`);

        impacts.push({
          player,
          role: curP.role,
          basePts: curP.basePts,
          multiplier: curP.multiplier,
          delta,
          why,
        });
      }
    }
  }

  const rootFor = computeRootFor(frame, team, config);

  return {
    lang,
    event: {
      type: event.type,
      over: frame.currentScore.oversStr,
      scoreLine: frame.scoreLine,
      summary: event.description,
    },
    impacts,
    team: {
      before: prevTeamPts.total,
      after: currentTeamPts.total,
      rankBefore,
      rankAfter,
    },
    rootFor: rootFor.length > 0 ? rootFor : undefined,
  };
}

