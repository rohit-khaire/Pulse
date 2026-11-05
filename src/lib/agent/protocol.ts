/** NDJSON event protocol between /api/agent and the Ask Pulse UI. One JSON object per line. */
import type { AnswerMetrics, Intent, Lang, Verdict } from './types';

export type AgentEvent =
  | { t: 'meta'; mode: 'live' | 'offline'; model?: string }
  | { t: 'tool'; name: string; args: Record<string, unknown> }
  | { t: 'tool_done'; name: string; ms: number }
  /** A sentence whose numbers were verified against tool results. */
  | { t: 'delta'; text: string }
  /** Everything shown so far is replaced (guard tripped, deterministic answer served). */
  | { t: 'replace'; text: string; reason: string }
  | {
      t: 'final';
      text: string;
      source: 'ai' | 'template' | 'guard';
      verdict: Verdict;
      intents: Intent[];
      replyLang: Lang;
      tools: { name: string; args: Record<string, unknown> }[];
      numbersChecked: number;
      numbersAllowed: number;
      metrics: AnswerMetrics;
      atLabel: string;
    };

export function encodeEvent(e: AgentEvent): string {
  return JSON.stringify(e) + '\n';
}

/** Incrementally parse NDJSON text chunks into events. */
export function createNdjsonParser(onEvent: (e: AgentEvent) => void) {
  let buf = '';
  return (chunk: string, done = false) => {
    buf += chunk;
    const lines = buf.split('\n');
    buf = done ? '' : lines.pop() ?? '';
    for (const line of done ? lines.concat(buf ? [buf] : []) : lines) {
      if (!line.trim()) continue;
      try {
        onEvent(JSON.parse(line) as AgentEvent);
      } catch {
        /* ignore a corrupt line */
      }
    }
  };
}
