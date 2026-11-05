/**
 * Share payloads: compact, validated, database-free.
 *
 * A payload is a small JSON object -> UTF-8 -> base64url, carried in the URL
 * (`/share/<payload>`, `/api/og/<kind>?p=<payload>`). Everything that arrives from a URL is
 * untrusted: we cap the size BEFORE decoding, whitelist characters, parse with try/catch,
 * validate with zod, then sanitise strings. `decodePayload` never throws.
 */

import { z } from 'zod';
import { cleanText, fmtNum, fmtSigned, type Lang } from './text';

export const PAYLOAD_VERSION = 1 as const;
/** Hard cap on the encoded string length (chars). Real payloads are ~300-700. */
export const MAX_ENCODED_CHARS = 1600;

export const EVENT_TAGS = ['WICKET', 'SIX', 'FOUR', 'MILESTONE', 'HAUL', 'MAIDEN', 'OVER_END', 'STORY'] as const;
export type EventTag = (typeof EVENT_TAGS)[number];

export const BADGE_ENUM = ['first_hit', 'hot_streak', 'crystal_ball', 'death_whisperer', 'wicket_hunter'] as const;

const LANG_ENUM = ['en', 'hinglish', 'hi'] as const;

const common = {
  v: z.literal(PAYLOAD_VERSION),
  n: z.string().max(24), // display name
  m: z.string().max(40), // match label e.g. "RR vs PBKS"
  l: z.enum(LANG_ENUM),
};

const RankSchema = z.object({
  ...common,
  k: z.literal('rank'),
  r: z.number().int().min(1).max(99), // final / current rank
  t: z.number().int().min(1).max(99), // number of teams in the league
  p: z.number().min(-500).max(5000), // fantasy points
  s: z.array(z.number().int().min(-500).max(5000)).max(32), // points sparkline
  b: z.string().max(120), // best moment text
  sim: z.boolean(), // true => league / rivals are simulated demo data
});

const MomentSchema = z.object({
  ...common,
  k: z.literal('moment'),
  h: z.string().min(1).max(100), // headline
  x: z.string().max(160), // sub line
  o: z.string().max(14), // over label "19.6"
  e: z.enum(EVENT_TAGS),
  d: z.number().min(-500).max(500).optional(), // fantasy pts swing for the fan
  sim: z.boolean(),
});

const StreakSchema = z.object({
  ...common,
  k: z.literal('streak'),
  xp: z.number().int().min(0).max(99999),
  bs: z.number().int().min(0).max(60), // best streak
  pf: z.number().int().min(0).max(60), // perfect overs
  ov: z.number().int().min(0).max(60), // overs played
  ac: z.number().int().min(0).max(100), // accuracy %
  bd: z.array(z.enum(BADGE_ENUM)).max(5),
});

export const PayloadSchema = z.discriminatedUnion('k', [RankSchema, MomentSchema, StreakSchema]);

export type RankPayload = z.infer<typeof RankSchema>;
export type MomentPayload = z.infer<typeof MomentSchema>;
export type StreakPayload = z.infer<typeof StreakSchema>;
export type SharePayload = RankPayload | MomentPayload | StreakPayload;
export type PayloadKind = SharePayload['k'];
export const PAYLOAD_KINDS: readonly PayloadKind[] = ['rank', 'moment', 'streak'] as const;

/* ------------------------------ base64url ------------------------------ */

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x2000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ------------------------------ sanitising ------------------------------ */

/** Clip every string and round every number so an over-long field can never break encoding. */
export function sanitizePayload(p: SharePayload): SharePayload {
  const base = { n: cleanText(p.n, 24) || 'Pulse fan', m: cleanText(p.m, 40), l: p.l };
  switch (p.k) {
    case 'rank':
      return {
        ...p,
        ...base,
        p: Math.round(p.p * 2) / 2,
        s: p.s.map((x) => Math.round(x)),
        b: cleanText(p.b, 120),
      };
    case 'moment':
      return {
        ...p,
        ...base,
        h: cleanText(p.h, 100) || 'Pulse moment',
        x: cleanText(p.x, 160),
        o: cleanText(p.o, 14),
        d: p.d === undefined ? undefined : Math.round(p.d * 2) / 2,
      };
    case 'streak':
      return { ...p, ...base };
  }
}

/* ------------------------------ encode / decode ------------------------------ */

export function encodePayload(payload: SharePayload): string {
  const clean = sanitizePayload(payload);
  // JSON.stringify drops `undefined` keys, keeping the URL short.
  const json = JSON.stringify(clean);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export type DecodeFailure = 'empty' | 'too_large' | 'bad_chars' | 'bad_base64' | 'bad_json' | 'bad_schema';
export type DecodeResult = { ok: true; data: SharePayload } | { ok: false; reason: DecodeFailure };

export function decodePayload(raw: unknown): DecodeResult {
  try {
    if (typeof raw !== 'string' || raw.length === 0) return { ok: false, reason: 'empty' };
    if (raw.length > MAX_ENCODED_CHARS) return { ok: false, reason: 'too_large' };
    if (!/^[A-Za-z0-9_-]+$/.test(raw)) return { ok: false, reason: 'bad_chars' };

    let text: string;
    try {
      const bytes = base64UrlToBytes(raw);
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      return { ok: false, reason: 'bad_base64' };
    }

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false, reason: 'bad_json' };
    }

    const parsed = PayloadSchema.safeParse(json);
    if (!parsed.success) return { ok: false, reason: 'bad_schema' };
    return { ok: true, data: sanitizePayload(parsed.data as SharePayload) };
  } catch {
    // Absolutely nothing escapes: a bad link must never crash a page or an image route.
    return { ok: false, reason: 'bad_json' };
  }
}

/* ------------------------------ URLs ------------------------------ */

export type OgVariant = 'wide' | 'story';

export const sharePath = (payload: SharePayload) => `/share/${encodePayload(payload)}`;

export function ogPath(payload: SharePayload, variant: OgVariant = 'wide'): string {
  const q = new URLSearchParams({ p: encodePayload(payload) });
  if (variant === 'story') q.set('v', 'story');
  return `/api/og/${payload.k}?${q.toString()}`;
}

/** Site origin for absolute URLs in metadata (server). Set NEXT_PUBLIC_SITE_URL in production. */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && /^https?:\/\//.test(explicit)) return explicit.replace(/\/+$/, '');
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod.replace(/^https?:\/\//, '')}`;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}`;
  return 'http://localhost:3000';
}

/* ------------------------------ copy ------------------------------ */

const DISCLAIMER: Record<Lang, string> = {
  en: 'Entertainment only. Replay of a past match with demo friends.',
  hinglish: 'Sirf entertainment. Purane match ka replay, demo friends ke saath.',
  hi: 'सिर्फ़ मनोरंजन। पुराने मैच का रीप्ले, डेमो दोस्तों के साथ।',
};

export function disclaimer(lang: Lang): string {
  return DISCLAIMER[lang];
}

function ordinal(n: number): string {
  return `#${n}`;
}

/** Plain-language caption used for WhatsApp / native share. Numbers come ONLY from the payload. */
export function shareCaption(p: SharePayload): string {
  const who = p.n;
  switch (p.k) {
    case 'rank': {
      const lines: Record<Lang, string> = {
        en: `${who} is ${ordinal(p.r)} of ${p.t} in the Pulse mini-league with ${fmtNum(p.p)} pts.`,
        hinglish: `${who} Pulse mini-league mein ${p.t} mein se ${ordinal(p.r)} par hai, ${fmtNum(p.p)} pts ke saath.`,
        hi: `${who} Pulse मिनी-लीग में ${p.t} में से ${ordinal(p.r)} पर हैं, ${fmtNum(p.p)} पॉइंट्स के साथ।`,
      };
      return `${lines[p.l]}${p.sim ? ' (demo friends)' : ''}`;
    }
    case 'moment': {
      const swing = p.d !== undefined && p.d !== 0 ? ` (${fmtSigned(p.d)} pts)` : '';
      return `${p.h}${swing}`;
    }
    case 'streak': {
      const lines: Record<Lang, string> = {
        en: `${who} scored ${p.xp} XP on Pulse Over Predictor: best streak ${p.bs}, ${p.pf} perfect overs.`,
        hinglish: `${who} ne Pulse Over Predictor mein ${p.xp} XP banaye: best streak ${p.bs}, ${p.pf} perfect over.`,
        hi: `${who} ने Pulse Over Predictor में ${p.xp} XP बनाए: बेस्ट स्ट्रीक ${p.bs}, ${p.pf} परफेक्ट ओवर।`,
      };
      return lines[p.l];
    }
  }
}

export function pageTitle(p: SharePayload): string {
  switch (p.k) {
    case 'rank':
      return `${p.n} is ${ordinal(p.r)} of ${p.t} on Pulse`;
    case 'moment':
      return `${p.h} · Pulse`;
    case 'streak':
      return `${p.n}: ${p.xp} XP on Pulse Over Predictor`;
  }
}
