/**
 * Friend contest (SIMULATED "Demo friends") — standings + overtaking detection.
 * Built on the existing engine leaderboard and src/data/rivals.json (both read-only).
 */

import type { Frame, ScoringConfig, TeamSelection } from '../engine/types';
import { computeLeaderboard, type LeaderboardEntry } from '../engine/league';
import { firstName } from './text';
import type { BanterFacts, BanterKind } from './banter';

export const DEMO_FRIENDS_LABEL = 'Demo friends';

/** Leaderboard at a frame index (previous frame only feeds the rank-delta arrows). */
export function standingsAt(
  frames: readonly Frame[],
  index: number,
  team: TeamSelection,
  config: ScoringConfig
): LeaderboardEntry[] {
  const i = Math.max(0, Math.min(index, frames.length - 1));
  const frame = frames[i];
  if (!frame) return [];
  const prev = i > 0 ? frames[i - 1] : null;
  return computeLeaderboard(frame, prev, team, config);
}

export interface Overtake {
  type: 'overtaken' | 'overtook';
  rival: LeaderboardEntry; // standing AFTER the change
  you: LeaderboardEntry; // standing AFTER the change
  youRankBefore: number;
}

/** Which friends changed side relative to you between two standings snapshots? */
export function diffStandings(before: readonly LeaderboardEntry[], after: readonly LeaderboardEntry[]): Overtake[] {
  const youB = before.find((e) => e.isUser);
  const youA = after.find((e) => e.isUser);
  if (!youB || !youA) return [];
  const out: Overtake[] = [];
  for (const rivalA of after) {
    if (rivalA.isUser) continue;
    const rivalB = before.find((e) => e.id === rivalA.id);
    if (!rivalB) continue;
    const aboveBefore = rivalB.rank < youB.rank;
    const aboveAfter = rivalA.rank < youA.rank;
    if (!aboveBefore && aboveAfter) out.push({ type: 'overtaken', rival: rivalA, you: youA, youRankBefore: youB.rank });
    else if (aboveBefore && !aboveAfter) out.push({ type: 'overtook', rival: rivalA, you: youA, youRankBefore: youB.rank });
  }
  // Most dramatic first: being overtaken beats overtaking; then the better-ranked rival.
  out.sort((a, b) => (a.type === b.type ? a.rival.rank - b.rival.rank : a.type === 'overtaken' ? -1 : 1));
  return out;
}

/** Ignore early-match noise and 1-point flicker: only overtakes with a real gap deserve a line. */
export function isBanterWorthy(o: Overtake, minGap = 2): boolean {
  return Math.abs(o.you.totalPts - o.rival.totalPts) >= minGap;
}

export function toBanterFacts(o: Overtake, over: string, teams: number): BanterFacts {
  let kind: BanterKind = o.type;
  if (o.type === 'overtook' && o.you.rank === 1) kind = 'took_lead';
  if (o.type === 'overtaken' && o.youRankBefore === 1) kind = 'lost_lead';
  return {
    kind,
    rival: firstName(o.rival.owner),
    gap: Math.abs(o.you.totalPts - o.rival.totalPts),
    youRank: o.you.rank,
    rivalRank: o.rival.rank,
    teams,
    over,
  };
}

/** Normal playback = small forward step. Bigger jumps / going back are silent (no banter spam). */
export function isNaturalStep(prevCursor: number, cursor: number, maxStep = 12): boolean {
  const d = cursor - prevCursor;
  return d > 0 && d <= maxStep;
}

/** One-line gap summary for the leaderboard, computed not generated. */
export function gapToNextAbove(board: readonly LeaderboardEntry[]): { rival: LeaderboardEntry; gap: number } | null {
  const you = board.find((e) => e.isUser);
  if (!you || you.rank === 1) return null;
  const above = board.find((e) => e.rank === you.rank - 1);
  if (!above) return null;
  return { rival: above, gap: above.totalPts - you.totalPts };
}
