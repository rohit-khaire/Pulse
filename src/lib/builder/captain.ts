import type { BuilderPlayer, Mode } from './types';
import { captainScore } from './modes';

export interface CaptainPicks {
  c: string;
  vc: string;
}

/**
 * Captain (2x) and Vice-Captain (1.5x) from the XI, by the mode's captainScore.
 * `avoidCaptains`: captains already used by earlier generated teams. A different captain is
 * preferred ONLY if its score is within 85% of the best, so variety never costs much.
 * Deterministic: ties break on higher expected points, then name.
 */
export function pickCaptains(
  xi: BuilderPlayer[],
  mode: Mode,
  avoidCaptains: string[] = []
): CaptainPicks {
  const ranked = xi
    .map((p) => ({ p, s: captainScore(mode, p) }))
    .sort((a, b) => b.s - a.s || b.p.projection.expectedPoints - a.p.projection.expectedPoints || (a.p.name < b.p.name ? -1 : 1));

  let cIdx = 0;
  if (avoidCaptains.length && ranked.length > 1) {
    const top = ranked[0].s;
    const alt = ranked.findIndex((r) => !avoidCaptains.includes(r.p.name) && r.s >= 0.85 * top);
    if (alt >= 0) cIdx = alt;
  }
  const c = ranked[cIdx].p.name;
  const vc = ranked.find((r, i) => i !== cIdx)!.p.name;
  return { c, vc };
}
