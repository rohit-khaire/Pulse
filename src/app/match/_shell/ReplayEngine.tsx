'use client';

import { useReplay } from '@/lib/useReplay';
import { useAutoSpeak } from '@/lib/useVoice';

/**
 * Runs the replay clock and voice as a render-nothing component, so the page itself
 * does not re-render on every ball (the hooks subscribe to the whole store).
 */
export function ReplayEngine() {
  useReplay();
  useAutoSpeak();
  return null;
}
