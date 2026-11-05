'use client';

import { useEffect } from 'react';
import { initInstallCapture } from './install';

/** Registers the hand-written service worker (production only) and captures the install prompt. */
export function PwaRegister() {
  useEffect(() => {
    initInstallCapture();
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return; // avoid stale caches while developing
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.warn('[pulse] service worker registration failed', err);
      });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
