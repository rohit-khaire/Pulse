'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePulseStore } from '@/lib/store';
import { useBuilderStore } from '@/lib/builder/store';
import { getPool, loadRules } from '@/lib/builder/pool';
import { buildExplainFacts, type ExplainFacts } from '@/lib/builder/explainFacts';
import { renderTemplate } from '@/lib/builder/explainTemplates';
import type { BuiltTeam } from '@/lib/builder/types';

interface Remote {
  key: string;
  text: string;
  source: 'ai' | 'template';
}

const cache = new Map<string, Remote>();

/**
 * Instant deterministic explanation (always available, works offline), upgraded in place by the
 * AI-narrated version from /api/builder/explain if that returns source 'ai'.
 */
export function useExplain(team: BuiltTeam | undefined, focus?: string) {
  const lang = usePulseStore((s) => s.lang);
  const overrides = useBuilderStore((s) => s.overrides);

  const key = team ? JSON.stringify([team.mode, team.xi, team.c, team.vc, focus ?? null, lang, overrides]) : '';

  const local = useMemo<{ facts: ExplainFacts; text: string } | null>(() => {
    if (!team) return null;
    try {
      const rules = loadRules();
      const facts = buildExplainFacts({
        lang,
        mode: team.mode,
        xi: team.xi,
        c: team.c,
        vc: team.vc,
        pool: getPool(overrides),
        creditBudget: rules.creditBudget,
        teamSize: rules.teamSize,
        maxPerTeam: rules.maxPerTeam,
        focusName: focus,
      });
      return { facts, text: renderTemplate(facts) };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [remote, setRemote] = useState<Remote | null>(null);
  const [doneKey, setDoneKey] = useState('');

  useEffect(() => {
    if (!team || !key) return;
    const hit = cache.get(key);
    if (hit) {
      setRemote(hit);
      setDoneKey(key);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/builder/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lang,
            mode: team.mode,
            xi: team.xi,
            c: team.c,
            vc: team.vc,
            focus,
            overrides: Object.keys(overrides).length ? overrides : undefined,
          }),
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error('bad status');
        const data = (await res.json()) as { text: string; source: 'ai' | 'template' };
        const r: Remote = { key, text: data.text, source: data.source };
        cache.set(key, r);
        setRemote(r);
      } catch {
        /* offline or error: the deterministic text stays on screen */
      } finally {
        if (!ctrl.signal.aborted) setDoneKey(key);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const useRemote = remote !== null && remote.key === key;
  return {
    facts: local?.facts ?? null,
    text: useRemote ? remote.text : (local?.text ?? ''),
    source: (useRemote ? remote.source : 'template') as 'ai' | 'template',
    loading: !!team && doneKey !== key,
  };
}
