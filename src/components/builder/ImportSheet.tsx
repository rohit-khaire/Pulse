'use client';

import React, { useMemo, useState } from 'react';
import { X, FileUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { loadSquads } from '@/lib/builder/pool';
import { parseProjectionText, type ImportReport } from '@/lib/builder/importer';
import { STR } from '@/lib/builder/i18n';

/** Paste CSV / sheet rows to replace the illustrative projections with real ones. Validated with zod. */
export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lang = usePulseStore((s) => s.lang);
  const t = STR[lang];
  const { setOverrides, clearOverrides, overrides } = useBuilderStore();
  const [text, setText] = useState('');
  const [report, setReport] = useState<ImportReport | null>(null);
  const base = useMemo(() => loadSquads().players, []);

  if (!open) return null;

  const apply = () => {
    try {
      const r = parseProjectionText(text, base);
      setReport(r);
      if (Object.keys(r.overrides).length) setOverrides(r.overrides);
    } catch {
      setReport({ matches: [], errors: [{ line: 0, message: 'Could not read that text.' }], unmatched: [], overrides: {} });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-slate-900 p-4 space-y-3 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <FileUp className="w-4 h-4 text-red-400" /> {t.importTitle}
          </h3>
          <button onClick={onClose} aria-label={t.close} className="w-11 h-11 rounded-full hover:bg-slate-800 flex items-center justify-center text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{t.importHelp}</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.importPlaceholder}
          rows={7}
          spellCheck={false}
          className="w-full rounded-xl bg-slate-950 border border-slate-700 p-2.5 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
        />
        <div className="flex gap-2">
          <button onClick={apply} className="flex-1 min-h-12 rounded-xl bg-red-600 text-white font-extrabold text-sm">
            {t.importApply}
          </button>
          {Object.keys(overrides).length > 0 && (
            <button
              onClick={() => {
                clearOverrides();
                setReport(null);
              }}
              className="min-h-12 px-3 rounded-xl border border-slate-700 text-xs font-bold text-slate-300"
            >
              {t.importClear}
            </button>
          )}
        </div>

        {report && (
          <div className="space-y-2 text-xs">
            {report.matches.length > 0 && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-emerald-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> {t.importMatched(report.matches.length)}
                </div>
                {report.matches.some((m) => m.how === 'surname') && (
                  <div className="text-amber-200">
                    {t.importBySurname}: {report.matches.filter((m) => m.how === 'surname').map((m) => `${m.input} → ${m.player}`).join(', ')}
                  </div>
                )}
              </div>
            )}
            {report.errors.length > 0 && (
              <ul className="rounded-xl border border-red-500/40 bg-red-500/10 p-2.5 space-y-1 text-red-200" role="alert">
                {report.errors.map((e, i) => (
                  <li key={i} className="flex gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{e.line ? `L${e.line}: ` : ''}{e.message}</span>
                  </li>
                ))}
              </ul>
            )}
            {report.unmatched.length > 0 && (
              <p className="text-slate-400">
                {t.importUnmatched} {report.unmatched.join(', ')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
