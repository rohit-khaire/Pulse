'use client';

import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { LiveSettings } from './LiveSettings';
import { usePulseStore } from '@/lib/store';

const COPY = {
  hinglish: {
    title: 'Seedhi baat (honest scope)',
    items: [
      'Yeh ek asli IPL match ka replay hai (Cricsheet data), live feed nahi.',
      'Rivals aur Fan Room sample / simulated hain, asli log nahi.',
      'Points Dream11 T20 rules ka approximation hain; asli app ke rules final hain.',
      'Pulse samjhata hai. Yeh betting ya jeetne ki salah nahi hai. 18+ ke liye.',
    ],
  },
  en: {
    title: 'Honest scope',
    items: [
      'This replays a real IPL match (Cricsheet data); it is not a live feed.',
      'Rivals and the Fan Room are samples / simulated, not real people.',
      'Points approximate Dream11 T20 rules; the official app rules are final.',
      'Pulse is an explainer. It is not betting or winning advice. 18+ only.',
    ],
  },
  hi: {
    title: 'सीधी बात (honest scope)',
    items: [
      'यह एक असली IPL मैच का रीप्ले है (Cricsheet डेटा), लाइव फ़ीड नहीं।',
      'राइवल्स और फ़ैन रूम सैंपल / सिम्युलेटेड हैं, असली लोग नहीं।',
      'पॉइंट्स Dream11 T20 नियमों का अनुमान हैं; असली ऐप के नियम अंतिम हैं।',
      'Pulse समझाता है। यह बेटिंग या जीतने की सलाह नहीं है। केवल 18+।',
    ],
  },
} as const;

export function MoreTab() {
  const lang = usePulseStore((s) => s.lang);
  const t = COPY[lang];
  return (
    <div className="space-y-3 pb-28">
      <LiveSettings />
      <section aria-labelledby="scope-title" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3.5">
        <h3 id="scope-title" className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 mb-2">
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          {t.title}
        </h3>
        <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
          {t.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
