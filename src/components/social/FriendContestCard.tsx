'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown, Minus, Sparkles, TrendingDown, TrendingUp, Users, UserPlus } from 'lucide-react';
import { useSocialHydrated, useSocialStore } from '@/lib/social/store';
import { diffStandings, gapToNextAbove, isBanterWorthy, isNaturalStep, standingsAt, toBanterFacts } from '@/lib/social/contest';
import { STICKERS, chooseBanter, templateBanter, type BanterFacts } from '@/lib/social/banter';
import { fmtNum, firstName, type Lang } from '@/lib/social/text';
import { SocialErrorBoundary } from './ErrorBoundary';
import { ShareButton } from './ShareButton';
import { DemoBadge, RESPONSIBLE_NOTE, SocialSkeleton } from './ui';
import { useMatchState } from './context';

interface Banner {
  id: number;
  text: string;
  source: 'ai' | 'template';
  rivalId: string;
  rivalName: string;
  kind: BanterFacts['kind'];
}

const T = {
  en: { title: 'Friend Contest', invite: 'Invite friends', inviteNote: 'Invites share your Pulse card link. The friends below are demo.', ai: 'AI banter (optional)', gapUp: (n: string, who: string) => `${n} pts behind ${who}`, lead: 'You lead', sent: (s: string, who: string) => `${s} sent to ${who} (demo)`, react: 'React', banter: 'Latest banter', you: 'YOU', ahead: 'ahead', behind: 'behind' },
  hinglish: { title: 'Friend Contest', invite: 'Dost ko bulao', inviteNote: 'Invite mein tumhare Pulse card ka link jaata hai. Neeche ke friends demo hain.', ai: 'AI banter (optional)', gapUp: (n: string, who: string) => `${who} se ${n} pts peeche`, lead: 'Tum aage ho', sent: (s: string, who: string) => `${s} ${who} ko bheja (demo)`, react: 'React', banter: 'Latest banter', you: 'TUM', ahead: 'aage', behind: 'peeche' },
  hi: { title: 'फ्रेंड कॉन्टेस्ट', invite: 'दोस्तों को बुलाइए', inviteNote: 'इनवाइट में आपके Pulse कार्ड का लिंक जाता है। नीचे के दोस्त डेमो हैं।', ai: 'AI बैंटर (वैकल्पिक)', gapUp: (n: string, who: string) => `${who} से ${n} पॉइंट पीछे`, lead: 'आप आगे हैं', sent: (s: string, who: string) => `${s} ${who} को भेजा (डेमो)`, react: 'रिएक्ट', banter: 'ताज़ा बैंटर', you: 'आप', ahead: 'आगे', behind: 'पीछे' },
} as const;

const BANNER_MS = 9000;
const COOLDOWN_FRAMES = 4;

function FriendContestInner() {
  const { frames, cursor, myTeam, config, lang, ready } = useMatchState();
  const hydrated = useSocialHydrated();
  const aiBanter = useSocialStore((s) => s.aiBanter);
  const setAiBanter = useSocialStore((s) => s.setAiBanter);
  const stickers = useSocialStore((s) => s.stickers);
  const sendSticker = useSocialStore((s) => s.sendSticker);
  const t = T[lang as Lang] ?? T.hinglish;

  const board = useMemo(
    () => (ready && myTeam ? standingsAt(frames, cursor, myTeam, config) : []),
    [ready, frames, cursor, myTeam, config]
  );

  const [banner, setBanner] = useState<Banner | null>(null);
  const [log, setLog] = useState<Banner[]>([]);
  const [toast, setToast] = useState('');
  const [trayFor, setTrayFor] = useState<string | null>(null);
  const prevCursor = useRef(cursor);
  const lastBannerCursor = useRef(-999);
  const seq = useRef(0);

  // Overtake detection on normal playback only. Scrubs / big jumps / going back stay silent.
  useEffect(() => {
    const prev = prevCursor.current;
    prevCursor.current = cursor;
    if (!ready || !myTeam || !hydrated) return;
    if (!isNaturalStep(prev, cursor)) return;
    try {
      const before = standingsAt(frames, prev, myTeam, config);
      const after = standingsAt(frames, cursor, myTeam, config);
      const hit = diffStandings(before, after).find((o) => isBanterWorthy(o));
      if (!hit) return;
      const facts = toBanterFacts(hit, `${frames[cursor].over}.${Math.max(1, frames[cursor].ballInOver)}`, after.length);
      const big = facts.kind === 'took_lead' || facts.kind === 'lost_lead';
      if (!big && cursor - lastBannerCursor.current < COOLDOWN_FRAMES) return;
      lastBannerCursor.current = cursor;

      const id = ++seq.current;
      const next: Banner = {
        id,
        text: templateBanter(facts, lang),
        source: 'template',
        rivalId: hit.rival.id,
        rivalName: facts.rival,
        kind: facts.kind,
      };
      setBanner(next);
      setLog((l) => [next, ...l].slice(0, 4));

      if (aiBanter) {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 2500);
        fetch('/api/og/banter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facts, lang }),
          signal: ctl.signal,
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (!data?.text) return;
            // Re-validate on the client too; never trust the wire.
            const choice = chooseBanter(facts, lang, String(data.text));
            if (choice.source !== 'ai') return;
            const upgraded = { ...next, text: choice.text, source: 'ai' as const };
            setBanner((b) => (b && b.id === id ? upgraded : b));
            setLog((l) => l.map((x) => (x.id === id ? upgraded : x)));
          })
          .catch(() => undefined)
          .finally(() => clearTimeout(timer));
      }
    } catch (e) {
      console.warn('[pulse-social] overtake check failed', e);
    }
  }, [cursor, ready, hydrated, myTeam, frames, config, lang, aiBanter]);

  useEffect(() => {
    if (!banner) return;
    const id = setTimeout(() => setBanner((b) => (b && b.id === banner.id ? null : b)), BANNER_MS);
    return () => clearTimeout(id);
  }, [banner]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  if (!hydrated || !ready) return <SocialSkeleton label="Friend Contest" lines={4} />;

  const you = board.find((e) => e.isUser);
  const gap = gapToNextAbove(board);

  const react = (rivalId: string, rivalName: string, stickerId: string) => {
    const s = STICKERS.find((x) => x.id === stickerId);
    if (!s) return;
    sendSticker(rivalId, stickerId);
    setToast(t.sent(`${s.emoji} ${s.label[lang]}`, rivalName));
    setTrayFor(null);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 shadow-lg" aria-label={t.title}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
          <Users className="w-4 h-4 text-amber-400" />
          <span>{t.title}</span>
          <DemoBadge />
        </div>
        <ShareButton label={t.invite} className="!px-2.5 !py-1 !text-[11px]" />
      </div>
      <p className="mt-1 text-[10px] text-slate-500 flex items-center space-x-1">
        <UserPlus className="w-3 h-3 shrink-0" />
        <span>{t.inviteNote}</span>
      </p>

      <AnimatePresence>
        {banner && (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-2.5 rounded-xl border px-3 py-2 ${
              banner.kind === 'overtaken' || banner.kind === 'lost_lead'
                ? 'bg-red-950/50 border-red-500/40'
                : 'bg-emerald-950/40 border-emerald-500/40'
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-xs font-semibold text-slate-100 leading-snug">{banner.text}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              {STICKERS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => react(banner.rivalId, banner.rivalName, s.id)}
                  className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-slate-700 text-[10px] font-bold text-slate-200 hover:border-slate-500 active:scale-95"
                  title={s.label[lang]}
                >
                  {s.emoji} {s.label[lang]}
                </button>
              ))}
              {banner.source === 'ai' && (
                <span className="ml-auto text-[9px] font-bold uppercase text-violet-300 flex items-center space-x-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>AI</span>
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {toast && (
        <div className="mt-1.5 text-[11px] text-emerald-300 font-semibold" role="status">
          {toast}
        </div>
      )}

      <div className="mt-2.5 space-y-1.5">
        {board.map((e) => {
          const diff = you ? e.totalPts - you.totalPts : 0;
          const sticker = STICKERS.find((s) => s.id === stickers[e.id]);
          const who = firstName(e.owner);
          return (
            <div key={e.id}>
              <div
                className={`flex items-center justify-between rounded-xl border px-2.5 py-2 ${
                  e.isUser ? 'bg-gradient-to-r from-red-950/40 to-slate-900 border-red-500/40' : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-center space-x-2 min-w-0">
                  <div className="w-9 text-center">
                    <div className="flex items-center justify-center font-black text-sm text-slate-200">
                      {e.rank === 1 && <Crown className="w-3 h-3 text-amber-400 mr-0.5" />}#{e.rank}
                    </div>
                    <div className="text-[9px] font-bold flex items-center justify-center">
                      {e.rankDelta > 0 && (
                        <span className="text-emerald-400 flex items-center">
                          <TrendingUp className="w-2.5 h-2.5" />
                          {e.rankDelta}
                        </span>
                      )}
                      {e.rankDelta < 0 && (
                        <span className="text-rose-400 flex items-center">
                          <TrendingDown className="w-2.5 h-2.5" />
                          {Math.abs(e.rankDelta)}
                        </span>
                      )}
                      {e.rankDelta === 0 && <Minus className="w-2.5 h-2.5 text-slate-700" />}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-bold text-white truncate">{e.name}</span>
                      {e.isUser && <span className="px-1 rounded bg-red-600 text-white text-[9px] font-extrabold">{t.you}</span>}
                      {sticker && !e.isUser && <span title={sticker.label[lang]}>{sticker.emoji}</span>}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {e.owner}
                      {!e.isUser && diff !== 0 && (
                        <span className={diff > 0 ? 'text-rose-300' : 'text-emerald-300'}>
                          {' · '}
                          {fmtNum(Math.abs(diff))} {diff > 0 ? t.ahead : t.behind}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <div className="text-sm font-black text-white leading-none">{fmtNum(e.totalPts)}</div>
                    <div className="text-[9px] uppercase font-bold text-slate-500">pts</div>
                  </div>
                  {!e.isUser && (
                    <button
                      onClick={() => setTrayFor(trayFor === e.id ? null : e.id)}
                      aria-expanded={trayFor === e.id}
                      className="text-[10px] font-bold px-1.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      {t.react}
                    </button>
                  )}
                </div>
              </div>
              {trayFor === e.id && (
                <div className="flex flex-wrap gap-1 px-1 pt-1">
                  {STICKERS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => react(e.id, who, s.id)}
                      className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] font-bold text-slate-200 hover:border-slate-500 active:scale-95"
                    >
                      {s.emoji} {s.label[lang]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-slate-400">
        {gap ? t.gapUp(fmtNum(gap.gap), firstName(gap.rival.owner)) : t.lead}
      </p>

      {log.length > 1 && (
        <div className="mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t.banter}</div>
          <ul className="space-y-1">
            {log.slice(1).map((b) => (
              <li key={b.id} className="text-[11px] text-slate-400 leading-snug">
                {b.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <label className="mt-2.5 flex items-center space-x-2 text-[11px] text-slate-400 cursor-pointer select-none">
        <input type="checkbox" checked={aiBanter} onChange={(e) => setAiBanter(e.target.checked)} className="accent-red-600" />
        <span>{t.ai}</span>
      </label>
      <p className="mt-1.5 text-[10px] text-slate-600">
        {RESPONSIBLE_NOTE} Demo friends are simulated from sample data.
      </p>
    </section>
  );
}

export function FriendContestCard() {
  return (
    <SocialErrorBoundary name="Friend Contest">
      <FriendContestInner />
    </SocialErrorBoundary>
  );
}
