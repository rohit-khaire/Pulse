import {
  PlayerStats,
  PointsBreakdown,
  PointsResult,
  ScoringConfig,
  Frame,
  TeamSelection,
  TeamPointsResult
} from './types';

export function pointsFromStats(stats: PlayerStats, config: ScoringConfig): PointsResult {
  const breakdown: PointsBreakdown = {
    playingXI: stats.inXI ? config.playingXI : 0,
    runs: stats.runs * config.batting.run,
    boundaries: stats.fours * config.batting.four,
    sixes: stats.sixes * config.batting.six,
    milestones: 0,
    duck: 0,
    wickets: stats.wickets * config.bowling.wicket,
    lbwBowled: stats.lbwBowled * config.bowling.lbwBowled,
    hauls: 0,
    maidens: stats.maidens * config.bowling.maiden,
    dots: stats.dots * config.bowling.dot,
    economy: 0,
    catches: 0,
    stumpings: stats.stumpings * config.fielding.stumping,
    runOuts: stats.runOutDirect * config.fielding.runOutDirect + stats.runOutIndirect * config.fielding.runOutIndirect,
  };

  // Batting Milestones
  if (config.batting.milestoneMode === 'highestOnly') {
    let highestPts = 0;
    for (const m of config.batting.milestones) {
      if (stats.runs >= m.runs && m.pts > highestPts) {
        highestPts = m.pts;
      }
    }
    breakdown.milestones = highestPts;
  } else {
    for (const m of config.batting.milestones) {
      if (stats.runs >= m.runs) {
        breakdown.milestones += m.pts;
      }
    }
  }

  // Duck bonus
  if (stats.out && stats.runs === 0 && stats.dismissalKind !== 'retired hurt') {
    breakdown.duck = config.batting.duck;
  }

  // Hauls
  if (config.bowling.haulMode === 'highestOnly') {
    let highestHaul = 0;
    for (const h of config.bowling.hauls) {
      if (stats.wickets >= h.wkts && h.pts > highestHaul) {
        highestHaul = h.pts;
      }
    }
    breakdown.hauls = highestHaul;
  } else {
    for (const h of config.bowling.hauls) {
      if (stats.wickets >= h.wkts) {
        breakdown.hauls += h.pts;
      }
    }
  }

  // Economy rate
  const minLegalBalls = config.economy.minOvers * 6;
  if (config.economy.enabled && stats.legalBalls >= minLegalBalls) {
    const overs = stats.legalBalls / 6;
    const econ = stats.runsConceded / overs;

    for (const tier of config.economy.tiers) {
      const matchLt = tier.lt === undefined || econ < tier.lt;
      const matchLte = tier.lte === undefined || econ <= tier.lte;
      const matchGt = tier.gt === undefined || econ > tier.gt;
      const matchGte = tier.gte === undefined || econ >= tier.gte;

      if (matchLt && matchLte && matchGt && matchGte) {
        breakdown.economy = tier.pts;
        break;
      }
    }
  }

  // Catches + 3-catch bonus
  breakdown.catches = stats.catches * config.fielding.catch;
  if (stats.catches >= config.fielding.catchBonusAt) {
    breakdown.catches += config.fielding.catchBonus;
  }

  const total =
    breakdown.playingXI +
    breakdown.runs +
    breakdown.boundaries +
    breakdown.sixes +
    breakdown.milestones +
    breakdown.duck +
    breakdown.wickets +
    breakdown.lbwBowled +
    breakdown.hauls +
    breakdown.maidens +
    breakdown.dots +
    breakdown.economy +
    breakdown.catches +
    breakdown.stumpings +
    breakdown.runOuts;

  return { total, breakdown };
}

export function teamPoints(
  framePoints: Record<string, PointsResult>,
  team: TeamSelection,
  config: ScoringConfig
): TeamPointsResult {
  let total = 0;
  const byPlayer: TeamPointsResult['byPlayer'] = {};

  for (const player of team.xi) {
    const pResult = framePoints[player] || {
      total: 0,
      breakdown: {
        playingXI: 0,
        runs: 0,
        boundaries: 0,
        sixes: 0,
        milestones: 0,
        duck: 0,
        wickets: 0,
        lbwBowled: 0,
        hauls: 0,
        maidens: 0,
        dots: 0,
        economy: 0,
        catches: 0,
        stumpings: 0,
        runOuts: 0,
      },
    };

    let multiplier = 1;
    let role: 'C' | 'VC' | '-' = '-';
    if (player === team.c) {
      multiplier = config.multipliers.C;
      role = 'C';
    } else if (player === team.vc) {
      multiplier = config.multipliers.VC;
      role = 'VC';
    }

    const totalPts = Math.round(pResult.total * multiplier * 10) / 10;
    total += totalPts;

    byPlayer[player] = {
      basePts: pResult.total,
      multiplier,
      totalPts,
      role,
      breakdown: pResult.breakdown,
    };
  }

  return {
    total: Math.round(total * 10) / 10,
    byPlayer,
  };
}

