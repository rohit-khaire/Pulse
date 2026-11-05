import { Frame, ScoringConfig, TeamSelection } from './types';
import { teamPoints } from './points';
import rivalsData from '@/data/rivals.json';

export interface LeaderboardEntry {
  id: string;
  name: string;
  owner: string;
  isUser: boolean;
  totalPts: number;
  prevPts?: number;
  rank: number;
  prevRank?: number;
  rankDelta: number; // positive = gained ranks (e.g. was 3 now 1 => +2)
}

export function computeLeaderboard(
  frame: Frame,
  prevFrame: Frame | null,
  userTeam: TeamSelection,
  config: ScoringConfig
): LeaderboardEntry[] {
  // Current frame scores
  const userScore = teamPoints(frame.points, userTeam, config).total;
  const entries: { id: string; name: string; owner: string; isUser: boolean; totalPts: number; prevPts?: number }[] = [
    {
      id: 'user-team',
      name: 'My Team',
      owner: 'You',
      isUser: true,
      totalPts: userScore,
    },
  ];

  for (const rival of rivalsData) {
    const rScore = teamPoints(frame.points, rival as TeamSelection, config).total;
    entries.push({
      id: rival.id,
      name: rival.name,
      owner: rival.owner,
      isUser: false,
      totalPts: rScore,
    });
  }

  // Sort descending by totalPts
  entries.sort((a, b) => b.totalPts - a.totalPts);

  // If prevFrame exists, compute previous ranks
  const prevRanksMap: Record<string, number> = {};
  if (prevFrame) {
    const prevEntries: { id: string; totalPts: number }[] = [
      {
        id: 'user-team',
        totalPts: teamPoints(prevFrame.points, userTeam, config).total,
      },
    ];
    for (const rival of rivalsData) {
      prevEntries.push({
        id: rival.id,
        totalPts: teamPoints(prevFrame.points, rival as TeamSelection, config).total,
      });
    }
    prevEntries.sort((a, b) => b.totalPts - a.totalPts);
    prevEntries.forEach((e, idx) => {
      prevRanksMap[e.id] = idx + 1;
    });
  }

  return entries.map((e, idx) => {
    const rank = idx + 1;
    const prevRank = prevRanksMap[e.id];
    const rankDelta = prevRank ? prevRank - rank : 0;
    return {
      ...e,
      rank,
      prevRank,
      rankDelta,
    };
  });
}

