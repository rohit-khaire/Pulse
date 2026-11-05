import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { BuilderError, BuiltTeam, Mode, Projection, Role } from './types';
import type { BacktestResult } from './backtest';
import { autoBuild } from './autobuild';
import { getPool, loadRules } from './pool';
import { err } from './errors';

/** Builder-only state. Persist key `pulse-builder`. The main Pulse store is never touched here. */
export interface BuilderState {
  mode: Mode;
  locks: string[];
  excludes: string[];
  overrides: Record<string, Projection>;
  importedAt: number | null;

  // not persisted
  teams: BuiltTeam[];
  activeIdx: number;
  errors: BuilderError[];
  fewerTeams: boolean;
  backtests: Record<string, BacktestResult>;
  roleFilter: Role | 'ALL';
  sheetPlayer: string | null;

  setMode: (m: Mode) => void;
  toggleLock: (name: string) => void;
  toggleExclude: (name: string) => void;
  clearSelections: () => void;
  build: () => void;
  setActive: (i: number) => void;
  setRoleFilter: (r: Role | 'ALL') => void;
  openSheet: (name: string | null) => void;
  setOverrides: (o: Record<string, Projection>) => void;
  clearOverrides: () => void;
  saveBacktest: (teamId: string, r: BacktestResult) => void;
}

export const useBuilderStore = create<BuilderState>()(
  persist(
    (set, get) => ({
      mode: 'balanced',
      locks: [],
      excludes: [],
      overrides: {},
      importedAt: null,

      teams: [],
      activeIdx: 0,
      errors: [],
      fewerTeams: false,
      backtests: {},
      roleFilter: 'ALL',
      sheetPlayer: null,

      setMode: (mode) => set({ mode }),

      toggleLock: (name) =>
        set((s) => ({
          locks: s.locks.includes(name) ? s.locks.filter((n) => n !== name) : [...s.locks, name],
          excludes: s.excludes.filter((n) => n !== name),
          errors: [],
        })),

      toggleExclude: (name) =>
        set((s) => ({
          excludes: s.excludes.includes(name) ? s.excludes.filter((n) => n !== name) : [...s.excludes, name],
          locks: s.locks.filter((n) => n !== name),
          errors: [],
        })),

      clearSelections: () => set({ locks: [], excludes: [], errors: [] }),

      build: () => {
        const { mode, locks, excludes, overrides } = get();
        try {
          const res = autoBuild({ pool: getPool(overrides), rules: loadRules(), mode, locks, excludes });
          set({
            teams: res.teams,
            errors: res.errors,
            fewerTeams: res.teams.length > 0 && res.fewerThanRequested,
            activeIdx: 0,
            backtests: {},
          });
        } catch {
          set({ teams: [], errors: [err('NO_FEASIBLE_TEAM')], backtests: {} });
        }
      },

      setActive: (activeIdx) => set({ activeIdx }),
      setRoleFilter: (roleFilter) => set({ roleFilter }),
      openSheet: (sheetPlayer) => set({ sheetPlayer }),

      setOverrides: (o) =>
        set((s) => ({
          overrides: { ...s.overrides, ...o },
          importedAt: Date.now(),
          teams: [],
          backtests: {},
          errors: [],
        })),

      clearOverrides: () => set({ overrides: {}, importedAt: null, teams: [], backtests: {}, errors: [] }),

      saveBacktest: (teamId, r) => set((s) => ({ backtests: { ...s.backtests, [teamId]: r } })),
    }),
    {
      name: 'pulse-builder',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        mode: s.mode,
        locks: s.locks,
        excludes: s.excludes,
        overrides: s.overrides,
        importedAt: s.importedAt,
      }),
    }
  )
);
