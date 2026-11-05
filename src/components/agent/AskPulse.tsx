'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import { Bot, Mic, X, Send, Sparkles, Volume2, VolumeX, Loader2, Check, Trash2, WifiOff } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { speak, voiceSupported } from '@/lib/useVoice';
import { buildAgentContext } from '@/lib/agent/context';
import { getSuggestedQuestions } from '@/lib/agent/suggestions';
import { useAgentStore, ChatMsg } from './agentStore';
import { useAskPulse } from './useAskPulse';
import { VoiceMic } from './VoiceMic';
import { TrustBadge } from './TrustBadge';

const TOOL_LABEL: Record<string, string> = {
  getMatchState: 'Match state',
  getTeamPoints: 'Team points',
  getPlayerBreakdown: 'Player',
  getRankGap: 'Rank gap',
  getPathToVictory: 'Path to #1',
  explainDismissal: 'Wicket',
  catchUp: 'Catch-up',
  whatIfCaptain: 'What-if',
  getScoringRules: 'Rules',
};

const COPY = {
  en: { sub: 'Verified answers · numbers come from the engine', ph: 'Ask: why did my rank drop?', hint: 'Try asking', thinking: 'Checking the numbers…', empty: 'Ask in Hinglish, Hindi or English. Hold the mic to talk.' },
  hinglish: { sub: 'Verified jawab · numbers engine se aate hain', ph: 'Poocho: mera rank kyu gira?', hint: 'Ye try karo', thinking: 'Numbers check ho rahe hain…', empty: 'Hinglish, Hindi ya English mein poochho. Bolne ke liye mic dabake rakho.' },
  hi: { sub: 'सत्यापित उत्तर · आंकड़े इंजन से आते हैं', ph: 'पूछें: मेरा रैंक क्यों गिरा?', hint: 'यह आज़माएँ', thinking: 'आंकड़े जाँचे जा रहे हैं…', empty: 'हिंग्लिश, हिंदी या अंग्रेज़ी में पूछें। बोलने के लिए माइक दबाकर रखें।' },
} as const;

function Bubble({ m }: { m: ChatMsg }) {
  if (m.role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white whitespace-pre-line">
        {m.via === 'voice' && <Mic className="mr-1 inline h-3 w-3 text-red-400" aria-label="spoken" />}
        {m.text}
      </div>
    );
  }
  const waiting = m.status === 'pending';
  return (
    <div className="mr-auto max-w-[92%] space-y-1">
      <div className="rounded-2xl rounded-bl-md bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 px-3 py-2.5 text-[13px] leading-relaxed text-slate-100">
        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-red-400">
          <Sparkles className="h-3 w-3" /> Pulse
          {m.source === 'template' && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-slate-800 px-1 py-px text-[9px] font-semibold text-slate-400">
              <WifiOff className="h-2.5 w-2.5" /> offline engine
            </span>
          )}
          {m.source === 'guard' && <span className="ml-1 rounded bg-sky-500/15 px-1 py-px text-[9px] font-semibold text-sky-300">guardrail</span>}
        </div>
        {(m.tools?.length ?? 0) > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {m.tools!.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-0.5 rounded-full border border-slate-700 bg-slate-900 px-1.5 py-px text-[9px] text-slate-400">
                {t.done ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                {TOOL_LABEL[t.name] ?? t.name}
              </span>
            ))}
          </div>
        )}
        {waiting ? (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" />
            <ThinkingText />
          </div>
        ) : (
          <p className="whitespace-pre-line">{m.text}</p>
        )}
      </div>
      {m.status === 'done' && m.atLabel && (
        <div className="flex items-center gap-2 px-1 text-[9px] text-slate-500">
          <span className="truncate">As of {m.atLabel}</span>
          {voiceSupported() && m.text && m.text !== '…' && (
            <button
              type="button"
              onClick={() => speak(m.text, m.replyLang ?? 'hinglish')}
              className="inline-flex shrink-0 items-center gap-0.5 text-slate-400 hover:text-white"
              aria-label="Read aloud"
            >
              <Volume2 className="h-3 w-3" /> listen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ThinkingText() {
  const lang = usePulseStore((s) => s.lang);
  return <span>{COPY[lang].thinking}</span>;
}

/** Bottom-sheet chat. Open state lives in the agent store; use AskPulseLauncher to wire it into a page. */
export function AskPulse() {
  const lang = usePulseStore((s) => s.lang);
  const frames = usePulseStore((s) => s.frames);
  const cursor = usePulseStore((s) => s.cursor);
  const config = usePulseStore((s) => s.config);
  const myTeam = usePulseStore((s) => s.myTeam);

  const open = useAgentStore((s) => s.open);
  const setOpen = useAgentStore((s) => s.setOpen);
  const messages = useAgentStore((s) => s.messages);
  const busy = useAgentStore((s) => s.busy);
  const draft = useAgentStore((s) => s.draft);
  const setDraft = useAgentStore((s) => s.setDraft);
  const pendingVoice = useAgentStore((s) => s.pendingVoice);
  const clearPendingVoice = useAgentStore((s) => s.clearPendingVoice);
  const speakReplies = useAgentStore((s) => s.speakReplies);
  const setSpeakReplies = useAgentStore((s) => s.setSpeakReplies);
  const forceOffline = useAgentStore((s) => s.forceOffline);
  const setForceOffline = useAgentStore((s) => s.setForceOffline);
  const clearChat = useAgentStore((s) => s.clearChat);

  const ask = useAskPulse();
  const endRef = useRef<HTMLDivElement | null>(null);
  const c = COPY[lang];

  const chips = useMemo(() => {
    try {
      if (frames.length === 0) return [];
      return getSuggestedQuestions(buildAgentContext({ frames, config, cursor, team: myTeam, lang }));
    } catch {
      return [];
    }
  }, [frames, config, cursor, myTeam, lang]);

  // A finished voice transcript arrives through the store (VoiceMic takes no props).
  useEffect(() => {
    if (pendingVoice && open) {
      const t = pendingVoice;
      clearPendingVoice();
      void ask(t, 'voice');
    }
  }, [pendingVoice, open, ask, clearPendingVoice]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-label="Ask Pulse">
      <div className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl border-t border-slate-800 bg-slate-900 shadow-2xl sm:rounded-2xl sm:border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 p-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-600/20 text-red-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-white leading-tight">Ask Pulse</h3>
              <p className="truncate text-[10px] text-slate-400">{c.sub}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {voiceSupported() && (
              <button
                onClick={() => setSpeakReplies(!speakReplies)}
                className={`rounded-full p-1.5 ${speakReplies ? 'bg-red-600/20 text-red-300' : 'text-slate-400 hover:text-white'}`}
                aria-label={speakReplies ? 'Turn off spoken replies' : 'Turn on spoken replies'}
                aria-pressed={speakReplies}
              >
                {speakReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            )}
            {messages.length > 0 && (
              <button onClick={clearChat} className="rounded-full p-1.5 text-slate-400 hover:text-white" aria-label="Clear chat">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Trust strip */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/70 bg-slate-950/40 px-3.5 py-1.5">
          <TrustBadge />
          <label className="flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
            <input type="checkbox" checked={forceOffline} onChange={(e) => setForceOffline(e.target.checked)} className="accent-red-600" />
            offline engine
          </label>
        </div>

        {/* Conversation */}
        <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
          {messages.length === 0 && <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">{c.empty}</p>}
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          <div ref={endRef} />
        </div>

        {/* Suggested chips */}
        {chips.length > 0 && (
          <div className="border-t border-slate-800/70 px-3.5 pt-2.5">
            <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{c.hint}</span>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  disabled={busy}
                  onClick={() => ask(chip.text)}
                  className="shrink-0 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-slate-700 active:scale-95 disabled:opacity-50"
                >
                  {chip.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-slate-800 bg-slate-950 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(draft);
            }}
            className="flex items-center gap-2"
          >
            <VoiceMic />
            <input
              type="text"
              maxLength={300}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={c.ph}
              className="min-w-0 flex-1 rounded-xl border border-slate-700/80 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
            />
            <button type="submit" disabled={!draft.trim() || busy} className="rounded-xl bg-red-600 p-2.5 text-white transition-colors hover:bg-red-500 disabled:opacity-40" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-center text-[9px] leading-snug text-slate-500">
            Entertainment &amp; explanation only: not betting or winning advice. League rivals are demo data. Replay of a real IPL match, not a live feed.
          </p>
        </div>
      </div>
    </div>
  );
}
