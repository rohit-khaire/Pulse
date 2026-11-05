import React from 'react';

export function Footer() {
  return (
    <footer className="py-6 px-4 text-center border-t border-slate-800/80 bg-slate-950 text-slate-400 text-xs space-y-1.5">
      <p
        data-testid="rg-notice"
        className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-300"
      >
        Pulse is an explainer, not betting advice. 18+
      </p>
      <p className="font-semibold text-slate-300">Pulse • Cricket Fantasy AI Companion</p>
      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
        Replay of a past match, with sample rivals and a simulated fan room. Independent prototype built for the Dream11
        Forward Deployed Engineer assignment. Not affiliated with or endorsed by Dream11.
      </p>
      <p className="text-[11px] text-slate-500">
        Ball-by-ball match data courtesy of{' '}
        <a
          href="https://cricsheet.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-300 underline hover:text-white"
        >
          Cricsheet
        </a>{' '}
        (ODbL License).
      </p>
    </footer>
  );
}
