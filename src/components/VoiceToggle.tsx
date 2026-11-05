'use client';

import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { usePulseStore } from '@/lib/store';

export function VoiceToggle() {
  const voice = usePulseStore((s) => s.voice);
  const setVoice = usePulseStore((s) => s.setVoice);

  return (
    <button
      onClick={() => setVoice(!voice)}
      aria-pressed={voice}
      title="Hear each update aloud, so you never look away from the TV"
      className={`min-h-11 px-3 rounded-lg text-[11px] font-bold flex items-center space-x-1 border transition-all ${
        voice
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
      }`}
    >
      {voice ? <Volume2 aria-hidden="true" className="w-3.5 h-3.5" /> : <VolumeX aria-hidden="true" className="w-3.5 h-3.5" />}
      <span>{voice ? 'Voice on' : 'Voice off'}</span>
    </button>
  );
}
