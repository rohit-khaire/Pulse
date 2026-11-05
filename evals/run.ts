/**
 * Ask Pulse eval runner.
 *   npx tsx evals/run.ts            # from the pulse/ project root; always runs the deterministic fallback,
 *                                   # and also live Groq when GROQ_API_KEY is set
 *   EVALS_WRITE=1 pnpm vitest run src/lib/agent/__tests__/evals.test.ts   # same, using only repo dependencies
 * Writes evals/results.json, which /evals renders.
 */
import fs from 'node:fs';
import path from 'node:path';

// Automatically load .env.local / .env if running standalone via tsx/node
if (!process.env.GROQ_API_KEY) {
  for (const f of ['.env.local', '.env']) {
    const envPath = path.resolve(process.cwd(), f);
    if (fs.existsSync(envPath)) {
      if (typeof (process as any).loadEnvFile === 'function') {
        try { (process as any).loadEnvFile(envPath); } catch {}
      }
      if (!process.env.GROQ_API_KEY) {
        try {
          const content = fs.readFileSync(envPath, 'utf8');
          for (const line of content.split('\n')) {
            const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
            if (m && !process.env[m[1]]) {
              process.env[m[1]] = (m[2] || '').trim().replace(/^["']|["']$/g, '');
            }
          }
        } catch {}
      }
    }
  }
}

import cases from './cases.json';
import { EvalCase, CaseResult, makeContext, scoreCase, summarize } from './harness';
import { answerOffline } from '../src/lib/agent/router';
import { classifyInput } from '../src/lib/agent/guard';
import type { AgentAnswer } from '../src/lib/agent/types';

const now = () => performance.now();

export function runFallback(list: EvalCase[]): CaseResult[] {
  // Warm-up so the first case does not pay one-time JIT/timeline costs in the latency numbers.
  answerOffline(makeContext(list[0]), 'rank');
  return list.map((c) => {
    const ctx = makeContext(c);
    const t0 = now();
    const a = answerOffline(ctx, c.question, { via: c.via ?? 'text' });
    return scoreCase(c, a, now() - t0);
  });
}

/** Live run: the exact production path (guard → live model → verification → deterministic fallback). */
export async function runLive(list: EvalCase[]): Promise<CaseResult[]> {
  const { runLiveAgent } = await import('../src/lib/agent/live');
  const out: CaseResult[] = [];
  let i = 0;
  for (const c of list) {
    i++;
    const ctx = makeContext(c);
    const t0 = now();
    const players = Object.keys(ctx.frames[0].stats);
    const check = classifyInput(c.question, players);
    let a: AgentAnswer;
    if (check.verdict !== 'ok') {
      a = answerOffline(ctx, c.question, { via: c.via ?? 'text', startedAt: t0 });
    } else {
      try {
        const o = await runLiveAgent({ ctx, question: check.text, via: c.via ?? 'text', startedAt: t0 });
        a = 'answer' in o ? o.answer : answerOffline(ctx, c.question, { via: c.via ?? 'text', startedAt: t0, fallbackReason: o.fallback });
      } catch (err: any) {
        a = answerOffline(ctx, c.question, { via: c.via ?? 'text', startedAt: t0, fallbackReason: 'model-error' });
      }
    }
    const res = scoreCase(c, a, now() - t0);
    out.push(res);
    if (i % 10 === 0 || i === list.length) {
      console.log(`[live] progress: ${i}/${list.length} cases evaluated (last: ${c.id} ${res.pass ? 'PASS' : 'FAIL'})`);
    }
    await new Promise((r) => setTimeout(r, 400)); // be polite to rate limits
  }
  return out;
}

export async function buildReport(list: EvalCase[]) {
  console.log(`[evals] running fallback suite (${list.length} cases)...`);
  const fb = runFallback(list);
  console.log(`[evals] fallback suite completed: ${fb.filter(r => r.pass).length}/${fb.length} passed.`);
  const report: Record<string, unknown> = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    match: 'IPL 2021 RR vs PBKS (Cricsheet 1254111), replayed',
    node: typeof process !== 'undefined' ? process.version : 'unknown',
    notes: [
      'The golden cases were written by the same engineer who built the router, so a pass here is a regression guard, not proof of generalisation.',
      'During development the first run failed 16 of 74 cases (real bugs: markup injection not caught, English questions answered in Hinglish, over-broad rule regexes, captain names missing from answers, a validator sign bug). All were fixed.',
      'A stress test of 28 freshly written, untuned phrasings scored 20/28 (71%) before fixes; those phrasings were then added to this suite as regression cases (ids h01-h28).',
      'The fallback run is deterministic by construction: numeric faithfulness there verifies the templates and tools. Faithfulness of a live model is only measured in the live section.',
      'Latency here is in-process compute only (no network).',
    ],
    fallback: { summary: summarize(list, fb), cases: fb },
    live: { status: 'skipped', reason: 'No GROQ_API_KEY was set when this file was generated. Run `npx tsx evals/run.ts` with a key to fill this section.' } as unknown,
  };
  if (process.env.GROQ_API_KEY) {
    console.log('[evals] GROQ_API_KEY detected. Running live Groq suite...');
    try {
      const lv = await runLive(list);
      report.live = { status: 'ok', models: process.env.AGENT_MODELS || process.env.GROQ_AGENT_MODEL || process.env.GROQ_MODEL || 'default chain', summary: summarize(list, lv), cases: lv };
      console.log(`[evals] live suite completed: ${lv.filter(r => r.pass).length}/${lv.length} passed.`);
    } catch (e) {
      console.error('[evals] live suite error:', e);
      report.live = { status: 'error', reason: String((e as Error)?.message ?? e) };
    }
  } else {
    console.warn('[evals] No GROQ_API_KEY found, skipping live suite.');
  }
  return report;
}

export async function main() {
  const list = cases as unknown as EvalCase[];
  const report = await buildReport(list);
  const file = path.resolve(process.cwd(), 'evals', 'results.json');
  fs.writeFileSync(file, JSON.stringify(report, null, 1) + '\n');
  const s = (report.fallback as { summary: ReturnType<typeof summarize> }).summary;
  console.log(`fallback: ${s.passed}/${s.cases} passed | numeric ${s.numericFaithfulness.rate} | truth ${s.groundTruth.rate} | lang ${s.languageMatch.rate} | refusal recall ${s.refusal.recall.rate} | p50 ${s.latencyMs.p50}ms p95 ${s.latencyMs.p95}ms`);
  console.log('wrote', file);
  const failing = (report.fallback as { cases: CaseResult[] }).cases.filter((c) => !c.pass);
  for (const f of failing) console.log('FAIL', f.id, f.failed.join(','), '|', f.question.slice(0, 60), '=>', f.verdict, f.intents.join('+'), '|', f.answer.slice(0, 140));
}

// Run only when executed directly (not when imported by the vitest wrapper).
const isDirectRun =
  Boolean(process.argv[1] && /run\.ts/i.test(process.argv[1])) ||
  (typeof require !== 'undefined' && require.main === module);

if (isDirectRun) {
  void main();
}
