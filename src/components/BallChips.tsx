'use client';

import React from 'react';

interface BallChipsProps {
  balls: string[];
}

export function BallChips({ balls }: BallChipsProps) {
  if (!balls || balls.length === 0) {
    return (
      <div className="flex items-center space-x-1.5 text-xs text-slate-500">
        <span>Starting over...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1.5" role="img" aria-label={`Last ${balls.length} balls: ${balls.join(', ')}`}>
      {balls.map((b, idx) => {
        let style = 'bg-slate-800 text-slate-300 border-slate-700';
        if (b.includes('W')) {
          style = 'bg-rose-600 text-white font-bold border-rose-500 shadow-sm shadow-rose-600/50 animate-pulse motion-reduce:animate-none';
        } else if (b === '6') {
          style = 'bg-purple-600 text-white font-bold border-purple-500 shadow-sm shadow-purple-600/50';
        } else if (b === '4') {
          style = 'bg-blue-600 text-white font-bold border-blue-500';
        } else if (b.includes('wd') || b.includes('nb')) {
          style = 'bg-amber-600/90 text-white font-medium border-amber-500 text-[10px]';
        } else if (b === '0') {
          style = 'bg-slate-800/80 text-slate-400 border-slate-700/60';
        }

        return (
          <span
            key={idx}
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs border transition-transform duration-200 hover:scale-110 ${style}`}
          >
            {b}
          </span>
        );
      })}
    </div>
  );
}

