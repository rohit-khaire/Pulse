'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePulseStore } from '@/lib/store';
import { teamPoints } from '@/lib/engine/points';
import { computeLeaderboard } from '@/lib/engine/league';
import { DialogShell } from '@/app/match/_shell/Dialog';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  HelpCircle,
  Loader2,
  Bot,
  Target,
  Trophy,
} from 'lucide-react';

export function SamjhaoSheet() {
  const {
    samjhaoOpen,
    setSamjhaoOpen,
    lang,
    frames,
    cursor,
    myTeam,
    config,
  } = usePulseStore();

  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const streamEndRef = useRef<HTMLDivElement | null>(null);

  const frame = frames[cursor] || frames[0];
  const prevFrame = cursor > 0 ? frames[cursor - 1] : null;

  const chips = [
    {
      id: 1,
      label:
        lang === 'hi'
          ? 'क्या मैं अभी भी जीत सकता हूँ? (Can I win?)'
          : lang === 'hinglish'
          ? 'Kya main abhi bhi jeet sakta hoon?'
          : 'Can I still win #1?',
    },
    {
      id: 2,
      label:
        lang === 'hi'
          ? 'अमन से आगे निकलने के लिए क्या चाहिए?'
          : lang === 'hinglish'
          ? 'Aman se aage nikalne ke liye kya chahiye?'
          : 'What do I need to beat Aman?',
    },
    {
      id: 3,
      label:
        lang === 'hi'
          ? 'इस बॉल पर क्या रूट करूँ?'
          : lang === 'hinglish'
          ? 'Is ball par kya root karun?'
          : 'What should I root for this ball?',
    },
    {
      id: 4,
      label:
        lang === 'hi'
          ? 'मेरा रैंक क्यों बदला?'
          : lang === 'hinglish'
          ? 'Mera rank kyu badla?'
          : 'Why did my rank change?',
    },
  ];

  const handleAsk = async (qText: string) => {
    if (!qText.trim() || isLoading) return;

    setQuestion(qText);
    setResponse('');
    setIsLoading(true);

    try {
      const myCreasePlayers = [frame?.batter, frame?.nonStriker].filter(
        (p) => p && myTeam?.xi.includes(p)
      );

      // Leaderboard calculation
      let userRank = 1;
      let userPoints = 0;
      let gapToLeader = 0;
      let leaderName = 'Leader';

      if (myTeam && frame) {
        const lb = computeLeaderboard(frame, prevFrame, myTeam, config);
        const userEntry = lb.find((e) => e.isUser);
        if (userEntry) {
          userRank = userEntry.rank;
          userPoints = userEntry.totalPts;
          leaderName = lb[0]?.name || 'Leader';
          gapToLeader = Math.round((lb[0]?.totalPts - userEntry.totalPts) * 10) / 10;
        }
      }

      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lang,
          question: qText,
          context: {
            scoreLine: frame?.scoreLine,
            over: frame?.currentScore?.oversStr,
            lastBalls: frame?.recentBalls,
            myPlayersAtCrease: myCreasePlayers,
            userRank,
            userPoints,
            gapToLeader,
            leaderName,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Explain API error');
      }

      if (!res.body) {
        throw new Error('No response stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setResponse(accumulated);
      }
    } catch (err: unknown) {
      console.error('Samjhao error:', err);
      setResponse(
        lang === 'hi'
          ? 'माफ़ कीजिए, उत्तर प्राप्त करने में समस्या हुई। कृपया पुनः प्रयास करें।'
          : lang === 'hinglish'
          ? 'Network issue ya server thoda busy hai. Kripya dobara poochhein!'
          : 'Unable to stream explanation right now. Please try again in a moment.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }, [response]);

  if (!samjhaoOpen) return null;

  return (
    <>
      {/* Drawer Overlay */}
      {(
        <DialogShell onClose={() => setSamjhaoOpen(false)} label="Samjhao AI assistant" className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-white text-base">
                    Samjhao AI
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live Cricket & Fantasy Dilemma Assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSamjhaoOpen(false)}
                aria-label="Close"
                className="min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-sm">
              {/* Suggestion chips */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 block">
                  Top Live Fan Questions (Tap to ask)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {chips.map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => handleAsk(chip.label)}
                      disabled={isLoading}
                      className="min-h-11 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 text-left transition-colors active:scale-95 disabled:opacity-50 flex items-center space-x-1"
                    >
                      <span>{chip.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation Area */}
              {question && (
                <div className="space-y-3 pt-2">
                  <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 text-xs text-white max-w-[85%] ml-auto">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                      You asked
                    </span>
                    {question}
                  </div>

                  <div aria-live="polite" className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl p-3.5 border border-slate-800 text-xs leading-relaxed max-w-[90%] mr-auto text-slate-200">
                    <div className="flex items-center space-x-1.5 mb-1.5 text-red-400 font-bold text-[11px]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Samjhao AI</span>
                    </div>

                    {isLoading && !response && (
                      <div className="flex items-center space-x-2 text-slate-400 py-2">
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        <span>Calculating live match scenarios...</span>
                      </div>
                    )}

                    {response && (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-slate-100 font-normal">
                        {response}
                      </p>
                    )}
                    <div ref={streamEndRef} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-slate-950 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAsk(question);
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  aria-label="Ask Samjhao AI a cricket or fantasy question"
                  maxLength={250}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={
                    lang === 'hi'
                      ? 'क्रिकेट या पॉइंट्स के बारे में पूछें...'
                      : lang === 'hinglish'
                      ? 'Poocho: Kya main jeet sakta hoon? Rank kyu gira?...'
                      : 'Ask: Can I still win? Why did rank drop?...'
                  }
                  className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
                <button
                  type="submit"
                  disabled={!question.trim() || isLoading}
                  aria-label="Send question"
                  className="min-h-11 min-w-11 flex items-center justify-center rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </DialogShell>
      )}
    </>
  );
}

/** In-flow launcher (the shell's floating stack positions it). */
export function SamjhaoLauncher() {
  const setSamjhaoOpen = usePulseStore((s) => s.setSamjhaoOpen);
  return (
    <button
      type="button"
      data-tour="ask"
      onClick={() => setSamjhaoOpen(true)}
      className="min-h-11 px-4 rounded-full bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white font-bold text-xs shadow-xl shadow-red-600/40 flex items-center space-x-1.5 transition-transform active:scale-95 motion-reduce:active:scale-100 border border-red-400/40"
    >
      <Sparkles aria-hidden="true" className="w-4 h-4 fill-amber-300 text-amber-300" />
      <span>Samjhao</span>
    </button>
  );
}

/** Backwards-compatible all-in-one export (fixed launcher + sheet). */
export function SamjhaoDrawer() {
  return (
    <>
      <div className="fixed right-4 bottom-20 z-40">
        <SamjhaoLauncher />
      </div>
      <SamjhaoSheet />
    </>
  );
}
