import type { BuilderPlayer, Mode } from './types';

/**
 * Per-player objective used by the optimizer, one per mode. Plain, documented formulas:
 *  - safe     : maximize the "bad day" floor (tiny expected-points tie-break)
 *  - balanced : maximize expected points
 *  - grand    : maximize upside AND differentiation. 0.8*ceiling + 0.2*expected, then
 *               multiplied by (1 + 1.2*(1 - ownership/100)^1.5) so low-owned players get up to ~+115%.
 * "Grand League" = the big-field mode where being different from the crowd matters.
 */
export function playerValue(mode: Mode, p: BuilderPlayer): number {
  const { expectedPoints: e, floor, ceiling, ownershipPct: o } = p.projection;
  switch (mode) {
    case 'safe':
      return floor + 0.01 * e;
    case 'balanced':
      return e;
    case 'grand':
      return (0.8 * ceiling + 0.2 * e) * (1 + 1.2 * Math.pow(1 - o / 100, 1.5));
  }
}

/** Captain / VC score: the multiplier makes the mode's own logic matter even more. */
export function captainScore(mode: Mode, p: BuilderPlayer): number {
  const { expectedPoints: e, floor, ceiling, ownershipPct: o } = p.projection;
  switch (mode) {
    case 'safe':
      return 0.5 * floor + 0.5 * e;
    case 'balanced':
      return 0.75 * e + 0.25 * ceiling;
    case 'grand':
      return ceiling * (1 + 1.2 * Math.pow(1 - o / 100, 1.5));
  }
}
