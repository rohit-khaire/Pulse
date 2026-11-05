import { createGroq } from '@ai-sdk/groq';
import { DEFAULT_PRIMARY } from '../agent/models';

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const NUDGE_MODEL = process.env.GROQ_NUDGE_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
export const EXPLAIN_MODEL = process.env.GROQ_EXPLAIN_MODEL || process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
