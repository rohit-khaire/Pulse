'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileUp, Wand2, RotateCcw } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { STR } from '@/lib/builder/i18n';
import { MODES } from '@/lib/builder/types';
import { LanguageToggle } from '@/components/LanguageToggle';
import { IllustrativeBadge } from './ui';
import { CounterBar } from './CounterBar';
import { SquadList } from './SquadList';
import { TeamPreview } from './TeamPreview';
import { WhyPickSheet } from './WhyPickSheet';
import { BacktestCard } from './BacktestCard';
import { ImportSheet } from './ImportSheet';
import { GoLiveButton } from './GoLiveButton';
import { PageTour } from '@/components/demo/PageTour';
import { BUILDER_TOUR_STEPS } from '@/lib/demo-system';
import { isDemoActive } from '@/components/demo/SystemDemoBar';

/** The whole /build screen. Self-contained: reads only from stores, takes no props. */
export function BuilderApp() {
  const lang = usePulseStore((s) => s.lang);
  const t = STR[lang];
  const { mode, setMode, build, teams, locks, excludes, clearSelections, overrides } = useBuilderStore();
  const [importOpen, setImportOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  // persisted stores hydrate from localStorage on the client: render after mount to avoid a hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if (isDemoActive()) {
      try {
        const dismissed = sessionStorage.getItem('pulse_tour_builder_done') === '1';
        if (!dismissed) setTourOpen(true);
      } catch {}
    }
    const onReopen = () => setTourOpen(true);
    window.addEventListener('pulse-reopen-tour', onReopen);
    return () => window.removeEventListener('pulse-reopen-tour', onReopen);
  }, []);
  const importedCount = Object.keys(overrides).length;
  const hasTeam = teams.length > 0;

  if (!mounted) return <div className="min-h-screen bg-slate-950" />;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur border-b border-slate-900">
        <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-slate-300 min-h-11 pr-2" aria-label={t.backHome}>
            <ArrowLeft className="w-5 h-5" />
            <span className="font-extrabold text-white tracking-tight">{t.title}</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <main className="max-w-md mx-auto w-full px-4 pt-3 pb-32 space-y-3.5">
        <div className="space-y-2">
          <h1 className="text-xl font-black text-white leading-tight">{t.hook}</h1>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1.5">
            <IllustrativeBadge />
            <p className="text-[11px] text-slate-300 leading-relaxed">{t.illustrativeLong}</p>
            {importedCount > 0 && <p className="text-[11px] text-emerald-300">{t.importedNote(importedCount)}</p>}
            <button onClick={() => setImportOpen(true)} className="min-h-11 inline-flex items-center gap-1.5 text-xs font-bold text-red-300">
              <FileUp className="w-4 h-4" /> {t.importBtn}
            </button>
          </div>
        </div>

        <div className="space-y-2" data-tour="builder-modes">
          <div className="grid grid-cols-3 gap-1.5" role="tablist">
            {MODES.map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`min-h-12 rounded-xl border text-xs font-extrabold transition-colors ${
                  mode === m ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-600/20' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                {t.modes[m].name}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">{t.modes[mode].blurb}</p>
        </div>

        <div data-tour="builder-roster">
          <CounterBar />
        </div>

        {hasTeam && (
          <div data-tour="builder-captain" className="space-y-3.5">
            <TeamPreview />
            <BacktestCard />
          </div>
        )}

        {(locks.length > 0 || excludes.length > 0) && (
          <button onClick={clearSelections} className="min-h-11 inline-flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <RotateCcw className="w-3.5 h-3.5" /> {t.clear}
          </button>
        )}

        <SquadList />

        <p className="text-[10px] text-slate-500 text-center pt-2">{t.disclaimer}</p>
      </main>

      <PageTour
        steps={BUILDER_TOUR_STEPS}
        storageKey="pulse_tour_builder_done"
        isOpen={tourOpen}
        onClose={() => setTourOpen(false)}
      />

      {/* Thumb-zone action bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-900 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-md mx-auto px-4 py-2.5 flex gap-2">
          <button
            onClick={build}
            className="flex-1 min-h-12 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-red-600/30"
          >
            <Wand2 className="w-4 h-4" />
            {hasTeam ? t.rebuild : t.autoBuild}
          </button>
          {hasTeam && <GoLiveButton className="flex-1" />}
        </div>
      </div>

      <WhyPickSheet />
      <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}
