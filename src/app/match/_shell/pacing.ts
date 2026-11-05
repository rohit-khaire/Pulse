/**
 * Replay pacing: how long the replay lingers on a ball before moving on.
 * Pure + deterministic (no randomness) so it can be unit-tested and so a
 * replay always "feels" the same for a given match.
 */
import type { Frame } from '@/lib/engine/types';

export type ReplaySpeed = 1 | 5 | 10;

/** Base ms per ball, unchanged from the original fixed-interval replay. */
export const BASE_MS: Record<ReplaySpeed, number> = { 1: 1800, 5: 400, 10: 180 };

/** Never go below this, or React cannot paint between balls on slow phones. */
export const MIN_BALL_MS = 120;

type DeliveryLike = Pick<
  Frame['delivery'],
  'isWide' | 'isNoBall' | 'isDot' | 'isFour' | 'isSix' | 'wickets'
>;

/** Multiplier on the base delay: big moments linger, dots and wides move along. */
export function ballWeight(
  delivery: DeliveryLike | undefined,
  ballInOver?: number
): number {
  if (!delivery) return 1;
  let w = 1;
  if (delivery.wickets && delivery.wickets.length > 0) w = 1.7;
  else if (delivery.isSix) w = 1.45;
  else if (delivery.isFour) w = 1.2;
  else if (delivery.isWide || delivery.isNoBall) w = 0.7;
  else if (delivery.isDot) w = 0.85;
  // Over change: a small breather (6th legal ball of the over)
  if (ballInOver === 6) w *= 1.2;
  return w;
}

export function ballDelayMs(
  frame: { delivery?: DeliveryLike; ballInOver?: number } | undefined,
  speed: ReplaySpeed
): number {
  const base = BASE_MS[speed] ?? BASE_MS[1];
  const w = ballWeight(frame?.delivery, frame?.ballInOver);
  return Math.max(MIN_BALL_MS, Math.round(base * w));
}

/** How long Smart Replay holds on a big moment before auto-resuming. */
export function smartPauseMs(speed: ReplaySpeed): number {
  return speed === 10 ? 1400 : speed === 5 ? 1900 : 2600;
}
