/**
 * "Pulse Ping": local-only notifications for key moments while the tab is
 * hidden. No push server, no tokens, nothing leaves the device.
 */
import type { Nudge, TeamSelection } from '@/lib/engine/types';
import { checkRelevance } from '@/lib/engine/triggers';

export const PING_MIN_GAP_MS = 8000;
export const PING_TAG = 'pulse-ping';

export type PingPermission = NotificationPermission | 'unsupported';

export interface PingContext {
  enabled: boolean;
  hidden: boolean;
  permission: PingPermission;
  lastPingAt: number;
  now: number;
}

export function pingSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function currentPermission(): PingPermission {
  return pingSupported() ? Notification.permission : 'unsupported';
}

/** Only genuinely key moments (priority 1 for this fan's XI), rate-limited. */
export function shouldPing(
  nudge: Pick<Nudge, 'event'>,
  team: TeamSelection | null,
  ctx: PingContext
): boolean {
  if (!ctx.enabled || !ctx.hidden || ctx.permission !== 'granted' || !team) return false;
  if (ctx.now - ctx.lastPingAt < PING_MIN_GAP_MS) return false;
  const rel = checkRelevance(nudge.event, team);
  return rel.relevant && rel.priority === 1;
}

export function buildPingContent(nudge: Pick<Nudge, 'text' | 'event'>): {
  title: string;
  body: string;
} {
  const title =
    nudge.event.type === 'WICKET'
      ? 'Pulse: Wicket!'
      : nudge.event.type === 'SIX'
      ? 'Pulse: Chhakka!'
      : nudge.event.type === 'HAUL'
      ? 'Pulse: Wicket haul!'
      : nudge.event.type === 'MILESTONE'
      ? 'Pulse: Milestone!'
      : 'Pulse update';
  // The nudge text is already number-validated narration; never add claims.
  return { title, body: nudge.text.slice(0, 180) };
}

export async function requestPingPermission(): Promise<PingPermission> {
  if (!pingSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return currentPermission();
  }
}

export async function sendPing(content: { title: string; body: string }): Promise<boolean> {
  if (!pingSupported() || Notification.permission !== 'granted') return false;
  const options: NotificationOptions = {
    body: content.body,
    tag: PING_TAG,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url: '/match' },
  };
  try {
    // Android Chrome only allows notifications through a service worker.
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(content.title, options);
        return true;
      }
    }
    new Notification(content.title, options);
    return true;
  } catch {
    return false;
  }
}
