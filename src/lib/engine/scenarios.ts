import { Frame, TeamSelection, ScoringConfig } from './types';
import { teamPoints } from './points';
import { computeLeaderboard, LeaderboardEntry } from './league';
import rivalsData from '@/data/rivals.json';

export type ScenarioFeasibility = 'Plausible' | 'Moderate' | 'Unlikely';

export interface VictoryScenario {
  id: string;
  title: string;
  description: string;
  pointGain: number;
  requiredEvents: string[];
  expectedPointDelta: number;
  gapImpact: string;
  assumptions: string[];
  feasibility: ScenarioFeasibility;
  actionableHint: string;
  /** Backward-compatible probability field. */
  probability: 'High' | 'Medium' | 'Golden Path' | ScenarioFeasibility;
}

export interface PathToVictoryResult {
  currentRank: number;
  targetRank: number;
  pointsBehindLeader: number;
  leaderName: string;
  isLeader: boolean;
  leadMargin?: number;
  isSettled?: boolean;
  scenarios: VictoryScenario[];
  threats: string[];
}

export interface HeadToHeadClash {
  hasClash: boolean;
  rivalName: string;
  rivalOwner: string;
  rivalScore: number;
  userScore: number;
  gap: number; // userScore - rivalScore (positive = ahead, negative = behind)
  userClashRole?: string; // e.g. "You have Bowler (VC)"
  rivalClashRole?: string; // e.g. "Aman has Batter"
  eventDescription?: string;
  swingOnWicket?: number;
  swingOnSix?: number;
}

export function computePathToVictory(
  frame: Frame,
  userTeam: TeamSelection,
  config: ScoringConfig
): PathToVictoryResult {
  const leaderboard = computeLeaderboard(frame, null, userTeam, config);
  const userEntry = leaderboard.find((e) => e.isUser)!;
  const currentRank = userEntry.rank;
  const leaderEntry = leaderboard[0];
  const isLeader = currentRank === 1;

  const pointsBehindLeader = isLeader ? 0 : Math.max(0, leaderEntry.totalPts - userEntry.totalPts);
  const leadMargin = isLeader ? (leaderboard[1] ? userEntry.totalPts - leaderboard[1].totalPts : 0) : undefined;

  const [o, b] = (frame.currentScore?.oversStr || '0.0').split('.');
  const legalBallsBowled = parseInt(o, 10) * 6 + parseInt(b || '0', 10);
  const ballsLeft = Math.max(0, 120 - legalBallsBowled);
  const isSettled =
    frame.innings >= 2 &&
    (legalBallsBowled >= 120 ||
      frame.currentScore.wickets >= 10 ||
      (frame.target !== undefined && frame.currentScore.runs >= frame.target));

  if (isSettled) {
    return {
      currentRank,
      targetRank: 1,
      pointsBehindLeader: Math.round(pointsBehindLeader * 10) / 10,
      leaderName: leaderEntry.name,
      isLeader,
      leadMargin,
      isSettled: true,
      scenarios: [],
      threats: ['Match has concluded. Final standings and fantasy points are locked.'],
    };
  }

  const scenarios: VictoryScenario[] = [];
  const threats: string[] = [];

  const batter = frame.batter;
  const bowler = frame.bowler;
  const userSet = new Set(userTeam.xi);

  // If user is already leader
  if (isLeader) {
    const secondPlace = leaderboard[1];
    const margin = Math.round((leadMargin || 0) * 10) / 10;
    scenarios.push({
      id: 'defend-lead',
      title: 'Defend Your #1 Position',
      description: `You are currently leading by ${margin} points over ${secondPlace.name}.`,
      pointGain: margin,
      requiredEvents: [
        'Maintain bowler economy under 8.5 RPO in remaining overs',
        `Prevent ${secondPlace.name}'s players from scoring boundary bonuses`,
      ],
      expectedPointDelta: 0,
      gapImpact: `Preserves Rank #1 and protects your ${margin} pt margin over #2`,
      assumptions: [
        'Dismissed players do not accumulate additional points',
        'Your active players hold current baseline performance',
      ],
      feasibility: margin > 20 ? 'Plausible' : 'Moderate',
      probability: margin > 20 ? 'High' : 'Medium',
      actionableHint: 'Every dot ball from your bowlers protects your lead margin.',
    });
  } else {
    // 1. Bowling Wicket Scenario (only if bowler has quota left and match has balls left)
    if (bowler && userSet.has(bowler)) {
      const bStats = frame.stats[bowler];
      const legalBowled = bStats?.legalBalls ?? 0;
      if (legalBowled < 24 && ballsLeft > 0) {
        const isC = bowler === userTeam.c;
        const isVC = bowler === userTeam.vc;
        const mult = isC ? config.multipliers.C : isVC ? config.multipliers.VC : 1;
        const wktPts = Math.round(config.bowling.wicket * mult);
        const overtakes = wktPts >= pointsBehindLeader;
        const newGap = Math.max(0, pointsBehindLeader - wktPts);

        scenarios.push({
          id: 'bowler-wicket',
          title: `${bowler} Takes a Wicket`,
          description: `${isC ? 'Captain ' : isVC ? 'VC ' : ''}${bowler} getting a wicket awards +${wktPts} pts (+30 × ${mult}x).`,
          pointGain: wktPts,
          requiredEvents: [
            `${bowler} delivers a wicket delivery (bowled, caught, LBW, or stumped)`,
            'Umpire decision stands (valid dismissal credit)',
          ],
          expectedPointDelta: wktPts,
          gapImpact: overtakes
            ? `Immediately launches you into Rank #1 (margin +${Math.round((wktPts - pointsBehindLeader) * 10) / 10} pts)`
            : `Cuts the gap to leader from ${pointsBehindLeader} down to ${newGap} pts`,
          assumptions: [
            'Wicket is credited directly to bowler (not run out)',
            'Leader XI does not gain offsetting points on the same delivery',
          ],
          feasibility: ballsLeft >= 12 ? 'Plausible' : 'Moderate',
          probability: 'High',
          actionableHint: overtakes
            ? '🎯 This single wicket immediately launches you into Rank #1!'
            : `Cuts the gap to leader down to ${newGap} pts.`,
        });
      }
    }

    // 2. Batter Milestone Scenario (only if batter is not out and balls remain)
    if (batter && userSet.has(batter)) {
      const stats = frame.stats[batter];
      if (stats && !stats.out && ballsLeft > 0) {
        const isC = batter === userTeam.c;
        const isVC = batter === userTeam.vc;
        const mult = isC ? config.multipliers.C : isVC ? config.multipliers.VC : 1;

        if (stats.runs < 50) {
          const neededFor50 = 50 - stats.runs;
          const milestonePts = 8;
          const totalPointsFrom50 = Math.round((neededFor50 * config.batting.run + milestonePts) * mult);
          const overtakes = totalPointsFrom50 >= pointsBehindLeader;
          const newGap = Math.max(0, pointsBehindLeader - totalPointsFrom50);
          const feasible: ScenarioFeasibility =
            neededFor50 <= ballsLeft && neededFor50 <= 25
              ? 'Plausible'
              : neededFor50 <= ballsLeft * 2
              ? 'Moderate'
              : 'Unlikely';

          scenarios.push({
            id: 'batter-50',
            title: `${batter} Reaches 50`,
            description: `${isC ? 'Captain ' : isVC ? 'VC ' : ''}${batter} is on ${stats.runs}. Scoring ${neededFor50} more runs gives +${totalPointsFrom50} pts (runs + 50-bonus × ${mult}x).`,
            pointGain: totalPointsFrom50,
            requiredEvents: [
              `${batter} scores ${neededFor50} runs before innings end`,
              `Triggers 50-run milestone bonus (+${milestonePts} base pts)`,
              'Avoids dismissal before reaching 50 runs',
            ],
            expectedPointDelta: totalPointsFrom50,
            gapImpact: overtakes
              ? `Overtakes leader into Rank #1 with a margin of +${Math.round((totalPointsFrom50 - pointsBehindLeader) * 10) / 10} pts`
              : `Brings you within ${newGap} pts of leader`,
            assumptions: [
              `Batter receives sufficient strike out of ${ballsLeft} remaining balls`,
              'Maintains positive scoring rate without dismissal',
            ],
            feasibility: feasible,
            probability: feasible === 'Plausible' ? 'High' : 'Medium',
            actionableHint: overtakes
              ? 'Reaching this milestone puts you into Rank #1.'
              : `Cuts the gap to leader down to ${newGap} pts.`,
          });
        }
      }
    }

    // 3. Wicket Haul Scenario (only if bowler has quota left and match has balls left)
    const teamBowlers = userTeam.xi.filter((p) => {
      const s = frame.stats[p];
      return s && s.wickets >= 2 && s.wickets < 5 && (s.legalBalls ?? 0) < 24;
    });

    if (teamBowlers.length > 0 && ballsLeft >= 6) {
      const targetBowler = teamBowlers[0];
      const s = frame.stats[targetBowler];
      const isC = targetBowler === userTeam.c;
      const isVC = targetBowler === userTeam.vc;
      const mult = isC ? config.multipliers.C : isVC ? config.multipliers.VC : 1;
      const haulBonusPts = Math.round((config.bowling.wicket + 4) * mult);
      const overtakes = haulBonusPts >= pointsBehindLeader;

      scenarios.push({
        id: 'haul-bonus',
        title: `${targetBowler} Wicket Haul`,
        description: `Currently on ${s.wickets} wickets. 1 more wicket activates the 3-wicket haul bonus (+${haulBonusPts} pts).`,
        pointGain: haulBonusPts,
        requiredEvents: [
          `${targetBowler} bowls remaining overs in quota`,
          'Takes 1 additional wicket to unlock 3-wicket haul bonus (+4 base pts)',
        ],
        expectedPointDelta: haulBonusPts,
        gapImpact: overtakes
          ? `Vaults into Rank #1 over ${leaderEntry.name}`
          : `Reduces gap to leader to ${Math.max(0, pointsBehindLeader - haulBonusPts)} pts`,
        assumptions: [
          `${targetBowler} is assigned at least 1 more over by captain`,
          'Wicket is credited to bowler',
        ],
        feasibility: 'Moderate',
        probability: 'Medium',
        actionableHint: 'A death-over breakthrough could flip the contest in one over.',
      });
    }
  }

  // Threats from leader's team
  const leaderRival = rivalsData.find((r) => r.name === leaderEntry.name);
  if (leaderRival && !isLeader) {
    if (batter && leaderRival.xi.includes(batter) && !userSet.has(batter)) {
      threats.push(`${leaderEntry.owner} owns active batter ${batter}. Every boundary widens your deficit.`);
    }
    if (bowler && leaderRival.xi.includes(bowler) && !userSet.has(bowler)) {
      threats.push(`${leaderEntry.owner} has active bowler ${bowler}. Hope for no wickets!`);
    }
  }

  return {
    currentRank,
    targetRank: 1,
    pointsBehindLeader: Math.round(pointsBehindLeader * 10) / 10,
    leaderName: leaderEntry.name,
    isLeader,
    leadMargin,
    isSettled: false,
    scenarios: scenarios.slice(0, 3),
    threats,
  };
}

export function computeHeadToHeadClash(
  frame: Frame,
  userTeam: TeamSelection,
  config: ScoringConfig
): HeadToHeadClash {
  // Focus rival: Aman's XI (rival-1)
  const rival = rivalsData[0];
  const userPts = teamPoints(frame.points, userTeam, config).total;
  const rivalPts = teamPoints(frame.points, rival as TeamSelection, config).total;
  const gap = Math.round((userPts - rivalPts) * 10) / 10;

  const batter = frame.batter;
  const bowler = frame.bowler;

  const userHasBatter = userTeam.xi.includes(batter);
  const userHasBowler = userTeam.xi.includes(bowler);
  const rivalHasBatter = rival.xi.includes(batter);
  const rivalHasBowler = rival.xi.includes(bowler);

  let hasClash = false;
  let userClashRole = '';
  let rivalClashRole = '';
  let eventDescription = '';
  let swingOnWicket = 0;
  let swingOnSix = 0;

  // Case 1: User has bowler, Rival has batter (Epic Duel)
  if (userHasBowler && rivalHasBatter && !userHasBatter && !rivalHasBowler) {
    hasClash = true;
    const isUserC = bowler === userTeam.c;
    const isUserVC = bowler === userTeam.vc;
    const isRivalC = batter === rival.c;
    const isRivalVC = batter === rival.vc;

    const userBowlerMult = isUserC ? 2 : isUserVC ? 1.5 : 1;
    const rivalBatterMult = isRivalC ? 2 : isRivalVC ? 1.5 : 1;

    userClashRole = `Your Bowler: ${bowler} (${isUserC ? 'C' : isUserVC ? 'VC' : '1x'})`;
    rivalClashRole = `Aman's Batter: ${batter} (${isRivalC ? 'C' : isRivalVC ? 'VC' : '1x'})`;

    swingOnWicket = Math.round(30 * userBowlerMult);
    swingOnSix = Math.round(6 * rivalBatterMult);

    eventDescription = `Direct Duel: A wicket gives you +${swingOnWicket} pts! A six gives Aman +${swingOnSix} pts.`;
  }
  // Case 2: User has batter, Rival has bowler
  else if (userHasBatter && rivalHasBowler && !userHasBowler && !rivalHasBatter) {
    hasClash = true;
    const isUserC = batter === userTeam.c;
    const isUserVC = batter === userTeam.vc;
    const isRivalC = bowler === rival.c;
    const isRivalVC = bowler === rival.vc;

    const userBatterMult = isUserC ? 2 : isUserVC ? 1.5 : 1;
    const rivalBowlerMult = isRivalC ? 2 : isRivalVC ? 1.5 : 1;

    userClashRole = `Your Batter: ${batter} (${isUserC ? 'C' : isUserVC ? 'VC' : '1x'})`;
    rivalClashRole = `Aman's Bowler: ${bowler} (${isRivalC ? 'C' : isRivalVC ? 'VC' : '1x'})`;

    swingOnWicket = Math.round(30 * rivalBowlerMult);
    swingOnSix = Math.round(6 * userBatterMult);

    eventDescription = `Direct Duel: Root for ${batter} to hit a six (+${swingOnSix} pts) and avoid dismissal!`;
  }

  return {
    hasClash,
    rivalName: rival.name,
    rivalOwner: rival.owner,
    rivalScore: rivalPts,
    userScore: userPts,
    gap,
    userClashRole: userClashRole || undefined,
    rivalClashRole: rivalClashRole || undefined,
    eventDescription: eventDescription || undefined,
    swingOnWicket: swingOnWicket || undefined,
    swingOnSix: swingOnSix || undefined,
  };
}

