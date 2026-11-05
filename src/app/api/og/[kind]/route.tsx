import { ImageResponse } from 'next/og';
import { decodePayload, PAYLOAD_KINDS, type PayloadKind } from '@/lib/social/payload';
import { CARD_SIZE, renderCard, type CardVariant } from '@/lib/social/og/cards';
import { ogFonts } from '@/lib/social/og/fonts';

/**
 * GET /api/og/<rank|moment|streak|brand>?p=<base64url payload>&v=story
 *
 * - 1200x630 by default, `v=story` gives the 9:16 (1080x1920) variant.
 * - Fonts are embedded (no network at runtime). No emoji, no remote images.
 * - The image is a pure function of the URL, so it is cached as immutable.
 * - Bad / oversized / mismatched payloads get a plain 400, never a crash.
 */
export async function GET(request: Request, ctx: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await ctx.params;
    const url = new URL(request.url);
    const variant: CardVariant = url.searchParams.get('v') === 'story' ? 'story' : 'wide';
    const { width, height } = CARD_SIZE[variant];

    let payload = null;
    if (kind !== 'brand') {
      if (!(PAYLOAD_KINDS as readonly string[]).includes(kind)) {
        return new Response('Unknown card kind', { status: 404 });
      }
      const decoded = decodePayload(url.searchParams.get('p'));
      if (!decoded.ok) {
        return Response.json({ error: 'invalid_payload', reason: decoded.reason }, { status: 400 });
      }
      if (decoded.data.k !== (kind as PayloadKind)) {
        return Response.json({ error: 'kind_mismatch' }, { status: 400 });
      }
      payload = decoded.data;
    }

    return new ImageResponse(renderCard(payload, variant), {
      width,
      height,
      fonts: ogFonts(),
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (err) {
    console.error('[og] render failed', err);
    return new Response('Could not render card', { status: 500 });
  }
}
