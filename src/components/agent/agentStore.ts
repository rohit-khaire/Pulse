'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AnswerMetrics, Intent, Lang, Verdict } from '@/lib/agent/types';

export interface ChatMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  status: 'pending' | 'streaming' | 'done';
  replyLang?: Lang;
  via?: 'text' | 'voice';
  tools?: { name: string; done: boolean }[];
  /** "Rajasthan Royals 90/2 (9.4 ov)": the replay moment this answer is about. */
  atLabel?: string;
  source?: 'ai' | 'template' | 'guard';
  verdict?: Verdict;
  intents?: Intent[];
}

export interface LastMeta {
  source: 'ai' | 'template' | 'guard';
  metrics: AnswerMetrics;
  numbersChecked: number;
  numbersAllowed: number;
  verdict: Verdict;
}

export type MicLang = 'auto' | 'hi-IN' | 'en-IN';

interface AgentUIState {
  open: boolean;
  messages: ChatMsg[];
  busy: boolean;
  /** Text box content. VoiceMic streams interim transcripts here. */
  draft: string;
  listening: boolean;
  /** A finished voice transcript waiting for AskPulse to submit it. */
  pendingVoice: string | null;
  lastMeta: LastMeta | null;
  speakReplies: boolean;
  micLang: MicLang;
  forceOffline: boolean;

  setOpen: (v: boolean) => void;
  setDraft: (v: string) => void;
  setListening: (v: boolean) => void;
  submitVoice: (text: string) => void;
  clearPendingVoice: () => void;
  setSpeakReplies: (v: boolean) => void;
  setMicLang: (v: MicLang) => void;
  setForceOffline: (v: boolean) => void;
  setBusy: (v: boolean) => void;
  setLastMeta: (m: LastMeta | null) => void;
  pushMessages: (...m: ChatMsg[]) => void;
  patchMessage: (id: string, patch: Partial<ChatMsg> | ((m: ChatMsg) => Partial<ChatMsg>)) => void;
  clearChat: () => void;
}

export const useAgentStore = create<AgentUIState>()(
  persist(
    (set) => ({
      open: false,
      messages: [],
      busy: false,
      draft: '',
      listening: false,
      pendingVoice: null,
      lastMeta: null,
      speakReplies: false,
      micLang: 'auto',
      forceOffline: false,

      setOpen: (open) => set({ open }),
      setDraft: (draft) => set({ draft }),
      setListening: (listening) => set({ listening }),
      submitVoice: (text) => set({ pendingVoice: text }),
      clearPendingVoice: () => set({ pendingVoice: null }),
      setSpeakReplies: (speakReplies) => set({ speakReplies }),
      setMicLang: (micLang) => set({ micLang }),
      setForceOffline: (forceOffline) => set({ forceOffline }),
      setBusy: (busy) => set({ busy }),
      setLastMeta: (lastMeta) => set({ lastMeta }),
      pushMessages: (...m) => set((s) => ({ messages: [...s.messages, ...m].slice(-40) })),
      patchMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)),
        })),
      clearChat: () => set({ messages: [], lastMeta: null }),
    }),
    {
      name: 'pulse-agent',
      storage: createJSONStorage(() => localStorage),
      // Chat history refers to replay moments that will not exist next session, so only preferences persist.
      partialize: (s) => ({ speakReplies: s.speakReplies, micLang: s.micLang, forceOffline: s.forceOffline }),
    },
  ),
);
