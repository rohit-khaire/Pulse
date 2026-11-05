import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq, EXPLAIN_MODEL } from '@/lib/ai/client';
import { ExplainRequestSchema } from '@/lib/builder/schemas';
import { getPool, loadRules } from '@/lib/builder/pool';
import { buildExplainFacts } from '@/lib/builder/explainFacts';
import { renderTemplate } from '@/lib/builder/explainTemplates';
import { validateExplainOutput } from '@/lib/builder/explainValidate';
import { explainSystemPrompt, explainUserPrompt } from '@/lib/builder/explainPrompt';

/**
 * POST /api/builder/explain
 * The server RE-COMPUTES all facts from the squad data (+ validated overrides), so the client can
 * never smuggle numbers into the whitelist. The model only narrates; any unlisted number, betting
 * word or spelled-out number makes us return the deterministic template instead.
 * Always responds 200 with { text, source: 'ai' | 'template', reason? } so the UI never breaks.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = ExplainRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
  }
  const { lang, mode, xi, c, vc, focus, overrides } = parsed.data;

  let facts;
  try {
    const rules = loadRules();
    const pool = getPool(overrides);
    facts = buildExplainFacts({
      lang, mode, xi, c, vc, pool,
      creditBudget: rules.creditBudget,
      teamSize: rules.teamSize,
      maxPerTeam: rules.maxPerTeam,
      focusName: focus,
    });
  } catch {
    return NextResponse.json({ error: 'Unknown player in team' }, { status: 400 });
  }

  const template = renderTemplate(facts);

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ text: template, source: 'template', reason: 'no_api_key' });
  }

  try {
    const result = await generateText({
      model: groq(EXPLAIN_MODEL),
      system: explainSystemPrompt(lang),
      prompt: explainUserPrompt(facts),
      temperature: 0.4,
      maxOutputTokens: 220,
      abortSignal: AbortSignal.timeout(8000),
    });
    const check = validateExplainOutput(result.text, facts);
    if (!check.valid) {
      return NextResponse.json({ text: template, source: 'template', reason: `rejected: ${check.reason}` });
    }
    return NextResponse.json({ text: check.cleaned, source: 'ai' });
  } catch {
    return NextResponse.json({ text: template, source: 'template', reason: 'model_error' });
  }
}
