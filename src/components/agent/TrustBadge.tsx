'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAgentStore } from './agentStore';

/** Tiny debug chip: "TTFT 420ms · verified numbers ✓". Links to the /evals scorecard. */
export function TrustBadge() {
  const meta = useAgentStore((s) => s.lastMeta);

  let label = 'Every number is checked against the engine';
  let tone = 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10';
  let warn = false;
  let title = 'Numbers come from deterministic, unit-tested code. Tap to see the test scorecard.';

  if (meta) {
    const ms = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}s` : `${Math.round(n)}ms`);
    const reason = meta.metrics.fallbackReason ?? '';
    const blocked = /^(guard|final-check|ungrounded|template-number)/.test(reason);
    if (meta.source === 'ai') {
      label = `TTFT ${ms(meta.metrics.ttftMs)} · total ${ms(meta.metrics.totalMs)} · verified numbers ✓`;
      title = `Live model ${meta.metrics.model ?? ''}. ${meta.numbersChecked} number(s) in the reply, all present in tool results.`;
    } else if (meta.source === 'guard') {
      label = `Guardrail · ${ms(meta.metrics.totalMs)} · no model called`;
      tone = 'text-sky-300 border-sky-500/30 bg-sky-500/10';
      title = 'This question was redirected by the safety rules before any AI model saw it.';
    } else if (blocked) {
      label = `AI reply blocked · safe answer in ${ms(meta.metrics.totalMs)} · verified numbers ✓`;
      tone = 'text-amber-300 border-amber-500/30 bg-amber-500/10';
      warn = true;
      title = `The model output failed a guard (${reason}). A deterministic answer was served instead.`;
    } else {
      label = `Offline engine · ${ms(meta.metrics.totalMs)} · verified numbers ✓`;
      title = `Deterministic router (${reason || 'no model used'}). ${meta.numbersChecked} number(s), all from tool results.`;
    }
  }

  const Icon = warn ? ShieldAlert : ShieldCheck;
  return (
    <Link
      href="/evals"
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${tone}`}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
