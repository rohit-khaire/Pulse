'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { ShareButton } from '@/components/social/ShareButton';
import type { SharePayload } from '@/lib/social/payload';

export function ShareActions({ payload }: { payload: SharePayload }) {
  return (
    <div className="flex items-center justify-center space-x-2">
      <Link
        href="/match"
        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
      >
        <Play className="w-3.5 h-3.5 fill-current" />
        <span>Play along on Pulse</span>
      </Link>
      <ShareButton payload={payload} label="Share" />
    </div>
  );
}
