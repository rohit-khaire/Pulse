'use client';

import React, { memo } from 'react';
import { Nudge } from '@/lib/engine/types';
import { usePulseStore } from '@/lib/store';
import { motion } from 'motion/react';
import { ThumbsUp, ThumbsDown, Sparkles, Zap, Volume2 } from 'lucide-react';
import { speak } from '@/lib/useVoice';
import { ShareBragButton } from './ShareBragButton';

interface NudgeCardProps {
  nudge: Nudge;
}

export const NudgeCard = memo(function NudgeCard({ nudge }: NudgeCardProps) {
  const rateNudge = usePulseStore((s) => s.rateNudge);

  const isWicket = nudge.event.type === 'WICKET';
  const isSix = nudge.event.type === 'SIX';
  const isHaul = nudge.event.type === 'HAUL';
  const isMilestone = nudge.event.type === 'MILESTONE';

  let borderColor = 'border-slate-800';
  let badgeStyle = 'bg-slate-800 text-slate-300';
  let icon = <Zap className="w-3.5 h-3.5 text-slate-400" />;

  if (isWicket || isHaul) {
    borderColor = 'border-rose-600/40 bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900';
    badgeStyle = 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    icon = <span className="text-rose-400 font-black text-xs">W</span>;
  } else if (isSix || isMilestone) {
    borderColor = 'border-purple-600/40 bg-gradient-to-br from-purple-950/20 via-slate-900 to-slate-900';
    badgeStyle = 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
    icon = <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
  }

  return (
    <motion.article
      aria-label={`${nudge.event.type} nudge`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`rounded-2xl p-3.5 border ${borderColor} shadow-lg transition-all duration-200 mb-3 pulse-cv`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center space-x-1 ${badgeStyle}`}>
            {icon}
            <span>{nudge.event.type}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Over {nudge.event.details?.over ? `${nudge.event.details.over}` : ''}
          </span>
        </div>

        <div className="flex items-center space-x-1 text-[10px] text-slate-500 font-medium">
          <span className={`px-1.5 py-0.5 rounded ${nudge.source === 'ai' ? 'bg-indigo-950 text-indigo-400 border border-indigo-800/40' : 'bg-slate-800 text-slate-400'}`}>
            {nudge.source === 'ai' ? 'AI narration' : 'Instant template'}
          </span>
        </div>
      </div>

      <p className="text-slate-100 text-sm font-medium leading-snug tracking-normal mb-3">
        {nudge.text}
      </p>

      {/* Footer with 👍 / 👎 & Brag Share */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs text-slate-400">
        <span className="text-[11px] text-slate-500 truncate max-w-[45%]">
          {nudge.event.description}
        </span>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => speak(nudge.text, nudge.lang)}
            className="min-h-11 min-w-11 flex items-center justify-center rounded-md hover:bg-slate-800 text-amber-400"
            title="Listen"
            aria-label="Listen to this update"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          <ShareBragButton text={nudge.text} />

          <div className="flex items-center space-x-1 pl-1 border-l border-slate-800">
            <button
              onClick={() => rateNudge(nudge.id, 'up')}
              aria-label="Helpful"
              aria-pressed={nudge.rating === 'up'}
              className={`min-h-11 min-w-11 flex items-center justify-center rounded-md transition-colors ${
                nudge.rating === 'up'
                  ? 'bg-emerald-500/30 text-emerald-300'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Helpful"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => rateNudge(nudge.id, 'down')}
              aria-label="Not helpful"
              aria-pressed={nudge.rating === 'down'}
              className={`min-h-11 min-w-11 flex items-center justify-center rounded-md transition-colors ${
                nudge.rating === 'down'
                  ? 'bg-rose-500/30 text-rose-300'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="Not helpful"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
});

