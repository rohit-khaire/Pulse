/**
 * CAPTAIN WHAT-IF — deterministic counterfactuals on top of the real points engine.
 *
 * total(C, VC) = Σ base points + (mC-1)*base[C] + (mVC-1)*base[VC]
 * where the multipliers come from config (2x / 1.5x), so nothing is hard-coded.
 *
 * "Swap rule" for single-captain questions: if the alternative captain is
 * currently your VC, your old captain becomes VC; otherwise the VC is unchanged.
 *
 * Real fantasy apps lock C/VC at the deadline. These are what-if explanations,
 * not advice for future contests.
 */
import type { Frame, PlayerStats, PointsResult, ScoringConfig, TeamSelection } from '../engine/types';
import { pointsFromStats, teamPoints } from '../engine/points';
import { cloneStats } from '../engine/stats';
import { computeLeaderboard } from '../engine/league';

const round1 = (x: number) => Math.round(x * 10) / 10;

export interface CaptainOption {
  c: string;
  vc: string;
  total: number;
  /** total - actual total */
  delta: number;
}

export interface CaptainChoice {
  player: string;
  basePts: number;
  vc: string;
  total: number;
  delta: number;
  isActual: boolean;
}

export interface CaptainWhatIf {
  asOfFrame: number | null;
  actual: { c: string; vc: string; total: number };
  /** every valid (C, VC) pair, best first */
  options: CaptainOption[];
  /** one entry per XI player as captain (swap rule), best first */
  byCaptain: CaptainChoice[];
  bestPair: CaptainOption;
  /** extra points the best pair would have given over your actual pick (>= 0) */
  regret: number;
}

function totalFor(base: Record<string, number>, sum: number, c: string, vc: string, config: ScoringConfig): number {
  return round1(sum + (config.multipliers.C - 1) * (base[c] ?? 0) + (config.multipliers.VC - 1) * (base[vc] ?? 0));
}

export function captainWhatIf(
  points: Record<string, PointsResult>,
  team: TeamSelection,
  config: ScoringConfig,
  asOfFrame: number | null = null
): CaptainWhatIf {
  const base: Record<string, number> = {};
  let sum = 0;
  for (const p of team.xi) {
    base[p] = points[p]?.total ?? 0;
    sum += base[p];
  }
  const actualTotal = teamPoints(points, team, config).total;

  const options: CaptainOption[] = [];
  for (const c of team.xi) {
    for (const vc of team.xi) {
      if (c === vc) continue;
      const total = totalFor(base, sum, c, vc, config);
      options.push({ c, vc, total, delta: round1(total - actualTotal) });
    }
  }
  options.sort((a, b) => b.total - a.total || a.c.localeCompare(b.c) || a.vc.localeCompare(b.vc));

  const byCaptain: CaptainChoice[] = team.xi.map((player) => {
    const vc = player === team.vc ? team.c : team.vc;
    const total = totalFor(base, sum, player, vc, config);
    return {
      player,
      basePts: base[player],
      vc,
      total,
      delta: round1(total - actualTotal),
      isActual: player === team.c,
    };
  });
  byCaptain.sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));

  const bestPair = options[0];
  return {
    asOfFrame,
    actual: { c: team.c, vc: team.vc, total: actualTotal },
    options,
    byCaptain,
    bestPair,
    regret: Math.max(0, bestPair.delta),
  };
}

export function captainWhatIfAtFrame(frame: Frame, team: TeamSelection, config: ScoringConfig): CaptainWhatIf {
  return captainWhatIf(frame.points, team, config, frame.i);
}

// ---------------------------------------------------------------- live: "best captain from here on"

export interface LiveCaptainAdvice {
  ranked: Array<{ player: string; expectedRemaining: number }>;
  bestC: string;
  bestVC: string;
  /** expected extra fantasy points from now on vs your current C/VC (can be 0) */
  expectedGain: number;
  currentIsBest: boolean;
}

/**
 * Best C/VC for the *rest* of the match, given EXPECTED remaining base points per
 * player (from the Monte Carlo forecast — never from the real future).
 */
export function bestCaptainFromHere(
  expectedRemainingBase: Record<string, number>,
  team: TeamSelection,
  config: ScoringConfig
): LiveCaptainAdvice {
  const ranked = team.xi
    .map((player) => ({ player, expectedRemaining: round1(expectedRemainingBase[player] ?? 0) }))
    .sort((a, b) => b.expectedRemaining - a.expectedRemaining || a.player.localeCompare(b.player));
  const e = (p: string) => expectedRemainingBase[p] ?? 0;
  const extra = (c: string, vc: string) =>
    (config.multipliers.C - 1) * e(c) + (config.multipliers.VC - 1) * e(vc);
  const bestC = ranked[0].player;
  const bestVC = ranked[1]?.player ?? ranked[0].player;
  const gain = round1(Math.max(0, extra(bestC, bestVC) - extra(team.c, team.vc)));
  return {
    ranked,
    bestC,
    bestVC,
    expectedGain: gain,
    currentIsBest: gain < 0.5,
  };
}

// ---------------------------------------------------------------- deterministic what-if simulator

export type HypotheticalEventType =
  | 'add_runs'
  | 'add_wickets'
  | 'reach_milestone'
  | 'dismiss_player'
  | 'custom';

export interface HypotheticalRequest {
  player: string;
  type: HypotheticalEventType;
  runs?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  targetMilestone?: number;
  isDismissed?: boolean;
}

export interface HypotheticalSimulationResult {
  player: string;
  role: 'C' | 'VC' | '-';
  multiplier: number;
  inUserTeam: boolean;
  type: HypotheticalEventType;
  baseline: {
    playerStats: PlayerStats;
    playerBasePts: number;
    playerTotalPts: number;
    userTotalPts: number;
    userRank: number;
    gapToLeader: number;
  };
  hypothetical: {
    playerStats: PlayerStats;
    playerBasePts: number;
    playerTotalPts: number;
    userTotalPts: number;
    userRank: number;
    gapToLeader: number;
  };
  delta: {
    playerBasePts: number;
    playerTotalPts: number;
    userTotalPts: number;
    rankChange: number; // positive = gained ranks (e.g. was 3 now 1 => +2)
    gapChange: number; // positive = narrowed deficit or grew lead
  };
  explanation: string;
  assumptions: string[];
}

export function simulateHypotheticalEvent(
  frame: Frame,
  userTeam: TeamSelection,
  config: ScoringConfig,
  req: HypotheticalRequest
): HypotheticalSimulationResult {
  const role: 'C' | 'VC' | '-' =
    req.player === userTeam.c ? 'C' : req.player === userTeam.vc ? 'VC' : '-';
  const multiplier =
    role === 'C' ? config.multipliers.C : role === 'VC' ? config.multipliers.VC : 1;
  const inUserTeam = userTeam.xi.includes(req.player);

  const baselineStats = cloneStats(frame.stats);
  const pStats = baselineStats[req.player]
    ? { ...baselineStats[req.player] }
    : {
        inXI: inUserTeam,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        wickets: 0,
        lbwBowled: 0,
        legalBalls: 0,
        runsConceded: 0,
        maidens: 0,
        dots: 0,
        catches: 0,
        stumpings: 0,
        runOutDirect: 0,
        runOutIndirect: 0,
      };

  const origPlayerStats = { ...pStats };
  const origPoints = pointsFromStats(origPlayerStats, config);
  const origPlayerTotal = round1(origPoints.total * (inUserTeam ? multiplier : 1));

  const origLb = computeLeaderboard(frame, null, userTeam, config);
  const origUserEntry = origLb.find((e) => e.isUser)!;
  const origLeader = origLb[0];
  const origGap = origUserEntry.rank === 1 ? 0 : round1(origLeader.totalPts - origUserEntry.totalPts);

  // Apply hypothetical modifications
  const hypoStats = { ...origPlayerStats };
  let actionDesc = '';

  switch (req.type) {
    case 'add_runs': {
      const extraRuns = Math.max(0, req.runs ?? 20);
      hypoStats.runs += extraRuns;
      hypoStats.balls += Math.max(1, Math.round(extraRuns / 1.3));
      if (req.fours) hypoStats.fours += req.fours;
      if (req.sixes) hypoStats.sixes += req.sixes;
      actionDesc = `scored another ${extraRuns} runs`;
      break;
    }
    case 'add_wickets': {
      const extraWickets = Math.max(0, req.wickets ?? 1);
      hypoStats.wickets += extraWickets;
      actionDesc = `took ${extraWickets} more wicket${extraWickets > 1 ? 's' : ''}`;
      break;
    }
    case 'reach_milestone': {
      const target = req.targetMilestone ?? 50;
      const needed = Math.max(0, target - hypoStats.runs);
      hypoStats.runs += needed;
      hypoStats.balls += Math.max(1, needed);
      actionDesc = `reached ${target} runs (+${needed} runs)`;
      break;
    }
    case 'dismiss_player': {
      hypoStats.out = true;
      actionDesc = `was dismissed`;
      break;
    }
    case 'custom': {
      if (req.runs) hypoStats.runs += req.runs;
      if (req.wickets) hypoStats.wickets += req.wickets;
      if (req.isDismissed !== undefined) hypoStats.out = req.isDismissed;
      actionDesc = `recorded hypothetical stat changes`;
      break;
    }
  }

  const hypoPlayerPoints = pointsFromStats(hypoStats, config);
  const hypoPlayerTotal = round1(hypoPlayerPoints.total * (inUserTeam ? multiplier : 1));

  // Construct hypothetical frame points
  const hypoPointsMap: Record<string, PointsResult> = { ...frame.points };
  hypoPointsMap[req.player] = hypoPlayerPoints;

  const hypoFrame: Frame = { ...frame, points: hypoPointsMap };
  const hypoLb = computeLeaderboard(hypoFrame, null, userTeam, config);
  const hypoUserEntry = hypoLb.find((e) => e.isUser)!;
  const hypoLeader = hypoLb[0];
  const hypoGap = hypoUserEntry.rank === 1 ? 0 : round1(hypoLeader.totalPts - hypoUserEntry.totalPts);

  const playerBaseDelta = round1(hypoPlayerPoints.total - origPoints.total);
  const playerTotalDelta = round1(hypoPlayerTotal - origPlayerTotal);
  const userTotalDelta = round1(hypoUserEntry.totalPts - origUserEntry.totalPts);
  const rankChange = origUserEntry.rank - hypoUserEntry.rank;
  const gapChange = round1(origGap - hypoGap);

  // Formulate mathematical explanation
  const multText = multiplier > 1 ? ` (×${multiplier} ${role} multiplier)` : '';
  let explanation = '';
  if (inUserTeam) {
    explanation = `If ${req.player} ${actionDesc}, they would gain +${playerBaseDelta} base pts${multText}, adding +${userTotalDelta} pts to your total. `;
    if (rankChange > 0) {
      explanation += `Your rank would jump from #${origUserEntry.rank} to #${hypoUserEntry.rank} (climbing ${rankChange} spot${rankChange > 1 ? 's' : ''}).`;
    } else if (hypoUserEntry.rank === 1) {
      explanation += `You would maintain Rank #1, extending your lead to ${round1(hypoUserEntry.totalPts - (hypoLb[1]?.totalPts ?? hypoUserEntry.totalPts))} pts.`;
    } else {
      explanation += `Your rank remains #${hypoUserEntry.rank}, closing the deficit from ${origGap} pts to ${hypoGap} pts.`;
    }
  } else {
    explanation = `If ${req.player} ${actionDesc}, their base points would change by ${playerBaseDelta > 0 ? '+' : ''}${playerBaseDelta} pts. `;
    explanation += `Since they are not in your XI, your points remain ${origUserEntry.totalPts}. Rival standings shift accordingly.`;
  }

  const assumptions = [
    'Calculated using official T20 scoring rules from scoring configuration.',
    'Assumes no other player statistics or match events change simultaneously.',
    inUserTeam && multiplier > 1
      ? `Applies ${multiplier}x ${role === 'C' ? 'Captain' : 'Vice-Captain'} multiplier to player's delta.`
      : 'Standard 1x multiplier applies.',
  ];

  return {
    player: req.player,
    role,
    multiplier,
    inUserTeam,
    type: req.type,
    baseline: {
      playerStats: origPlayerStats,
      playerBasePts: origPoints.total,
      playerTotalPts: origPlayerTotal,
      userTotalPts: origUserEntry.totalPts,
      userRank: origUserEntry.rank,
      gapToLeader: origGap,
    },
    hypothetical: {
      playerStats: hypoStats,
      playerBasePts: hypoPlayerPoints.total,
      playerTotalPts: hypoPlayerTotal,
      userTotalPts: hypoUserEntry.totalPts,
      userRank: hypoUserEntry.rank,
      gapToLeader: hypoGap,
    },
    delta: {
      playerBasePts: playerBaseDelta,
      playerTotalPts: playerTotalDelta,
      userTotalPts: userTotalDelta,
      rankChange,
      gapChange,
    },
    explanation,
    assumptions,
  };
}
