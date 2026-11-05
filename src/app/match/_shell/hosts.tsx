'use client';

/** Small adapters that connect prop-based legacy components to the shell's store-driven registry. */
import React, { memo } from 'react';
import { usePulseStore } from '@/lib/store';
import { LiveFanActionBar } from '@/components/LiveFanActionBar';
import { PlayerRow } from '@/components/PlayerRow';

export const ActionBarHost = memo(function ActionBarHost() {
  const activeTab = usePulseStore((s) => s.activeTab);
  const setActiveTab = usePulseStore((s) => s.setActiveTab);
  const setOpenModal = usePulseStore((s) => s.setOpenModal);
  return (
    <LiveFanActionBar
      onOpenCatchUp={() => setOpenModal('catchup')}
      onOpenDRS={() => setOpenModal('drs')}
      isChatActive={activeTab === 'chat'}
      onToggleChat={() => setActiveTab(activeTab === 'chat' ? 'feed' : 'chat')}
    />
  );
});

export const XiPanel = memo(function XiPanel() {
  const xi = usePulseStore((s) => s.myTeam?.xi);
  if (!xi) return null;
  return (
    <div className="space-y-2 pb-24">
      <p className="text-[11px] text-slate-400 px-1 font-medium">
        Tap any player to inspect their points breakdown:
      </p>
      <ul className="space-y-2">
        {xi.map((player) => (
          <li key={player}>
            <PlayerRow player={player} />
          </li>
        ))}
      </ul>
    </div>
  );
});
