'use client';

import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import type { SharePayload } from '@/lib/social/payload';
import { SocialErrorBoundary } from './ErrorBoundary';
import { ShareSheet } from './ShareSheet';
import { useDefaultRankPayload, useMatchState } from './context';

interface Props {
  /** Optional. With no props the button shares the fan's rank journey at the current replay position. */
  payload?: SharePayload | null;
  label?: string;
  className?: string;
  disabled?: boolean;
}

function ShareButtonInner({ payload, label = 'Share', className = '', disabled }: Props) {
  const { ready } = useMatchState();
  const buildDefault = useDefaultRankPayload();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<SharePayload | null>(null);

  const isDisabled = disabled || (!payload && !ready);

  const onClick = () => {
    try {
      const p = payload ?? buildDefault();
      if (!p) return;
      setCurrent(p);
      setOpen(true);
    } catch (e) {
      console.warn('[pulse-social] could not build share payload', e);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        disabled={isDisabled}
        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none ${className}`}
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{label}</span>
      </button>
      <ShareSheet payload={current} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ShareButton(props: Props) {
  return (
    <SocialErrorBoundary name="Share">
      <ShareButtonInner {...props} />
    </SocialErrorBoundary>
  );
}
