import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateText } from 'ai';
import { groq, NUDGE_MODEL } from '@/lib/ai/client';
import { getNudgeSystemPrompt, buildNudgeUserPrompt } from '@/lib/ai/prompts';
import { validateNudgeOutput } from '@/lib/ai/validate';
import { getTemplateNudge } from '@/lib/ai/templates';
import { NudgeFacts } from '@/lib/engine/types';

const NudgeRequestSchema = z.object({
  matchId: z.string().optional().default('1254111'),
  frameIndex: z.number(),
  teamHash: z.string().optional(),
  facts: z.object({
    lang: z.enum(['en', 'hinglish', 'hi']),
    event: z.object({
      type: z.string(),
      over: z.string(),
      scoreLine: z.string(),
      summary: z.string(),
    }),
    impacts: z.array(
      z.object({
        player: z.string(),
        role: z.enum(['C', 'VC', '-']),
        basePts: z.number(),
        multiplier: z.number(),
        delta: z.number(),
        why: z.array(z.string()),
      })
    ),
    team: z.object({
      before: z.number(),
      after: z.number(),
      rankBefore: z.number().optional(),
      rankAfter: z.number().optional(),
    }),
    rootFor: z.array(z.string()).optional(),
  }),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let facts: NudgeFacts | null = null;

  try {
    const body = await req.json();
    const parsed = NudgeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.issues },
        { status: 400 }
      );
    }

    facts = parsed.data.facts as NudgeFacts;

    // Check if GROQ_API_KEY is available
    if (!process.env.GROQ_API_KEY) {
      const templateText = getTemplateNudge(facts);
      return NextResponse.json({
        text: templateText,
        source: 'template',
        latencyMs: Date.now() - startTime,
      });
    }

    // Call Groq AI with resilience chain
    const systemPrompt = getNudgeSystemPrompt(facts.lang);
    const userPrompt = buildNudgeUserPrompt(facts);

    const modelsToTry = [
      NUDGE_MODEL,
      ...(NUDGE_MODEL !== 'openai/gpt-oss-20b' ? ['openai/gpt-oss-20b'] : []),
      'qwen/qwen3.8-27b',
    ];

    let aiText = '';
    for (const modelId of modelsToTry) {
      try {
        const result = await generateText({
          model: groq(modelId),
          system: systemPrompt,
          prompt: userPrompt,
          temperature: 0.7,
          maxOutputTokens: 100,
          maxRetries: 0, // Fail fast on rate limits; never block or hang replay pacing
          abortSignal: AbortSignal.timeout(4000),
        });
        aiText = result.text.trim();
        if (aiText) break;
      } catch (err: any) {
        const isRateLimit =
          err?.statusCode === 429 ||
          err?.message?.includes('Rate limit') ||
          err?.data?.error?.code === 'rate_limit_exceeded';
        if (isRateLimit) {
          console.info(`[nudge] Model ${modelId} reached TPM rate limit, trying fallback model...`);
        }
      }
    }

    if (aiText) {
      const validation = validateNudgeOutput(aiText, facts);
      if (validation.valid) {
        return NextResponse.json({
          text: aiText,
          source: 'ai',
          latencyMs: Date.now() - startTime,
        });
      } else {
        console.warn('AI output rejected by validator:', validation.reason, 'Output:', aiText);
      }
    }

    // Deterministic instant template fallback
    const fallback = getTemplateNudge(facts);
    return NextResponse.json({
      text: fallback,
      source: 'template',
      latencyMs: Date.now() - startTime,
    });
  } catch (error: any) {
    const isRateLimit =
      error?.statusCode === 429 ||
      error?.message?.includes('Rate limit') ||
      error?.data?.error?.code === 'rate_limit_exceeded';

    if (isRateLimit) {
      console.info('[nudge] Groq TPM limit reached, cleanly serving verified template nudge.');
    } else {
      console.warn('[nudge] Nudge generation failed, falling back to template:', error?.message || error);
    }

    if (facts) {
      const fallback = getTemplateNudge(facts);
      return NextResponse.json({
        text: fallback,
        source: 'template',
        latencyMs: Date.now() - startTime,
      });
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

