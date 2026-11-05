import { NextResponse } from 'next/server';
import pkg from '../../../../package.json';
import { NUDGE_MODEL, EXPLAIN_MODEL } from '@/lib/ai/client';

/**
 * GET /api/health: is the deployment wired correctly?
 * Reports whether a Groq key is PRESENT (never the key itself). Without a key every AI feature
 * still works through deterministic templates, so `ok` stays true and `mode` says which path is live.
 */
export function GET() {
  const keyPresent = Boolean(process.env.GROQ_API_KEY);
  return NextResponse.json(
    {
      ok: true,
      app: 'pulse',
      version: pkg.version,
      keyPresent,
      mode: keyPresent ? 'ai-with-template-fallback' : 'template-only',
      model: { nudge: NUDGE_MODEL, explain: EXPLAIN_MODEL },
      time: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export function HEAD() {
  return new Response(null, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
