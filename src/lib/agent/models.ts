/** Model fallback chain, configured by env vars (no code change needed to swap models). */
export const DEFAULT_PRIMARY = 'openai/gpt-oss-120b';
export const DEFAULT_FALLBACKS = ['openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];

export function getModelChain(env: Record<string, string | undefined> = process.env): string[] {
  const explicit = (env.AGENT_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean);
  const chain = explicit.length ? explicit : [env.GROQ_AGENT_MODEL || env.GROQ_MODEL || DEFAULT_PRIMARY, ...DEFAULT_FALLBACKS];
  return [...new Set(chain)].slice(0, 3);
}

/** Abort an attempt if the model has produced nothing at all within this time. */
export function getFirstTokenTimeoutMs(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.AGENT_TTFT_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 500 ? n : 6000;
}
