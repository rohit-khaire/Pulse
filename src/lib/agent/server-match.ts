/**
 * Server-side match loader. The match JSON is imported statically (not read with fs) so it is bundled with the
 * route and works on Vercel, where files under /public are not on the function's filesystem.
 */
import matchData from '../../../public/matches/1254111.json';
import scoring from '../engine/scoring.t20.json';
import { buildTimeline, CricsheetData } from '../engine/timeline';
import type { Frame, ScoringConfig } from '../engine/types';

let cached: { frames: Frame[]; config: ScoringConfig } | null = null;

export function getServerTimeline(): { frames: Frame[]; config: ScoringConfig } {
  if (!cached) {
    const config = scoring as ScoringConfig;
    cached = { frames: buildTimeline(matchData as unknown as CricsheetData, config).frames, config };
  }
  return cached;
}
