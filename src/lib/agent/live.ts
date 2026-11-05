/**
 * Live (Groq) agent: multi-step tool calling with sentence-level number verification and a model fallback chain.
 * Returns null whenever the deterministic router should answer instead. Server only.
 */
import { buildSystemPrompt, buildUserMessage } from './prompts';
import { StreamingAnswerGuard, classifyInput, looksLikeInjection, validateAnswer } from './guard';
import { collectNumbers, extractNumbers } from './numbers';
import { getFirstTokenTimeoutMs, getModelChain } from './models';
import { createAgentTools } from './tools';
import { planQuestion } from './router';
import { resolveReplyLang } from './lang';
import type { AgentAnswer, AgentContext, Intent, ToolCallRecord } from './types';
import type { AgentEvent } from './protocol';

/* eslint-disable @typescript-eslint/no-explicit-any */
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export interface LiveOptions {
  ctx: AgentContext;
  /** Already sanitised and classified verdict === 'ok'. */
  question: string;
  via?: 'text' | 'voice';
  /** Previous user questions only (never assistant text, which the client could forge). */
  history?: string[];
  emit?: (e: AgentEvent) => void;
  startedAt?: number;
}

export type LiveOutcome = { answer: AgentAnswer } | { fallback: string; modelTried?: string };

/** Intents for which a grounded answer must have used at least one tool. */
const NEEDS_TOOL = new Set<Intent>(['MATCH_STATE', 'TEAM_POINTS', 'PLAYER', 'RANK_GAP', 'PATH', 'DISMISSAL', 'CATCHUP', 'WHATIF', 'RULES']);

export async function runLiveAgent(opts: LiveOptions): Promise<LiveOutcome> {
  const { ctx, question, emit } = opts;
  const t0 = opts.startedAt ?? now();
  const replyLang = resolveReplyLang(question, ctx.lang, opts.via ?? 'text');
  const plan = planQuestion(question, ctx);
  const needsTool = plan.some((p) => NEEDS_TOOL.has(p.intent));

  const history = (opts.history ?? [])
    .map((h) => classifyInput(h, Object.keys(ctx.frames[0]?.stats ?? {})))
    .filter((c) => c.verdict === 'ok' && !looksLikeInjection(c.text))
    .slice(-2)
    .map((c) => c.text);

  const models = getModelChain();
  let lastError = 'no-model';
  let ai: any;
  try {
    ai = await import('ai');
    if (typeof ai.streamText !== 'function') throw new Error('streamText missing');
  } catch (e) {
    return { fallback: 'ai-sdk-unavailable' };
  }
  const { groq } = await import('../ai/client');

  for (const modelId of models.slice(0, 2)) {
    const calls: ToolCallRecord[] = [];
    const allowed = () => collectNumbers(calls.map((c) => c.result));
    const guard = new StreamingAnswerGuard(allowed, replyLang);
    const controller = new AbortController();
    let firstTokenAt: number | null = null;
    let firstTokenTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => controller.abort(), getFirstTokenTimeoutMs());
    let stepText = '';
    let streamedAny = false;

    try {
      emit?.({ t: 'meta', mode: 'live', model: modelId });
      const tools = await createAgentTools(ctx, calls, {
        onCall: (name, args) => emit?.({ t: 'tool', name, args }),
        onDone: (name, ms) => emit?.({ t: 'tool_done', name, ms }),
      });
      const messages = [
        ...history.map((h) => ({ role: 'user', content: buildUserMessage(h) })),
        { role: 'user', content: buildUserMessage(question) },
      ];
      // Only the final answer step is streamed to the fan, and only after tool results exist.
      const result = ai.streamText({
        model: groq(modelId),
        system: buildSystemPrompt(replyLang),
        messages,
        tools,
        stopWhen: ai.stepCountIs(6),
        temperature: 0.2,
        maxOutputTokens: 300,
        abortSignal: controller.signal,
      });

      for await (const part of result.fullStream as AsyncIterable<any>) {
        const type = part?.type;
        if (type === 'error') throw part.error ?? new Error('stream error');
        if (firstTokenAt === null && (type === 'text-delta' || type === 'tool-call' || type === 'tool-input-start')) {
          firstTokenAt = now();
          if (firstTokenTimer) clearTimeout(firstTokenTimer);
          firstTokenTimer = null;
        }
        if (type === 'tool-call' || type === 'tool-input-start' || type === 'start-step') {
          // Any text before a tool call was preamble, not the answer.
          stepText = '';
        }
        if (type === 'text-delta') {
          const delta: string = part.text ?? part.textDelta ?? part.delta ?? '';
          stepText += delta;
          if (calls.length > 0) {
            for (const sentence of guard.push(delta)) {
              streamedAny = true;
              emit?.({ t: 'delta', text: sentence });
            }
            if (guard.violation) {
              controller.abort();
              break;
            }
          }
        }
      }
      if (firstTokenTimer) clearTimeout(firstTokenTimer);

      if (guard.violation) return { fallback: `guard:${guard.violation}`, modelTried: modelId };
      for (const sentence of guard.flush()) {
        streamedAny = true;
        emit?.({ t: 'delta', text: sentence });
      }
      if (guard.violation) return { fallback: `guard:${guard.violation}`, modelTried: modelId };

      // Authoritative check on the complete final-step text.
      const check = validateAnswer(stepText, { allowed: allowed(), lang: replyLang });
      if (!check.ok) return { fallback: `final-check:${check.reasons.join('|')}`, modelTried: modelId };
      if (needsTool && calls.length === 0) return { fallback: 'ungrounded:no-tool-call', modelTried: modelId };
      void streamedAny;

      const total = Math.round((now() - t0) * 10) / 10;
      const ttft = Math.round(((firstTokenAt ?? now()) - t0) * 10) / 10;
      return {
        answer: {
          text: check.text,
          verdict: 'ok',
          intents: plan.map((p) => p.intent),
          replyLang,
          source: 'ai',
          tools: calls,
          numbersChecked: extractNumbers(check.text).length,
          numbersAllowed: allowed().size,
          metrics: { ttftMs: ttft, totalMs: total, model: modelId },
        },
      };
    } catch (e: any) {
      if (firstTokenTimer) clearTimeout(firstTokenTimer);
      lastError = controller.signal.aborted ? `timeout:${modelId}` : `error:${modelId}:${String(e?.message ?? e).slice(0, 80)}`;
      // provider/timeouts: try the next model in the chain
      continue;
    }
  }
  return { fallback: lastError };
}
