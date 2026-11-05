'use client';

import React from 'react';
import { Sparkles, Scale, MessageSquare, Zap, Target } from 'lucide-react';

interface LiveFanActionBarProps {
  onOpenCatchUp: () => void;
  onOpenDRS: () => void;
  isChatActive: boolean;
  onToggleChat: () => void;
}

export function LiveFanActionBar({
  onOpenCatchUp,
  onOpenDRS,
  isChatActive,
  onToggleChat,
}: LiveFanActionBarProps) {
  return (
    <div data-tour="actions" role="group" aria-label="Quick actions" className="flex items-center space-x-2 my-1 overflow-x-auto pb-1 text-xs">
      {/* 1. Catch Me Up Button */}
      <button
        onClick={onOpenCatchUp}
        className="flex-1 min-h-11 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600/20 via-rose-600/20 to-red-600/20 hover:from-red-600/30 hover:to-rose-600/30 border border-red-500/40 text-red-300 font-bold flex items-center justify-center space-x-1.5 shadow-sm transition-all active:scale-95 shrink-0"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" aria-hidden="true" />
        <span>Catch Me Up</span>
      </button>

      {/* 2. Wicket explainer button */}
      <button
        onClick={onOpenDRS}
        className="flex-1 min-h-11 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 shrink-0"
      >
        <Scale className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
        <span>Why Out?</span>
      </button>

      {/* 3. Fan Live Chat Toggle Button */}
      <button
        onClick={onToggleChat}
        aria-pressed={isChatActive}
        className={`min-h-11 py-2 px-3 rounded-xl font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 shrink-0 ${
          isChatActive
            ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
            : 'bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200'
        }`}
      >
        <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Fan Room</span>
      </button>
    </div>
  );
}

