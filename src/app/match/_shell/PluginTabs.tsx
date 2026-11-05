'use client';

import React, { useEffect, useRef } from 'react';
import { usePulseStore } from '@/lib/store';
import { PluginSlot } from './PluginSlot';
import { nextTabIndex, resolveActiveTab } from './registry-utils';
import type { TabEntry } from './types';

/** WAI-ARIA tabs (roving tabindex, arrow/Home/End keys) over the registry's enabled TABS. */
export function PluginTabs({ tabs }: { tabs: TabEntry[] }) {
  const stored = usePulseStore((s) => s.activeTab);
  const setActiveTab = usePulseStore((s) => s.setActiveTab);
  const active = resolveActiveTab(stored, tabs);
  const list = tabs.filter((t) => t.enabled);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // keep the store honest if a plug-in tab was removed/disabled while active
  useEffect(() => {
    if (active && active !== stored) setActiveTab(active);
  }, [active, stored, setActiveTab]);

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const n = nextTabIndex(i, list.length, e.key);
    if (n !== i) {
      e.preventDefault();
      setActiveTab(list[n].id);
      refs.current[n]?.focus();
    }
  };

  const current = list.find((t) => t.id === active);

  return (
    <>
      <div
        role="tablist"
        aria-label="Match sections"
        className="flex gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold shadow-inner overflow-x-auto"
      >
        {list.map((t, i) => {
          const selected = t.id === active;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              data-testid={`tab-${t.id}`}
              onClick={() => setActiveTab(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`flex-1 min-w-[4.5rem] min-h-11 rounded-lg flex items-center justify-center gap-1 transition-colors ${
                selected
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {current && (
        <div
          role="tabpanel"
          id={`panel-${current.id}`}
          aria-labelledby={`tab-${current.id}`}
          tabIndex={-1}
          className="flex-1 space-y-3 outline-none"
        >
          <PluginSlot
            key={current.id}
            id={current.id}
            label={current.label}
            Component={current.component}
            skeleton={current.skeleton ?? 'card'}
          />
        </div>
      )}
    </>
  );
}
