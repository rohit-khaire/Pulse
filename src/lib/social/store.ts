'use client';

/**
 * `pulse-social` store (own persist key). Holds ONLY the fan's inputs (predictions, name,
 * stickers). Scores/streaks/badges are never stored: they are derived by predictor.ts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useState } from 'react';
import { makePrediction, type OverInfo, type Prediction, type RunsBand } from './predictor';

export interface SocialState {
  predictions: Record<string, Prediction>;
  /** Furthest frame the fan has watched. Anything at/before it is "seen" (practice only). */
  maxSeen: number;
  /** Celebration keys already shown, so scrubbing never re-fires confetti. */
  celebrated: Record<string, true>;
  fingerprint: string;
  displayName: string;
  /** rivalId -> last sticker id sent (simulated) */
  stickers: Record<string, string>;
  aiBanter: boolean;

  observe: (cursor: number, fingerprint: string) => void;
  predict: (over: OverInfo, band: RunsBand, wicket: boolean, cursor: number) => boolean;
  markCelebrated: (keys: string[]) => void;
  newRound: (cursor: number) => void;
  setDisplayName: (name: string) => void;
  sendSticker: (rivalId: string, stickerId: string) => void;
  setAiBanter: (on: boolean) => void;
}

const safeStorage = () => {
  try {
    if (typeof window === 'undefined') return undefined as unknown as Storage;
    return window.localStorage;
  } catch {
    return undefined as unknown as Storage;
  }
};

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      predictions: {},
      maxSeen: 0,
      celebrated: {},
      fingerprint: '',
      displayName: '',
      stickers: {},
      aiBanter: false,

      observe: (cursor, fingerprint) => {
        const s = get();
        if (fingerprint && s.fingerprint && fingerprint !== s.fingerprint) {
          // Different match loaded: the old round no longer applies.
          set({ predictions: {}, celebrated: {}, maxSeen: cursor, fingerprint });
          return;
        }
        const patch: Partial<SocialState> = {};
        if (fingerprint && !s.fingerprint) patch.fingerprint = fingerprint;
        if (cursor > s.maxSeen) patch.maxSeen = cursor;
        if (Object.keys(patch).length) set(patch);
      },

      predict: (over, band, wicket, cursor) => {
        const s = get();
        if (s.predictions[over.key]) return false;
        const p = makePrediction(over, band, wicket, cursor, s.maxSeen);
        if (!p) return false;
        set({ predictions: { ...s.predictions, [over.key]: p } });
        return true;
      },

      markCelebrated: (keys) => {
        if (keys.length === 0) return;
        const next = { ...get().celebrated };
        for (const k of keys) next[k] = true;
        set({ celebrated: next });
      },

      newRound: (cursor) => set({ predictions: {}, celebrated: {}, maxSeen: cursor }),

      setDisplayName: (name) => set({ displayName: name.replace(/[<>]/g, '').slice(0, 24) }),

      sendSticker: (rivalId, stickerId) => set({ stickers: { ...get().stickers, [rivalId]: stickerId } }),

      setAiBanter: (aiBanter) => set({ aiBanter }),
    }),
    {
      name: 'pulse-social',
      version: 1,
      storage: createJSONStorage(safeStorage),
      partialize: (s) => ({
        predictions: s.predictions,
        maxSeen: s.maxSeen,
        celebrated: s.celebrated,
        fingerprint: s.fingerprint,
        displayName: s.displayName,
        stickers: s.stickers,
        aiBanter: s.aiBanter,
      }),
    }
  )
);

/** False on the server and during the first client render, true once localStorage has been read. */
export function useSocialHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const persistApi = useSocialStore.persist;
    if (!persistApi) {
      setHydrated(true);
      return;
    }
    if (persistApi.hasHydrated()) setHydrated(true);
    return persistApi.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
