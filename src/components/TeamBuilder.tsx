'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePulseStore } from '@/lib/store';
import sampleTeamData from '@/data/sample-team.json';
import {
  Users,
  Check,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Crown,
  Medal,
} from 'lucide-react';

interface TeamBuilderProps {
  squads: {
    team1Name: string;
    team1Players: string[];
    team2Name: string;
    team2Players: string[];
  };
}

export function TeamBuilder({ squads }: TeamBuilderProps) {
  const router = useRouter();
  const { myTeam, setTeam, loadSampleTeam } = usePulseStore();

  const [activeTab, setActiveTab] = useState<'team1' | 'team2'>('team1');
  const [selectedXI, setSelectedXI] = useState<string[]>(
    myTeam?.xi || (sampleTeamData.xi as string[])
  );
  const [captain, setCaptain] = useState<string>(
    myTeam?.c || sampleTeamData.c
  );
  const [viceCaptain, setViceCaptain] = useState<string>(
    myTeam?.vc || sampleTeamData.vc
  );

  const team1Set = new Set(squads.team1Players);
  const team2Set = new Set(squads.team2Players);

  const team1Count = selectedXI.filter((p) => team1Set.has(p)).length;
  const team2Count = selectedXI.filter((p) => team2Set.has(p)).length;

  const isCountValid = selectedXI.length === 11;
  const isTeam1Valid = team1Count <= 7;
  const isTeam2Valid = team2Count <= 7;
  const isRolesValid = captain && viceCaptain && captain !== viceCaptain;
  const isValid = isCountValid && isTeam1Valid && isTeam2Valid && isRolesValid;

  const togglePlayer = (p: string) => {
    if (selectedXI.includes(p)) {
      setSelectedXI(selectedXI.filter((x) => x !== p));
      if (captain === p) setCaptain('');
      if (viceCaptain === p) setViceCaptain('');
    } else {
      if (selectedXI.length >= 11) return;
      const isT1 = team1Set.has(p);
      if (isT1 && team1Count >= 7) return;
      if (!isT1 && team2Count >= 7) return;
      setSelectedXI([...selectedXI, p]);
    }
  };

  const handleApplySample = () => {
    loadSampleTeam();
    setSelectedXI(sampleTeamData.xi as string[]);
    setCaptain(sampleTeamData.c);
    setViceCaptain(sampleTeamData.vc);
    router.push('/match');
  };

  const handleStart = () => {
    if (!isValid) return;
    setTeam({
      xi: selectedXI,
      c: captain,
      vc: viceCaptain,
    });
    router.push('/match');
  };

  return (
    <div className="space-y-4">
      {/* Sample Team Quick CTA */}
      <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-red-400 font-bold mb-0.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INSTANT START</span>
          </div>
          <h4 className="text-sm font-extrabold text-white">
            Use Balanced Sample XI
          </h4>
          <p className="text-[11px] text-slate-400">
            KL Rahul (C), Arshdeep Singh (VC), Samson, Lewis & 7 more
          </p>
        </div>
        <button
          onClick={handleApplySample}
          className="min-h-11 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all flex items-center space-x-1 shrink-0"
        >
          <span>Use Sample</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress & Validation Stats */}
      <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300">Squad Selection</span>
          </div>
          <div className="text-xs font-extrabold">
            <span className={selectedXI.length === 11 ? 'text-emerald-400' : 'text-amber-400'}>
              {selectedXI.length}
            </span>
            <span className="text-slate-500"> / 11 Players</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              selectedXI.length === 11 ? 'bg-emerald-500' : 'bg-red-600'
            }`}
            style={{ width: `${(selectedXI.length / 11) * 100}%` }}
          />
        </div>

        {/* Team breakdown count */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <div>
            <span className="text-slate-300 font-medium">{squads.team1Name}: </span>
            <span className={`font-bold ${team1Count > 7 ? 'text-rose-400' : 'text-white'}`}>
              {team1Count}/7 max
            </span>
          </div>
          <div>
            <span className="text-slate-300 font-medium">{squads.team2Name}: </span>
            <span className={`font-bold ${team2Count > 7 ? 'text-rose-400' : 'text-white'}`}>
              {team2Count}/7 max
            </span>
          </div>
        </div>
      </div>

      {/* Squad Tabs */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-3 shadow-md">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 mb-3 border border-slate-800">
          <button
            onClick={() => setActiveTab('team1')}
            aria-pressed={activeTab === 'team1'}
            className={`min-h-11 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'team1'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {squads.team1Name} ({team1Count})
          </button>
          <button
            onClick={() => setActiveTab('team2')}
            aria-pressed={activeTab === 'team2'}
            className={`min-h-11 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'team2'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {squads.team2Name} ({team2Count})
          </button>
        </div>

        {/* Player List */}
        <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
          {(activeTab === 'team1' ? squads.team1Players : squads.team2Players).map((player) => {
            const isSelected = selectedXI.includes(player);
            const isC = captain === player;
            const isVC = viceCaptain === player;

            return (
              <div
                key={player}
                className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-slate-700 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => togglePlayer(player)}
                  aria-pressed={isSelected}
                  className="min-h-11 text-left flex items-center space-x-2.5 flex-1 cursor-pointer"
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      isSelected
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check aria-hidden="true" className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-semibold text-white">{player}</span>
                </button>

                {/* Role Selector Badges */}
                {isSelected && (
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => {
                        if (isC) setCaptain('');
                        else {
                          setCaptain(player);
                          if (viceCaptain === player) setViceCaptain('');
                        }
                      }}
                      aria-pressed={isC}
                      aria-label={`Captain: ${player}`}
                      className={`min-h-11 min-w-11 rounded text-[11px] font-bold transition-colors ${
                        isC
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Set as Captain (2x points)"
                    >
                      C
                    </button>
                    <button
                      onClick={() => {
                        if (isVC) setViceCaptain('');
                        else {
                          setViceCaptain(player);
                          if (captain === player) setCaptain('');
                        }
                      }}
                      aria-pressed={isVC}
                      aria-label={`Vice-captain: ${player}`}
                      className={`min-h-11 min-w-11 rounded text-[11px] font-bold transition-colors ${
                        isVC
                          ? 'bg-slate-200 text-slate-950 shadow-sm'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Set as Vice-Captain (1.5x points)"
                    >
                      VC
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation Message & Start CTA */}
      <div className="space-y-2 pt-2">
        {!isValid && (
          <div className="text-xs text-amber-400 flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {!isCountValid
                ? `Please pick exactly 11 players (${selectedXI.length}/11 selected)`
                : !isTeam1Valid || !isTeam2Valid
                ? 'Maximum 7 players allowed from one side'
                : !captain
                ? 'Select a Captain (C badge) for 2× multiplier'
                : !viceCaptain
                ? 'Select a Vice-Captain (VC badge) for 1.5× multiplier'
                : 'Captain and Vice-Captain must be different'}
            </span>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!isValid}
          className="w-full min-h-11 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm shadow-xl shadow-red-600/30 transition-all flex items-center justify-center space-x-2"
        >
          <span>Watch Live Replay</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

