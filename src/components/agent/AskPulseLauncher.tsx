'use client';

import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';
import { AskPulse } from './AskPulse';
import { useAgentStore } from './agentStore';

/**
 * Single wiring point for Stream 3. Drop <AskPulseLauncher /> anywhere in the match page.
 * Trigger sits bottom-LEFT (Samjhao's trigger is bottom-right), and the sheet uses z-[60] (Samjhao uses z-50).
 */
export function AskPulseLauncher() {
  const open = useAgentStore((s) => s.open);
  const setOpen = useAgentStore((s) => s.setOpen);
  return (
    <>
      {!open && (
        <button
          data-tour="ask-pulse"
          onClick={() => setOpen(true)}
          aria-label="Ask Pulse"
          className="fixed bottom-20 left-4 z-40 flex items-center space-x-1.5 rounded-full border border-slate-600/60 bg-slate-900/95 px-3.5 py-2.5 text-xs font-bold text-white shadow-xl shadow-black/40 backdrop-blur transition-transform hover:bg-slate-800 active:scale-95"
        >
          <MessageCircleQuestion className="h-4 w-4 text-red-400" />
          <span>Ask Pulse</span>
        </button>
      )}
      <AskPulse />
    </>
  );
}
