import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { groq, NUDGE_MODEL } from '@/lib/ai/client';
import { banterSystemPrompt, banterUserPrompt, chooseBanter, templateBanter } from '@/lib/social/banter';

/**
 * POST /api/og/banter  (optional AI banter for the Friend Contest)
 *
 * Lives under api/og only because that is the one API namespace the social stream owns;
 * the integrator may move it. The model receives ONLY structured facts; its line is accepted
 * only if `validateBanter` passes (no unknown numbers, no abuse, no betting language),
 * otherwise (or with no GROQ_API_KEY, or on any error) the deterministic template is returned.
 */
const Body = z.object({
  lang: z.enum(['en', 'hinglish', 'hi']),
  facts: z.object({
    kind: z.enum(['overtaken', 'overtook', 'took_lead', 'lost_lead']),
    rival: z.string().min(1).max(16),
    gap: z.number().min(0).max(5000),
    youRank: z.number().int().min(1).max(99),
    rivalRank: z.number().int().min(1).max(99),
    teams: z.number().int().min(1).max(99),
    over: z.string().max(8),
  }),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const { facts, lang } = body;
  const fallback = { text: templateBanter(facts, lang), source: 'template' as const };

  if (!process.env.GROQ_API_KEY) return NextResponse.json(fallback);
  try {
    const result = await generateText({
      model: groq(NUDGE_MODEL),
      system: banterSystemPrompt(lang),
      prompt: banterUserPrompt(facts),
      temperature: 0.8,
      maxOutputTokens: 80,
    });
    return NextResponse.json(chooseBanter(facts, lang, result.text));
  } catch (err) {
    console.warn('[banter] AI failed, using template', err);
    return NextResponse.json(fallback);
  }
}
