'use client';

import React, { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePulseStore } from '@/lib/store';
import { PluginSlot } from './PluginSlot';
import type { ModalEntry, PluginEntry } from './types';

/** Floating action buttons stack above the replay bar. Entries render in-flow; this places them. */
export function FloatingStack({ actions }: { actions: PluginEntry[] }) {
  const list = actions.filter((a) => a.enabled);
  if (list.length === 0) return null;
  return (
    <div
      className="fixed right-4 z-40 flex flex-col-reverse items-end gap-2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.25rem)' }}
    >
      {list.map((a) => (
        <PluginSlot key={a.id} id={a.id} label={a.label} Component={a.component} skeleton={a.skeleton ?? 'button'} quiet />
      ))}
    </div>
  );
}

function useIdle(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);
  return ready;
}

const defaultIsOpen = (id: string) => (s: { openModal: string | null }) => s.openModal === id;

/**
 * Modals mount lazily: 'open' modals load their chunk the first time they are opened,
 * 'always' modals (self-managed plug-ins) mount once the browser is idle.
 */
export function ModalSlots({ modals }: { modals: ModalEntry[] }) {
  const list = modals.filter((m) => m.enabled);
  const idle = useIdle();
  const openIds = usePulseStore(
    useShallow((s) =>
      list.filter((m) => (m.isOpen ? m.isOpen(s) : defaultIsOpen(m.id)(s))).map((m) => m.id)
    )
  );
  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    setOpened((prev) => {
      const add = openIds.filter((id) => !prev.includes(id));
      return add.length ? [...prev, ...add] : prev;
    });
  }, [openIds]);

  return (
    <>
      {list.map((m) => {
        const mount = (m.mountOn ?? 'open') === 'always' ? idle : opened.includes(m.id);
        if (!mount) return null;
        return <PluginSlot key={m.id} id={m.id} label={m.label} Component={m.component} skeleton="none" quiet />;
      })}
    </>
  );
}
