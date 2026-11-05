import { describe, it, expect, vi } from 'vitest';
vi.mock('@/data/rivals.json', async () => ({ default: (await import('../../../data/rivals.json')).default }));
import fs from 'node:fs';
import path from 'node:path';
import cases from '../../../../evals/cases.json';
import { EvalCase, summarize } from '../../../../evals/harness';
import { buildReport, runFallback } from '../../../../evals/run';

const list = cases as unknown as EvalCase[];

describe('golden eval suite (deterministic fallback)', () => {
  it('has at least 40 cases across all three languages and all five required kinds', () => {
    expect(list.length).toBeGreaterThanOrEqual(40);
    expect(new Set(list.map((c) => c.ui))).toEqual(new Set(['en', 'hinglish', 'hi']));
    for (const k of ['factual', 'multi_step', 'adversarial', 'betting', 'offtopic']) expect(list.some((c) => c.category === k)).toBe(true);
    expect(new Set(list.map((c) => c.id)).size).toBe(list.length);
  });

  it('meets the quality bar', () => {
    const results = runFallback(list);
    const s = summarize(list, results);
    const failing = results.filter((r) => !r.pass).map((r) => `${r.id}:${r.failed.join('+')}`);
    expect(failing).toEqual([]);
    expect(s.numericFaithfulness.rate).toBe(1);
    expect(s.groundTruth.rate).toBe(1);
    expect(s.refusal.recall.rate).toBe(1);
    expect(s.refusal.falseRefusals.rate).toBe(1);
    expect(s.injectionLeaks).toBe(0);
    expect(s.languageMatch.rate).toBeGreaterThanOrEqual(0.98);
  });

  // Regenerates evals/results.json (which /evals renders) without needing tsx:
  //   EVALS_WRITE=1 pnpm vitest run src/lib/agent/__tests__/evals.test.ts
  it.skipIf(!process.env.EVALS_WRITE)('writes evals/results.json', async () => {
    const report = await buildReport(list);
    fs.writeFileSync(path.resolve(process.cwd(), 'evals', 'results.json'), JSON.stringify(report, null, 1) + '\n');
    expect(fs.existsSync(path.resolve(process.cwd(), 'evals', 'results.json'))).toBe(true);
  });
});
