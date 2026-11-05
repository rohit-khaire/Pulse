import { NextRequest } from 'next/server';
import { z } from 'zod';
import { buildAgentContext } from '@/lib/agent/context';
import { getServerTimeline } from '@/lib/agent/server-match';
import { answerOffline } from '@/lib/agent/router';
import { runLiveAgent } from '@/lib/agent/live';
import { classifyInput } from '@/lib/agent/guard';
import { getSuggestedQuestions } from '@/lib/agent/suggestions';
import { encodeEvent, AgentEvent } from '@/lib/agent/protocol';
import { resolveReplyLang } from '@/lib/agent/lang';
import { refusalText } from '@/lib/agent/templates';
import type { AgentAnswer } from '@/lib/agent/types';

const BodySchema = z.object({
  question: z.string().max(2000),
  lang: z.enum(['en', 'hinglish', 'hi']).default('hinglish'),
  via: z.enum(['text', 'voice']).default('text'),
  cursor: z.number().int().min(0).max(100000).default(0),
  team: z.unknown().optional(),
  history: z.array(z.string().max(2000)).max(6).optional(),
  /** Demo switch: force the deterministic path even when a key is configured. */
  offline: z.boolean().optional(),
});

const now = () => performance.now();

export async function POST(req: NextRequest) {
  const startedAt = now();
  let body: z.infer<typeof BodySchema>;
  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    body = parsed.data;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: AgentEvent) => controller.enqueue(enc.encode(encodeEvent(e)));
      try {
        const { frames, config } = getServerTimeline();
        const ctx = buildAgentContext({ frames, config, cursor: body.cursor, team: body.team, lang: body.lang });
        const players = Object.keys(frames[0]?.stats ?? {});
        const atLabel = frames[ctx.cursor]?.scoreLine ?? '';
        const check = classifyInput(body.question, players);

        const finalize = (a: AgentAnswer) =>
          send({
            t: 'final',
            text: a.text,
            source: a.source,
            verdict: a.verdict,
            intents: a.intents,
            replyLang: a.replyLang,
            tools: a.tools.map((t) => ({ name: t.name, args: t.args })),
            numbersChecked: a.numbersChecked,
            numbersAllowed: a.numbersAllowed,
            metrics: a.metrics,
            atLabel,
          });

        // Refusals never reach the model: injection / betting / off-topic text is not sent upstream.
        if (check.verdict !== 'ok') {
          send({ t: 'meta', mode: 'offline' });
          finalize(answerOffline(ctx, body.question, { via: body.via, startedAt }));
          return;
        }

        const key = process.env.GROQ_API_KEY;
        if (!key || body.offline) {
          send({ t: 'meta', mode: 'offline' });
          finalize(answerOffline(ctx, body.question, { via: body.via, startedAt, fallbackReason: body.offline ? 'offline-forced' : 'no-api-key' }));
          return;
        }

        const outcome = await runLiveAgent({ ctx, question: check.text, via: body.via, history: body.history, emit: send, startedAt });
        if ('answer' in outcome) {
          finalize(outcome.answer);
        } else {
          const det = answerOffline(ctx, body.question, { via: body.via, startedAt, fallbackReason: outcome.fallback });
          send({ t: 'replace', text: det.text, reason: outcome.fallback });
          finalize(det);
        }
      } catch (err) {
        // Last resort: never leave the fan with a dead stream.
        const lang = body.lang;
        const rl = resolveReplyLang(body.question, lang, body.via);
        send({
          t: 'final',
          text: refusalText('empty', rl),
          source: 'guard',
          verdict: 'ok',
          intents: ['UNKNOWN'],
          replyLang: rl,
          tools: [],
          numbersChecked: 0,
          numbersAllowed: 0,
          metrics: { ttftMs: 0, totalMs: Math.round(now() - startedAt), fallbackReason: 'route-error' },
          atLabel: '',
        });
        console.error('agent route error', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store, no-transform', 'X-Accel-Buffering': 'no' },
  });
}

/** Suggested question chips for the current moment (cheap, deterministic). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lang = (['en', 'hinglish', 'hi'] as const).find((l) => l === url.searchParams.get('lang')) ?? 'hinglish';
  const { frames, config } = getServerTimeline();
  const ctx = buildAgentContext({ frames, config, cursor: Number(url.searchParams.get('cursor')) || 0, team: undefined, lang });
  return Response.json({ chips: getSuggestedQuestions(ctx) }, { headers: { 'Cache-Control': 'no-store' } });
}
