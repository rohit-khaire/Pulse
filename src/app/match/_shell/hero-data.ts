/**
 * Data for the landing "see it work" demo. Everything here is produced by the
 * same deterministic engine and templates the live app uses, on the real
 * replayed match: nothing is hand-typed or invented.
 */
import type { Frame, KeyEvent, ScoringConfig, TeamSelection, NudgeFacts } from '@/lib/engine/types';
import { buildTimeline, type CricsheetData } from '@/lib/engine/timeline';
import { checkRelevance } from '@/lib/engine/triggers';
import { teamPoints } from '@/lib/engine/points';
import { computeLeaderboard } from '@/lib/engine/league';
import { buildNudgeFacts } from '@/lib/ai/facts';
import { getTemplateNudge } from '@/lib/ai/templates';

export type HeroLang = 'en' | 'hinglish' | 'hi';

export interface HeroScene {
  over: string;
  scoreLine: string;
  bowler: string;
  batter: string;
  eventType: string;
  summary: string;
  teamBefore: number;
  teamAfter: number;
  delta: number;
  rankBefore?: number;
  rankAfter?: number;
  texts: Record<HeroLang, string>;
}

/** The relevant priority-1 event that moved the team's points the most. */
export function pickHeroMoment(
  frames: Frame[],
  events: KeyEvent[],
  team: TeamSelection,
  config: ScoringConfig
): KeyEvent | null {
  let best: KeyEvent | null = null;
  let bestDelta = -Infinity;
  for (const e of events) {
    if (e.frameIndex <= 0 || e.frameIndex >= frames.length) continue;
    const rel = checkRelevance(e, team);
    if (!rel.relevant || rel.priority !== 1) continue;
    const after = teamPoints(frames[e.frameIndex].points, team, config).total;
    const before = teamPoints(frames[e.frameIndex - 1].points, team, config).total;
    const d = after - before;
    if (d > bestDelta) {
      bestDelta = d;
      best = e;
    }
  }
  return best;
}

export function buildHeroParts(
  match: CricsheetData,
  team: TeamSelection,
  config: ScoringConfig
): { scene: HeroScene; facts: Record<HeroLang, NudgeFacts> } | null {
  const { frames, events } = buildTimeline(match, config);
  const ev = pickHeroMoment(frames, events, team, config);
  if (!ev) return null;

  const frame = frames[ev.frameIndex];
  const prev = frames[ev.frameIndex - 1] ?? null;
  const board = computeLeaderboard(frame, prev, team, config);
  const me = board.find((e) => e.isUser);

  const make = (lang: HeroLang): NudgeFacts =>
    buildNudgeFacts(frame, prev, ev, team, config, lang, me?.prevRank ?? me?.rank, me?.rank);

  const facts: Record<HeroLang, NudgeFacts> = {
    hinglish: make('hinglish'),
    en: make('en'),
    hi: make('hi'),
  };
  const f = facts.hinglish;
  const scene: HeroScene = {
    over: frame.currentScore.oversStr,
    scoreLine: frame.scoreLine,
    bowler: frame.delivery.bowler,
    batter: frame.delivery.batter,
    eventType: ev.type,
    summary: ev.description,
    teamBefore: f.team.before,
    teamAfter: f.team.after,
    delta: Math.round((f.team.after - f.team.before) * 10) / 10,
    rankBefore: f.team.rankBefore,
    rankAfter: f.team.rankAfter,
    texts: {
      hinglish: getTemplateNudge(facts.hinglish),
      en: getTemplateNudge(facts.en),
      hi: getTemplateNudge(facts.hi),
    },
  };
  return { scene, facts };
}

export function buildHeroScene(
  match: CricsheetData,
  team: TeamSelection,
  config: ScoringConfig
): HeroScene | null {
  return buildHeroParts(match, team, config)?.scene ?? null;
}
