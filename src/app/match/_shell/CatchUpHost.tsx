'use client';
import React from 'react';
import { usePulseStore } from '@/lib/store';
import { CatchUpModal } from '@/components/CatchUpModal';

export function CatchUpHost() {
  const open = usePulseStore((s) => s.openModal === 'catchup');
  const close = usePulseStore((s) => s.closeModal);
  return <CatchUpModal isOpen={open} onClose={close} />;
}
