/** Windowed rendering for long feeds (newest first). */
export const FEED_WINDOW = 24;
export const FEED_WINDOW_STEP = 24;

export function windowSlice<T>(items: readonly T[], visible: number): { shown: T[]; hidden: number } {
  const n = Math.max(0, Math.floor(visible));
  const shown = items.slice(0, n);
  return { shown, hidden: Math.max(0, items.length - shown.length) };
}
