'use client';
import React from 'react';
import { usePulseStore } from '@/lib/store';
import { DRSModal } from '@/components/DRSModal';

export function DrsHost() {
  const open = usePulseStore((s) => s.openModal === 'drs');
  const close = usePulseStore((s) => s.closeModal);
  return <DRSModal isOpen={open} onClose={close} />;
}
