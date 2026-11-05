'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

/** Route-level safety net: anything that escapes the per-card boundaries lands here, not on a white screen. */
export default function MatchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[pulse] match route error', error);
  }, [error]);

  return (
    <div role="alert" className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-lg font-extrabold text-white">Kuch gadbad ho gayi</h1>
      <p className="text-xs text-slate-400 max-w-xs">Something went wrong loading the replay. Your team is saved; try again.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Retry
        </button>
        <Link href="/" className="min-h-11 px-5 rounded-xl border border-slate-700 bg-slate-800 text-slate-100 text-sm font-bold flex items-center">
          Home
        </Link>
      </div>
    </div>
  );
}
