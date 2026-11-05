'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';

const OPTIONS: { id: 'en' | 'hinglish' | 'hi'; label: string; name: string; lang: string }[] = [
  { id: 'en', label: 'EN', name: 'English', lang: 'en' },
  { id: 'hinglish', label: 'Hinglish', name: 'Hinglish', lang: 'hi-Latn' },
  { id: 'hi', label: 'हिन्दी', name: 'Hindi', lang: 'hi' },
];

export function LanguageToggle() {
  const lang = usePulseStore((s) => s.lang);
  const setLang = usePulseStore((s) => s.setLang);

  return (
    <div
      role="group"
      aria-label="Language"
      data-tour="lang"
      className="inline-flex items-center rounded-full bg-slate-800/80 p-0.5 border border-slate-700 backdrop-blur-sm shadow-inner"
    >
      {OPTIONS.map((opt) => {
        const active = lang === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setLang(opt.id)}
            aria-pressed={active}
            aria-label={opt.name}
            lang={opt.lang}
            className={`min-h-11 min-w-11 px-3 text-xs font-semibold rounded-full transition-all duration-200 ${
              active
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
