/** "Add to Home Screen" capture (Chromium fires beforeinstallprompt once, early). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const subs = new Set<() => void>();
let started = false;

function emit() {
  subs.forEach((f) => f());
}

export function initInstallCapture() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    deferred = null;
    emit();
  });
  if (window.matchMedia?.('(display-mode: standalone)').matches) installed = true;
}

export function subscribeInstall(cb: () => void) {
  subs.add(cb);
  return () => {
    subs.delete(cb);
  };
}

export type InstallState = 'installed' | 'available' | 'unavailable';

export function getInstallState(): InstallState {
  return installed ? 'installed' : deferred ? 'available' : 'unavailable';
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null;
  emit();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return 'dismissed';
  }
}

export function isIos(): boolean {
  return typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
}
