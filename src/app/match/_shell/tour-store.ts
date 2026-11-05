'use client';
import { create } from 'zustand';
import { TOUR_CLOSED, tourReducer, type TourEvent, type TourState } from './tour';

/** Ephemeral (not persisted) state for the judge-mode tour. */
interface TourStore extends TourState {
  dispatch: (ev: TourEvent) => void;
}

export const useTourStore = create<TourStore>()((set) => ({
  ...TOUR_CLOSED,
  dispatch: (ev) => set((s) => tourReducer({ step: s.step, paused: s.paused }, ev)),
}));
