import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { decodePayload, encodePayload, ogPath, pageTitle, shareCaption, siteOrigin, disclaimer } from '@/lib/social/payload';
import { SAMPLE_PAYLOADS } from '@/lib/social/samples';
import { ShareActions } from './Actions';

type Props = { params: Promise<{ payload: string }> };

/** Sample token lets build-time validation run without exceeding Windows file path limits. */
export function generateStaticParams() {
  return [{ payload: 'eyJ2IjoxLCJrIjoicHJlZGljdCIsIm4iOiJBIiwibSI6IkIiLCJsIjoiZW4iLCJ4cCI6MTAsInN0IjoxLCJiIjoiaG90X3N0cmVhayJ9' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { payload } = await params;
  const decoded = decodePayload(payload);
  const origin = siteOrigin();
  if (!decoded.ok) {
    return {
      title: 'Pulse',
      robots: { index: false, follow: false },
      openGraph: { images: [{ url: `${origin}/api/og/brand`, width: 1200, height: 630 }] },
    };
  }
  const p = decoded.data;
  const title = pageTitle(p);
  const description = `${shareCaption(p)} ${disclaimer(p.l)}`;
  const image = `${origin}${ogPath(p)}`;
  return {
    metadataBase: new URL(origin),
    title,
    description,
    robots: { index: false, follow: false }, // personal cards: shareable, not indexable
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: 'Pulse',
      images: [{ url: image, width: 1200, height: 630, alt: shareCaption(p) }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

async function SharedCard({ params }: Props) {
  const { payload } = await params;
  const decoded = decodePayload(payload);
  if (!decoded.ok) notFound();
  const p = decoded.data;
  return (
    <main className="max-w-md mx-auto w-full px-4 py-6 flex-1 flex flex-col justify-center space-y-4">
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ogPath(p)} alt={shareCaption(p)} width={1200} height={630} className="w-full h-auto" />
      </div>
      <p className="text-sm text-slate-200 text-center leading-snug">{shareCaption(p)}</p>
      <ShareActions payload={p} />
      <p className="text-[11px] text-slate-500 text-center">{disclaimer(p.l)}</p>
    </main>
  );
}

export default function SharePage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="max-w-md mx-auto w-full px-4 py-6">
          <div className="aspect-[1200/630] rounded-2xl bg-slate-900 animate-pulse" />
        </main>
      }
    >
      <SharedCard params={params} />
    </Suspense>
  );
}
