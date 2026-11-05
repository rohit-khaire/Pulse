import {
  Frame,
  KeyEvent,
  ScoringConfig,
  PlayerStats,
  PointsResult,
  DeliveryDetail
} from './types';
import { createInitialStats, processDelivery, RawDelivery } from './stats';
import { pointsFromStats } from './points';
import { detectKeyEvents } from './triggers';

export interface CricsheetData {
  info: {
    teams: string[];
    players: Record<string, string[]>;
    dates: string[];
    event?: { name?: string; match_number?: number };
    outcome?: {
      winner?: string;
      by?: { runs?: number; wickets?: number };
      result?: string;
    };
    player_of_match?: string[];
  };
  innings: {
    team: string;
    overs: {
      over: number;
      deliveries: RawDelivery[];
    }[];
  }[];
}

export function buildTimeline(
  match: CricsheetData,
  config: ScoringConfig
): { frames: Frame[]; events: KeyEvent[] } {
  const frames: Frame[] = [];

  // 1. Gather all players
  const allPlayers: string[] = [];
  for (const team of match.info.teams) {
    const squad = match.info.players[team] || [];
    for (const p of squad) {
      if (!allPlayers.includes(p)) {
        allPlayers.push(p);
      }
    }
  }

  // 2. Initial Stats at Frame 0 (Playing XI bonus)
  let currentStats: Record<string, PlayerStats> = createInitialStats(allPlayers);
  let currentPoints: Record<string, PointsResult> = {};
  for (const p of allPlayers) {
    currentPoints[p] = pointsFromStats(currentStats[p], config);
  }

  const team1 = match.info.teams[0] || 'Team 1';
  const team2 = match.info.teams[1] || 'Team 2';

  // Frame 0: Before first ball
  frames.push({
    i: 0,
    innings: 1,
    over: 0,
    ball: 0,
    ballInOver: 0,
    bowler: '',
    batter: '',
    nonStriker: '',
    battingTeam: team1,
    bowlingTeam: team2,
    scoreLine: `${team1} 0/0 (0.0 ov)`,
    currentScore: { runs: 0, wickets: 0, oversStr: '0.0' },
    recentBalls: [],
    delivery: {
      inningsIndex: 0,
      team: team1,
      bowler: '',
      batter: '',
      nonStriker: '',
      runsBatter: 0,
      runsExtras: 0,
      runsTotal: 0,
      isWide: false,
      isNoBall: false,
      isBye: false,
      isLegBye: false,
      isLegal: true,
      isDot: false,
      isFour: false,
      isSix: false,
      wickets: [],
    },
    stats: currentStats,
    points: currentPoints,
  });

  let innings1TotalRuns = 0;

  // Process innings
  for (let innIdx = 0; innIdx < match.innings.length; innIdx++) {
    const innings = match.innings[innIdx];
    const battingTeam = innings.team;
    const bowlingTeam = match.info.teams.find((t) => t !== battingTeam) || 'Opponent';
    const inningsNum = innIdx + 1;

    let innRuns = 0;
    let innWickets = 0;
    let innLegalBalls = 0;
    let recentBalls: string[] = [];

    for (let oIdx = 0; oIdx < innings.overs.length; oIdx++) {
      const overObj = innings.overs[oIdx];
      const overNum = overObj.over; // 0, 1, 2...
      const deliveries = overObj.deliveries;

      let overConcededRuns = 0;
      let overLegalBalls = 0;

      for (let dIdx = 0; dIdx < deliveries.length; dIdx++) {
        const d = deliveries[dIdx];
        const isLastDeliveryInOver = dIdx === deliveries.length - 1;

        const isWide = !!(d.extras && d.extras.wides);
        const isNoBall = !!(d.extras && d.extras.noballs);
        const isBye = !!(d.extras && d.extras.byes);
        const isLegBye = !!(d.extras && d.extras.legbyes);
        const isLegal = !isWide && !isNoBall;
        const runsTotal = d.runs.total;
        const runsBatter = d.runs.batter;
        const isDot = isLegal && runsTotal === 0;
        const isFour = !d.runs.non_boundary && runsBatter === 4;
        const isSix = !d.runs.non_boundary && runsBatter === 6;

        // Process stats
        const result = processDelivery(
          currentStats,
          d,
          isLastDeliveryInOver,
          overConcededRuns,
          overLegalBalls
        );

        currentStats = result.newStats;
        overConcededRuns += result.concededRunsThisBall;
        if (result.isLegal) {
          overLegalBalls += 1;
          innLegalBalls += 1;
        }

        // Innings score updates
        innRuns += runsTotal;
        if (d.wickets && d.wickets.length > 0) {
          innWickets += d.wickets.length;
        }

        // Calculate overs string: e.g. "5.2"
        const completedOvers = Math.floor(innLegalBalls / 6);
        const remBalls = innLegalBalls % 6;
        const oversStr = `${completedOvers}.${remBalls}`;

        // Ball chip notation
        let chipLabel = `${runsTotal}`;
        if (d.wickets && d.wickets.length > 0) {
          chipLabel = 'W';
        } else if (isWide) {
          chipLabel = `${runsTotal}wd`;
        } else if (isNoBall) {
          chipLabel = `${runsTotal}nb`;
        } else if (isFour) {
          chipLabel = '4';
        } else if (isSix) {
          chipLabel = '6';
        }
        recentBalls = [...recentBalls, chipLabel].slice(-6);

        // Update points
        const updatedPoints: Record<string, PointsResult> = {};
        for (const p of allPlayers) {
          updatedPoints[p] = pointsFromStats(currentStats[p], config);
        }
        currentPoints = updatedPoints;

        // Delivery Detail
        const deliveryDetail: DeliveryDetail = {
          inningsIndex: innIdx,
          team: battingTeam,
          bowler: d.bowler,
          batter: d.batter,
          nonStriker: d.non_striker,
          runsBatter: d.runs.batter,
          runsExtras: d.runs.extras,
          runsTotal: d.runs.total,
          isWide,
          isNoBall,
          isBye,
          isLegBye,
          isLegal,
          isDot,
          isFour,
          isSix,
          wickets: (d.wickets || []).map((w) => ({
            playerOut: w.player_out,
            kind: w.kind,
            fielders: w.fielders || [],
          })),
        };

        const target = innIdx === 1 ? innings1TotalRuns + 1 : undefined;
        let scoreLine = `${battingTeam} ${innRuns}/${innWickets} (${oversStr} ov)`;
        if (target) {
          const needed = target - innRuns;
          scoreLine += ` • Target ${target} (${needed > 0 ? needed : 0} to win)`;
        }

        frames.push({
          i: frames.length,
          innings: inningsNum,
          over: overNum,
          ball: dIdx + 1,
          ballInOver: overLegalBalls,
          bowler: d.bowler,
          batter: d.batter,
          nonStriker: d.non_striker,
          battingTeam,
          bowlingTeam,
          scoreLine,
          currentScore: {
            runs: innRuns,
            wickets: innWickets,
            oversStr,
          },
          target,
          recentBalls,
          delivery: deliveryDetail,
          stats: currentStats,
          points: currentPoints,
        });
      }
    }

    if (innIdx === 0) {
      innings1TotalRuns = innRuns;
    }
  }

  // Detect key events across frames
  const events = detectKeyEvents(frames, config);

  return { frames, events };
}

