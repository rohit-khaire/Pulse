export interface ScoringMilestone {
  runs: number;
  pts: number;
}

export interface ScoringHaul {
  wkts: number;
  pts: number;
}

export interface EconomyTier {
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
  pts: number;
}

export interface ScoringConfig {
  version: string;
  playingXI: number;
  batting: {
    run: number;
    four: number;
    six: number;
    duck: number;
    milestones: ScoringMilestone[];
    milestoneMode: 'highestOnly' | 'cumulative';
  };
  bowling: {
    dot: number;
    wicket: number;
    lbwBowled: number;
    maiden: number;
    hauls: ScoringHaul[];
    haulMode: 'highestOnly' | 'cumulative';
  };
  fielding: {
    catch: number;
    catchBonusAt: number;
    catchBonus: number;
    stumping: number;
    runOutDirect: number;
    runOutIndirect: number;
  };
  economy: {
    enabled: boolean;
    minOvers: number;
    tiers: EconomyTier[];
  };
  strikeRate: {
    enabled: boolean;
  };
  multipliers: {
    C: number;
    VC: number;
  };
}

export interface PlayerStats {
  inXI: boolean;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissalKind?: string;
  wickets: number;
  lbwBowled: number;
  legalBalls: number;
  runsConceded: number;
  maidens: number;
  dots: number;
  catches: number;
  stumpings: number;
  runOutDirect: number;
  runOutIndirect: number;
}

export interface PointsBreakdown {
  playingXI: number;
  runs: number;
  boundaries: number;
  sixes: number;
  milestones: number;
  duck: number;
  wickets: number;
  lbwBowled: number;
  hauls: number;
  maidens: number;
  dots: number;
  economy: number;
  catches: number;
  stumpings: number;
  runOuts: number;
}

export interface PointsResult {
  total: number;
  breakdown: PointsBreakdown;
}

export interface DeliveryDetail {
  inningsIndex: number;
  team: string;
  bowler: string;
  batter: string;
  nonStriker: string;
  runsBatter: number;
  runsExtras: number;
  runsTotal: number;
  isWide: boolean;
  isNoBall: boolean;
  isBye: boolean;
  isLegBye: boolean;
  isLegal: boolean;
  isDot: boolean;
  isFour: boolean;
  isSix: boolean;
  wickets: {
    playerOut: string;
    kind: string;
    fielders: { name: string; substitute?: boolean }[];
  }[];
}

export interface Frame {
  i: number;
  innings: number; // 1 or 2
  over: number;
  ball: number;
  ballInOver: number;
  bowler: string;
  batter: string;
  nonStriker: string;
  battingTeam: string;
  bowlingTeam: string;
  scoreLine: string; // e.g., "RR 45/1 (5.2 ov)"
  currentScore: {
    runs: number;
    wickets: number;
    oversStr: string;
  };
  target?: number;
  recentBalls: string[]; // last 6 balls display strings
  delivery: DeliveryDetail;
  stats: Record<string, PlayerStats>;
  points: Record<string, PointsResult>;
}

export type KeyEventType = 'WICKET' | 'SIX' | 'FOUR' | 'MILESTONE' | 'HAUL' | 'MAIDEN' | 'OVER_END';

export interface KeyEvent {
  frameIndex: number;
  type: KeyEventType;
  players: string[];
  description: string;
  priority: 1 | 2 | 3;
  details?: Record<string, any>;
}

export interface TeamSelection {
  xi: string[];
  c: string;
  vc: string;
}

export interface TeamPointsResult {
  total: number;
  byPlayer: Record<string, {
    basePts: number;
    multiplier: number;
    totalPts: number;
    role: 'C' | 'VC' | '-';
    breakdown: PointsBreakdown;
  }>;
}

export interface NudgeImpact {
  player: string;
  role: 'C' | 'VC' | '-';
  basePts: number;
  multiplier: number;
  delta: number;
  why: string[];
}

export interface NudgeFacts {
  lang: 'en' | 'hinglish' | 'hi';
  event: {
    type: string;
    over: string;
    scoreLine: string;
    summary: string;
  };
  impacts: NudgeImpact[];
  team: {
    before: number;
    after: number;
    rankBefore?: number;
    rankAfter?: number;
  };
  rootFor?: string[];
}

export interface Nudge {
  id: string;
  frameIndex: number;
  text: string;
  source: 'ai' | 'template';
  lang: 'en' | 'hinglish' | 'hi';
  createdAt: number;
  rating?: 'up' | 'down';
  event: KeyEvent;
}

