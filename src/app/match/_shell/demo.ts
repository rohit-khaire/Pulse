/** Judge mode (?demo=1) helpers. Pure, so they are unit-tested. */
import type { Frame } from '@/lib/engine/types';

export function isDemoSearch(search: string): boolean {
  try {
    const v = new URLSearchParams(search).get('demo');
    return v === '1' || v === 'true';
  } catch {
    return false;
  }
}

/**
 * The frame where the demo starts: the first ball of the 2nd innings' final
 * over (index 19 = the 20th over). In match 1254111 this is Tyagi defending
 * 4 runs. Falls back to ~92% through the match for any other data.
 */
export function findDramaFrame(frames: Pick<Frame, 'innings' | 'over'>[]): number {
  if (frames.length === 0) return 0;
  const idx = frames.findIndex((f) => f.innings === 2 && f.over === 19);
  if (idx > 0) return idx;
  return Math.max(0, Math.floor((frames.length - 1) * 0.92));
}

export const TOUR_DISMISSED_KEY = 'pulse-tour-dismissed';
