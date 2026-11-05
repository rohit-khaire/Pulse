/**
 * Subtle haptics for moments that involve the fan's own players.
 * Pure pattern selection (testable) + a guarded navigator.vibrate wrapper.
 */
import type { KeyEvent, TeamSelection } from '@/lib/engine/types';

export type VibratePattern = number | number[];

export const PATTERNS = {
  /** my bowler/fielder took a wicket: two short taps */
  wicketFor: [40, 60, 40],
  /** my batter got out: one long, low buzz */
  wicketAgainst: [70],
  six: [25],
  bigMoment: [20, 40, 20, 40, 60], // haul / milestone
} as const;

export function hapticPatternFor(
  event: Pick<KeyEvent, 'type' | 'players' | 'details'>,
  team: Pick<TeamSelection, 'xi'>
): VibratePattern | null {
  const mine = new Set(team.xi);
  const involved = event.players.some((p) => mine.has(p));
  if (!involved) return null;

  switch (event.type) {
    case 'WICKET': {
      const out = event.details?.playerOut;
      return typeof out === 'string' && mine.has(out)
        ? [...PATTERNS.wicketAgainst]
        : [...PATTERNS.wicketFor];
    }
    case 'SIX':
      return [...PATTERNS.six];
    case 'HAUL':
    case 'MILESTONE':
      return [...PATTERNS.bigMoment];
    default:
      return null; // fours, maidens, over-ends: no buzz, keep it tasteful
  }
}

export function vibrateSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function vibrate(pattern: VibratePattern): boolean {
  try {
    return vibrateSupported() ? navigator.vibrate(pattern) : false;
  } catch {
    return false;
  }
}
