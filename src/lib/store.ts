import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Frame,
  KeyEvent,
  Nudge,
  ScoringConfig,
  TeamSelection,
} from './engine/types';
import scoringConfigData from './engine/scoring.t20.json';
import { CricsheetData, buildTimeline } from './engine/timeline';
import sampleTeamData from '@/data/sample-team.json';

export interface PulseState {
  // Persisted state
  myTeam: TeamSelection | null;
  lang: 'en' | 'hinglish' | 'hi';
  voice: boolean;

  // Match & Replay state
  match: CricsheetData | null;
  config: ScoringConfig;
  frames: Frame[];
  events: KeyEvent[];
  cursor: number;
  isPlaying: boolean;
  speed: 1 | 5 | 10;
  smartReplay: boolean;

  // AI & Nudges state
  nudges: Nudge[];
  nudgeCache: Record<string, Nudge>;
  inFlightNudge: boolean;
  lastNudgeTime: number;

  // UI state
  samjhaoOpen: boolean;
  selectedPlayerForSheet: string | null;
  showRecap: boolean;

  // --- Shell additions (Stream 5). Strictly additive: nothing above was renamed or removed. ---
  /** persisted: subtle vibration on wickets/sixes involving my players */
  hapticsEnabled: boolean;
  /** persisted: "Pulse Ping" local notifications while the tab is hidden */
  pingEnabled: boolean;
  /** judge mode (?demo=1); never persisted */
  demoMode: boolean;
  /** navigator.onLine mirror, set by the shell */
  online: boolean;
  matchStatus: 'idle' | 'loading' | 'ready' | 'error';
  matchError: string | null;
  /** id of the active tab in the registry TABS (plug-ins may call setActiveTab) */
  activeTab: string;
  /** id of the open modal in the registry MODALS (null = none) */
  openModal: string | null;

  // Actions
  setTeam: (team: TeamSelection) => void;
  useSampleTeam: () => void;
  setLang: (lang: 'en' | 'hinglish' | 'hi') => void;
  setVoice: (voice: boolean) => void;
  initMatch: (match: CricsheetData) => void;
  setCursor: (cursor: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  setSpeed: (speed: 1 | 5 | 10) => void;
  setSmartReplay: (enabled: boolean) => void;
  nextKeyEvent: () => void;
  addNudge: (nudge: Nudge) => void;
  rateNudge: (id: string, rating: 'up' | 'down') => void;
  setInFlightNudge: (inFlight: boolean) => void;
  setSamjhaoOpen: (open: boolean) => void;
  setSelectedPlayerForSheet: (player: string | null) => void;
  setShowRecap: (show: boolean) => void;
  resetReplay: () => void;

  // Shell actions (additive)
  /** Same as useSampleTeam, minus the `use` prefix (which trips rules-of-hooks when called in handlers). */
  loadSampleTeam: () => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setPingEnabled: (enabled: boolean) => void;
  setDemoMode: (demo: boolean) => void;
  setOnline: (online: boolean) => void;
  setMatchStatus: (status: PulseState['matchStatus'], error?: string | null) => void;
  setActiveTab: (id: string) => void;
  /** open a registry modal by id; pass null to close */
  setOpenModal: (id: string | null) => void;
  closeModal: () => void;
}

export const usePulseStore = create<PulseState>()(
  persist(
    (set, get) => ({
      myTeam: sampleTeamData as TeamSelection,
      lang: 'hinglish',
      voice: false,

      match: null,
      config: scoringConfigData as ScoringConfig,
      frames: [],
      events: [],
      cursor: 0,
      isPlaying: false,
      speed: 1,
      smartReplay: true,

      nudges: [],
      nudgeCache: {},
      inFlightNudge: false,
      lastNudgeTime: 0,

      samjhaoOpen: false,
      selectedPlayerForSheet: null,
      showRecap: false,

      hapticsEnabled: true,
      pingEnabled: false,
      demoMode: false,
      online: true,
      matchStatus: 'idle',
      matchError: null,
      activeTab: 'feed',
      openModal: null,

      setTeam: (team) => set({ myTeam: team }),

      useSampleTeam: () => set({ myTeam: sampleTeamData as TeamSelection }),

      setLang: (lang) => set({ lang }),

      setVoice: (voice) => set({ voice }),

      initMatch: (match) => {
        const config = get().config;
        const { frames, events } = buildTimeline(match, config);
        set({
          match,
          frames,
          events,
          cursor: 0,
          nudges: [],
          nudgeCache: {},
        });
      },

      setCursor: (cursor) => {
        const totalFrames = get().frames.length;
        const validCursor = Math.max(0, Math.min(cursor, totalFrames - 1));
        const isEnd = totalFrames > 0 && validCursor === totalFrames - 1;
        set({
          cursor: validCursor,
          isPlaying: isEnd ? false : get().isPlaying,
          showRecap: isEnd,
        });
      },

      setIsPlaying: (isPlaying) => set({ isPlaying }),

      togglePlay: () => {
        const { isPlaying, cursor, frames } = get();
        if (!isPlaying && frames.length > 0 && cursor >= frames.length - 1) {
          // Restart if at end
          set({ cursor: 0, isPlaying: true, showRecap: false });
        } else {
          set({ isPlaying: !isPlaying });
        }
      },

      setSpeed: (speed) => set({ speed }),

      setSmartReplay: (smartReplay) => set({ smartReplay }),

      nextKeyEvent: () => {
        const { cursor, events } = get();
        const next = events.find((e) => e.frameIndex > cursor);
        if (next) {
          get().setCursor(next.frameIndex);
        } else {
          const totalFrames = get().frames.length;
          if (totalFrames > 0) get().setCursor(totalFrames - 1);
        }
      },

      addNudge: (nudge) => {
        const cacheKey = `${nudge.frameIndex}-${nudge.lang}`;
        set((state) => ({
          nudges: [nudge, ...state.nudges],
          nudgeCache: { ...state.nudgeCache, [cacheKey]: nudge },
          lastNudgeTime: Date.now(),
        }));
      },

      rateNudge: (id, rating) => {
        set((state) => ({
          nudges: state.nudges.map((n) =>
            n.id === id ? { ...n, rating } : n
          ),
        }));
      },

      setInFlightNudge: (inFlightNudge) => set({ inFlightNudge }),

      setSamjhaoOpen: (samjhaoOpen) => set({ samjhaoOpen }),

      setSelectedPlayerForSheet: (selectedPlayerForSheet) =>
        set({ selectedPlayerForSheet }),

      setShowRecap: (showRecap) => set({ showRecap }),

      resetReplay: () => set({ cursor: 0, isPlaying: false, showRecap: false, nudges: [], nudgeCache: {} }),

      loadSampleTeam: () => set({ myTeam: sampleTeamData as TeamSelection }),
      setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),
      setPingEnabled: (pingEnabled) => set({ pingEnabled }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setOnline: (online) => set({ online }),
      setMatchStatus: (matchStatus, matchError = null) => set({ matchStatus, matchError }),
      setActiveTab: (activeTab) => set({ activeTab }),
      setOpenModal: (openModal) => set({ openModal }),
      closeModal: () => set({ openModal: null }),
    }),
    {
      name: 'pulse-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        myTeam: state.myTeam,
        lang: state.lang,
        voice: state.voice,
        smartReplay: state.smartReplay,
        hapticsEnabled: state.hapticsEnabled,
        pingEnabled: state.pingEnabled,
      }),
    }
  )
);

