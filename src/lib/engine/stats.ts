import { PlayerStats } from './types';

export function createInitialStats(allPlayers: string[]): Record<string, PlayerStats> {
  const stats: Record<string, PlayerStats> = {};
  for (const player of allPlayers) {
    stats[player] = {
      inXI: true,
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
  }
  return stats;
}

export function cloneStats(stats: Record<string, PlayerStats>): Record<string, PlayerStats> {
  const copy: Record<string, PlayerStats> = {};
  for (const [k, v] of Object.entries(stats)) {
    copy[k] = { ...v };
  }
  return copy;
}

export interface RawDelivery {
  batter: string;
  bowler: string;
  non_striker: string;
  runs: {
    batter: number;
    extras: number;
    total: number;
    non_boundary?: boolean;
  };
  extras?: {
    wides?: number;
    noballs?: number;
    byes?: number;
    legbyes?: number;
    penalty?: number;
  };
  wickets?: {
    player_out: string;
    kind: string;
    fielders?: { name: string; substitute?: boolean }[];
  }[];
}

const BOWLER_WICKET_KINDS = new Set([
  'bowled',
  'caught',
  'caught and bowled',
  'lbw',
  'stumped',
  'hit wicket',
]);

export function processDelivery(
  currentStats: Record<string, PlayerStats>,
  delivery: RawDelivery,
  isOverEnd: boolean,
  overConcededRuns: number,
  overLegalBalls: number
): {
  newStats: Record<string, PlayerStats>;
  isMaiden: boolean;
  isLegal: boolean;
  concededRunsThisBall: number;
} {
  const stats = cloneStats(currentStats);
  const { batter, bowler } = delivery;

  // Ensure players exist in stats
  if (!stats[batter]) {
    stats[batter] = {
      inXI: true,
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
  }
  if (!stats[bowler]) {
    stats[bowler] = {
      inXI: true,
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
  }

  const isWide = !!(delivery.extras && delivery.extras.wides);
  const isNoBall = !!(delivery.extras && delivery.extras.noballs);
  const isLegal = !isWide && !isNoBall;

  // Batter stats
  if (!isWide) {
    stats[batter].balls += 1;
  }
  stats[batter].runs += delivery.runs.batter;

  const isNonBoundary = !!delivery.runs.non_boundary;
  if (!isNonBoundary) {
    if (delivery.runs.batter === 4) {
      stats[batter].fours += 1;
    } else if (delivery.runs.batter === 6) {
      stats[batter].sixes += 1;
    }
  }

  // Bowler stats
  // Conceded: batter runs + wides + noballs; EXCLUDE byes and legbyes
  const widesRuns = (delivery.extras && delivery.extras.wides) || 0;
  const noBallRuns = (delivery.extras && delivery.extras.noballs) || 0;
  const concededRunsThisBall = delivery.runs.batter + widesRuns + noBallRuns;

  stats[bowler].runsConceded += concededRunsThisBall;

  if (isLegal) {
    stats[bowler].legalBalls += 1;
    if (delivery.runs.total === 0) {
      stats[bowler].dots += 1;
    }
  }

  // Check maiden at over end: exactly 6 legal balls in over with 0 conceded runs
  let isMaiden = false;
  if (isOverEnd && overLegalBalls === 6 && overConcededRuns + concededRunsThisBall === 0) {
    stats[bowler].maidens += 1;
    isMaiden = true;
  }

  // Wickets
  if (delivery.wickets && delivery.wickets.length > 0) {
    for (const w of delivery.wickets) {
      const outPlayer = w.player_out;
      if (stats[outPlayer]) {
        stats[outPlayer].out = true;
        stats[outPlayer].dismissalKind = w.kind;
      }

      const kindLower = w.kind.toLowerCase();

      // Credited to bowler
      if (BOWLER_WICKET_KINDS.has(kindLower)) {
        stats[bowler].wickets += 1;
        if (kindLower === 'lbw' || kindLower === 'bowled') {
          stats[bowler].lbwBowled += 1;
        }
      }

      // Catches & Stumpings & Run Outs
      if (kindLower === 'caught' || kindLower === 'caught and bowled') {
        if (kindLower === 'caught and bowled') {
          stats[bowler].catches += 1;
        } else if (w.fielders && w.fielders.length > 0) {
          for (const f of w.fielders) {
            if (!f.substitute && f.name) {
              if (!stats[f.name]) {
                stats[f.name] = createInitialStats([f.name])[f.name];
              }
              stats[f.name].catches += 1;
            }
          }
        }
      } else if (kindLower === 'stumped') {
        if (w.fielders && w.fielders.length > 0) {
          for (const f of w.fielders) {
            if (!f.substitute && f.name) {
              if (!stats[f.name]) {
                stats[f.name] = createInitialStats([f.name])[f.name];
              }
              stats[f.name].stumpings += 1;
            }
          }
        }
      } else if (kindLower === 'run out') {
        if (w.fielders && w.fielders.length > 0) {
          const validFielders = w.fielders.filter(f => !f.substitute && f.name);
          if (validFielders.length === 1) {
            const fName = validFielders[0].name;
            if (!stats[fName]) stats[fName] = createInitialStats([fName])[fName];
            stats[fName].runOutDirect += 1;
          } else if (validFielders.length >= 2) {
            for (const f of validFielders) {
              if (!stats[f.name]) stats[f.name] = createInitialStats([f.name])[f.name];
              stats[f.name].runOutIndirect += 1;
            }
          }
        }
      }
    }
  }

  return { newStats: stats, isMaiden, isLegal, concededRunsThisBall };
}

