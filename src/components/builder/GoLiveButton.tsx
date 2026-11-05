'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { STR } from '@/lib/builder/i18n';

import { isDemoActive } from '@/components/demo/SystemDemoBar';

/** Hands the active team to the main Pulse store and opens the live replay. */
export function GoLiveButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const lang = usePulseStore((s) => s.lang);
  const setTeam = usePulseStore((s) => s.setTeam);
  const resetReplay = usePulseStore((s) => s.resetReplay);
  const team = useBuilderStore((s) => s.teams[s.activeIdx]);
  if (!team) return null;

  const go = () => {
    setTeam({ xi: team.xi, c: team.c, vc: team.vc });
    resetReplay(); // clear old nudges so the feed starts fresh for the new team
    router.push(isDemoActive() ? '/match?demo=1' : '/match');
  };

  return (
    <button
      onClick={go}
      data-tour="builder-golive"
      className={`min-h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 ${className}`}
    >
      <Radio className="w-4 h-4" />
      {STR[lang].goLive}
    </button>
  );
}
