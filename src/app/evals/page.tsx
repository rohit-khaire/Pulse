import Link from 'next/link';
import { ArrowLeft, FlaskConical, ShieldCheck, Gauge, Languages, Ban, Target } from 'lucide-react';
import results from '../../../evals/results.json';
import type { CaseResult, EvalSummary } from '../../../evals/harness';
import { EvalsTour } from './EvalsTour';

export const metadata = {
  title: 'How Pulse tests its AI',
  description: 'Evaluation scorecard for Ask Pulse: numeric faithfulness, refusals, language match and latency.',
};

interface Section {
  summary: EvalSummary;
  cases: CaseResult[];
}
interface LiveSection extends Partial<Section> {
  status: 'ok' | 'skipped' | 'error';
  reason?: string;
  models?: string;
}
interface Report {
  generatedAt: string;
  match: string;
  node?: string;
  notes?: string[];
  fallback: Section;
  live: LiveSection;
}

const report = results as unknown as Report;
const pct = (r: { rate: number }) => `${Math.round(r.rate * 1000) / 10}%`;
const frac = (r: { pass: number; total: number }) => `${r.pass}/${r.total}`;

const CATEGORY_LABEL: Record<string, string> = {
  factual: 'Factual (points, rank, wickets…)',
  multi_step: 'Multi-step (two tools)',
  adversarial: 'Adversarial (injection, spoofed facts)',
  betting: 'Betting / money / guarantees',
  offtopic: 'Off-topic',
  edge: 'Edge cases',
};

function Stat({ icon, label, value, sub, good = true }: { icon: React.ReactNode; label: string; value: string; sub: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-black ${good ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</div>
      <div className="mt-0.5 text-[10px] leading-snug text-slate-500">{sub}</div>
    </div>
  );
}

function Bar({ label, r }: { label: string; r: { pass: number; total: number; rate: number } }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span className="font-mono text-slate-400">{frac(r)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${r.rate === 1 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${r.rate * 100}%` }} />
      </div>
    </div>
  );
}

function Scorecard({ title, tag, data }: { title: string; tag: string; data: Section }) {
  const s = data.summary;
  const failing = data.cases.filter((c) => !c.pass);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-white">{title}</h2>
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-400">{tag}</span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon={<Target className="h-3 w-3" />} label="Cases passed" value={`${s.passed}/${s.cases}`} sub={`${pct(s.passRate)} of golden cases`} good={s.passRate.rate === 1} />
        <div data-tour="evals-numbers">
          <Stat icon={<ShieldCheck className="h-3 w-3" />} label="Numeric faithfulness" value={pct(s.numericFaithfulness)} sub="every number in a reply exists in that request's tool results" good={s.numericFaithfulness.rate === 1} />
        </div>
        <Stat icon={<Target className="h-3 w-3" />} label="Ground-truth recall" value={pct(s.groundTruth)} sub={`${frac(s.groundTruth)} required facts matched an independent engine recompute`} good={s.groundTruth.rate === 1} />
        <Stat icon={<Languages className="h-3 w-3" />} label="Language match" value={pct(s.languageMatch)} sub="reply is in the expected English / Hinglish / Hindi" good={s.languageMatch.rate >= 0.98} />
        <div data-tour="evals-guardrails">
          <Stat icon={<Ban className="h-3 w-3" />} label="Refusal recall" value={pct(s.refusal.recall)} sub={`${frac(s.refusal.recall)} betting, injection and off-topic asks redirected`} good={s.refusal.recall.rate === 1} />
        </div>
        <Stat icon={<Ban className="h-3 w-3" />} label="False refusals" value={`${s.refusal.falseRefusals.total - s.refusal.falseRefusals.pass}`} sub={`of ${s.refusal.falseRefusals.total} normal questions wrongly refused`} good={s.refusal.falseRefusals.rate === 1} />
        <Stat icon={<Gauge className="h-3 w-3" />} label="Latency p50 / p95" value={`${s.latencyMs.p50} / ${s.latencyMs.p95} ms`} sub={`max ${s.latencyMs.max} ms, mean ${s.latencyMs.mean} ms per request`} />
        <Stat icon={<ShieldCheck className="h-3 w-3" />} label="Prompt leaks" value={String(s.injectionLeaks)} sub="adversarial cases where the prompt canary or a planted claim leaked" good={s.injectionLeaks === 0} />
      </div>

      {s.ttftMs && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-300">
          Live model time-to-first-token: p50 <b>{s.ttftMs.p50} ms</b>, p95 <b>{s.ttftMs.p95} ms</b> · {s.aiAnswers} answers came from the model (the rest were safely replaced by the deterministic engine).
        </div>
      )}

      <div className="space-y-2.5 rounded-2xl border border-slate-800 bg-slate-900 p-3.5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">By category</h3>
        {Object.entries(s.byCategory).map(([k, v]) => (
          <Bar key={k} label={CATEGORY_LABEL[k] ?? k} r={v} />
        ))}
      </div>

      {failing.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3.5">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Failing cases ({failing.length})</h3>
          {failing.map((f) => (
            <div key={f.id} className="text-[11px] leading-snug text-slate-300">
              <span className="font-mono text-amber-300">{f.id}</span> {f.question.slice(0, 80)} <span className="text-slate-500">→ failed: {f.failed.join(', ')}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-[11px] text-emerald-300">No failing cases in this run.</div>
      )}

      <details className="rounded-2xl border border-slate-800 bg-slate-900">
        <summary className="cursor-pointer select-none p-3.5 text-xs font-bold text-slate-200">All {data.cases.length} cases and the exact replies</summary>
        <ul className="divide-y divide-slate-800 border-t border-slate-800">
          {data.cases.map((c) => (
            <li key={c.id} className="space-y-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold text-slate-200">{c.question.trim() ? c.question.slice(0, 110) : '(empty input)'}</p>
                <span className={`shrink-0 rounded px-1.5 py-px text-[9px] font-bold ${c.pass ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{c.pass ? 'PASS' : 'FAIL'}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {c.id} · {c.category} · UI {c.ui} · {c.verdict}
                {c.intents.length ? ` · ${c.intents.join('+')}` : ''} · {c.ms} ms
              </p>
              <p className="text-[11px] leading-snug text-slate-400">{c.answer.slice(0, 320)}</p>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default function EvalsPage() {
  const live = report.live;
  return (
    <main className="mx-auto min-h-screen max-w-md space-y-5 bg-slate-950 px-4 pb-16 pt-5 text-white">
      <div>
        <Link href="/" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Pulse
        </Link>
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-red-400" />
          <h1 className="text-xl font-black">How Pulse tests its AI</h1>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          Ask Pulse answers fan questions in Hinglish, Hindi and English. Every number it shows must come from unit-tested engine code, so we measure that, along with refusals, language and speed, on a fixed set of golden questions. Rerun any time with{' '}
          <code className="rounded bg-slate-800 px-1 py-px text-[10px] text-slate-200">npx tsx evals/run.ts</code>.
        </p>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Generated {new Date(report.generatedAt).toUTCString()} · {report.match}
        </p>
      </div>

      <Scorecard title="Offline engine (no API key)" tag="deterministic" data={report.fallback} />

      <section data-tour="evals-live" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-white">Live model (Groq)</h2>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-400">{live.status}</span>
        </div>
        {live.status === 'ok' && live.summary && live.cases ? (
          <Scorecard title={`Models: ${live.models ?? ''}`} tag="live" data={{ summary: live.summary, cases: live.cases }} />
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-xs leading-relaxed text-slate-300">
            <b className="text-white">Not run yet.</b> {live.reason ?? 'A live run needs GROQ_API_KEY.'} We show this honestly rather than quote numbers we have not measured.
          </div>
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-3.5">
        <h2 className="text-sm font-extrabold text-white">What these numbers do and do not prove</h2>
        <ul className="list-disc space-y-1.5 pl-4 text-[11px] leading-relaxed text-slate-400">
          {(report.notes ?? []).map((n, i) => (
            <li key={i}>{n}</li>
          ))}
          <li>The league, rivals and ownership are demo data, and the match is a replay of a real IPL game, not a live feed.</li>
          <li>Pulse is entertainment and explanation. It refuses betting, money and guaranteed-win questions and never predicts results.</li>
        </ul>
      </section>

      <EvalsTour />
    </main>
  );
}
