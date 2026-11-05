import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { streamText } from 'ai';
import { groq, EXPLAIN_MODEL } from '@/lib/ai/client';
import { EXPLAIN_SYSTEM_PROMPT } from '@/lib/ai/prompts';

const ExplainRequestSchema = z.object({
  lang: z.enum(['en', 'hinglish', 'hi']).default('hinglish'),
  question: z.string().max(250),
  context: z.object({
    scoreLine: z.string().optional(),
    over: z.string().optional(),
    lastBalls: z.array(z.string()).optional(),
    myPlayersAtCrease: z.array(z.string()).optional(),
    userRank: z.number().optional(),
    userPoints: z.number().optional(),
    gapToLeader: z.number().optional(),
    leaderName: z.string().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExplainRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { lang, question, context } = parsed.data;

    if (!process.env.GROQ_API_KEY) {
      return new Response(
        'Offline mode: Samjhao AI requires internet and API key. Please check your connection.',
        { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }

    const langInstruction =
      lang === 'hinglish'
        ? 'Reply in natural, encouraging Hinglish (Hindi written in Roman English alphabet with natural cricket terms).'
        : lang === 'hi'
        ? 'Reply in clear Hindi (Devanagari script).'
        : 'Reply in clear, engaging English.';

    const contextStr = context
      ? `Current match state: Score: ${context.scoreLine || 'N/A'}, Overs: ${
          context.over || 'N/A'
        }, Recent balls: ${(context.lastBalls || []).join(' ')}, Fantasy players at crease: ${(
          context.myPlayersAtCrease || []
        ).join(', ') || 'None'}, User Rank: #${context.userRank || 1}, User Points: ${
          context.userPoints || 0
        }, Gap to Leader (${context.leaderName || 'Leader'}): ${
          context.gapToLeader !== undefined ? context.gapToLeader : 'N/A'
        } pts`
      : 'No match context provided.';

    const userPrompt = `Match & Fantasy Context:
${contextStr}

Fan Question:
"${question}"

Instruction:
${langInstruction} Answer directly, warmly and briefly in under 80 words. If the fan asks whether they can win or what they need, use the gap and context to give them concrete encouragement. Strictly cricket and fantasy points explanation only.`;

    const result = streamText({
      model: groq(EXPLAIN_MODEL),
      system: EXPLAIN_SYSTEM_PROMPT,
      prompt: userPrompt,
      temperature: 0.6,
      maxOutputTokens: 180,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(6000),
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('Explain route error:', error);
    return new Response(
      'Thoda error ho gaya, kripya dobara poochhein! (Unable to process question)',
      { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }
}
