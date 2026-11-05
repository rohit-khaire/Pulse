/**
 * Share-card layouts for next/og (Satori). Rules this file follows so it renders offline:
 *  - every <div> sets display:flex explicitly (Satori requirement for multi-child boxes)
 *  - no emoji (Satori would fetch Twemoji from a CDN), no Devanagari (Latin-only embedded font)
 *  - only inline styles; charts are inline <svg>
 * Honesty: cards for simulated data always say "DEMO FRIENDS" and "IPL replay".
 */

import type { ReactElement, ReactNode, CSSProperties } from 'react';
import type { MomentPayload, RankPayload, SharePayload, StreakPayload } from '../payload';
import { BADGES } from '../predictor';
import { cardLang } from '../story';
import { fmtNum, fmtSigned } from '../text';

export type CardVariant = 'wide' | 'story';

export const CARD_SIZE: Record<CardVariant, { width: number; height: number }> = {
  wide: { width: 1200, height: 630 },
  story: { width: 1080, height: 1920 }, // 9:16
};

const C = {
  bg: '#020617',
  panel: '#0f172a',
  panel2: '#111c33',
  border: '#1e293b',
  red: '#ef4444',
  redDeep: '#b91c1c',
  amber: '#fbbf24',
  green: '#34d399',
  text: '#f8fafc',
  mute: '#94a3b8',
  dim: '#64748b',
};

const FONT = 'Inter';

type BoxProps = { style?: CSSProperties; children?: ReactNode };
const Box = ({ style, children }: BoxProps) => <div style={{ display: 'flex', ...style }}>{children}</div>;
const Txt = ({ style, children }: BoxProps) => <div style={{ display: 'flex', ...style }}>{children}</div>;

function Brand({ px }: { px: (n: number) => number }) {
  return (
    <Box style={{ alignItems: 'center' }}>
      <svg width={px(44)} height={px(44)} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="24" height="24" rx="6" fill="#7f1d1d" />
        <path d="M3 12.5h4l2-6 4 12 3-9 1.5 3H21" stroke="#fecaca" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <Txt style={{ marginLeft: px(14), fontSize: px(30), fontWeight: 800, letterSpacing: px(5), color: C.text }}>PULSE</Txt>
    </Box>
  );
}

function Chip({
  px,
  children,
  color = C.mute,
  bg = 'rgba(148,163,184,0.12)',
  border = 'rgba(148,163,184,0.3)',
}: {
  px: (n: number) => number;
  children: ReactNode;
  color?: string;
  bg?: string;
  border?: string;
}) {
  return (
    <Txt
      style={{
        alignItems: 'center',
        padding: `${px(7)}px ${px(16)}px`,
        borderRadius: px(999),
        backgroundColor: bg,
        border: `${Math.max(1, px(1.5))}px solid ${border}`,
        color,
        fontSize: px(18),
        fontWeight: 800,
        letterSpacing: px(1.5),
      }}
    >
      {children}
    </Txt>
  );
}

function Shell({
  variant,
  chip,
  footerNote,
  children,
}: {
  variant: CardVariant;
  chip: string;
  footerNote: string;
  children: (px: (n: number) => number) => ReactNode;
}) {
  const story = variant === 'story';
  const { width, height } = CARD_SIZE[variant];
  const px = (n: number) => Math.round(n * (story ? 1.45 : 1));
  const pad = story ? 84 : 56;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        position: 'relative',
        backgroundColor: C.bg,
        backgroundImage:
          'radial-gradient(circle at 92% 0%, rgba(220,38,38,0.42), rgba(2,6,23,0) 52%), radial-gradient(circle at 0% 100%, rgba(251,191,36,0.14), rgba(2,6,23,0) 45%)',
        color: C.text,
        fontFamily: FONT,
        padding: pad,
      }}
    >
      <Box style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Brand px={px} />
        <Chip px={px}>{chip}</Chip>
      </Box>
      <Box style={{ flex: 1, flexDirection: 'column', justifyContent: 'center' }}>{children(px)}</Box>
      <Box style={{ justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${C.border}`, paddingTop: px(18) }}>
        <Txt style={{ color: C.mute, fontSize: px(19), fontWeight: 400 }}>{footerNote}</Txt>
        {!story && <Txt style={{ color: C.red, fontSize: px(19), fontWeight: 800, letterSpacing: px(1) }}>pulse · har ball ka matlab</Txt>}
      </Box>
      {story && (
        <Txt style={{ color: C.red, fontSize: px(19), fontWeight: 800, letterSpacing: px(1), marginTop: px(10) }}>pulse · har ball ka matlab</Txt>
      )}
    </div>
  );
}

/* ------------------------------ sparkline ------------------------------ */

function Sparkline({ values, w, h }: { values: number[]; w: number; h: number }) {
  const pts = values.length >= 2 ? values : [0, ...(values.length ? values : [0])];
  const min = Math.min(...pts);
  const max = Math.max(...pts, min + 1);
  const pad = 14;
  const x = (i: number) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const y = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${h - pad} L${x(0).toFixed(1)} ${h - pad} Z`;
  const lx = x(pts.length - 1);
  const ly = y(pts[pts.length - 1]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#g)" />
      <path d={line} stroke="#ef4444" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="9" fill="#ffffff" stroke="#ef4444" strokeWidth="4" />
    </svg>
  );
}

/* ------------------------------ copy ------------------------------ */

const L = {
  en: {
    myRank: 'MY RANK',
    ofTeams: (t: number) => `of ${t} teams`,
    pts: 'FANTASY PTS',
    journey: 'POINTS JOURNEY',
    best: 'BEST MOMENT',
    demo: 'DEMO FRIENDS',
    over: 'OVER',
    swing: 'FANTASY PTS',
    predictor: 'OVER PREDICTOR',
    xp: 'XP',
    bestStreak: 'BEST STREAK',
    perfect: 'PERFECT OVERS',
    played: 'OVERS PLAYED',
    accuracy: 'RUNS-BAND ACCURACY',
    badges: 'BADGES',
    noBadges: 'No badges yet',
    footnoteSim: (m: string) => `IPL replay (${m}) · demo friends · entertainment only`,
    footnote: (m: string) => `IPL replay (${m}) · entertainment only`,
    tag: { WICKET: 'WICKET', SIX: 'SIX', FOUR: 'FOUR', MILESTONE: 'MILESTONE', HAUL: 'WICKET HAUL', MAIDEN: 'MAIDEN', OVER_END: 'OVER', STORY: 'MATCH STORY' },
  },
  hinglish: {
    myRank: 'MERA RANK',
    ofTeams: (t: number) => `${t} teams mein se`,
    pts: 'FANTASY PTS',
    journey: 'POINTS KA SAFAR',
    best: 'BEST MOMENT',
    demo: 'DEMO FRIENDS',
    over: 'OVER',
    swing: 'FANTASY PTS',
    predictor: 'OVER PREDICTOR',
    xp: 'XP',
    bestStreak: 'BEST STREAK',
    perfect: 'PERFECT OVERS',
    played: 'OVERS KHELE',
    accuracy: 'RUNS-BAND ACCURACY',
    badges: 'BADGES',
    noBadges: 'Abhi koi badge nahi',
    footnoteSim: (m: string) => `IPL replay (${m}) · demo friends · sirf entertainment`,
    footnote: (m: string) => `IPL replay (${m}) · sirf entertainment`,
    tag: { WICKET: 'WICKET', SIX: 'CHHAKKA', FOUR: 'CHAUKA', MILESTONE: 'MILESTONE', HAUL: 'WICKET HAUL', MAIDEN: 'MAIDEN', OVER_END: 'OVER', STORY: 'MATCH STORY' },
  },
} as const;

/* ------------------------------ cards ------------------------------ */

function RankCard({ p, variant }: { p: RankPayload; variant: CardVariant }) {
  const t = L[cardLang(p.l)];
  const story = variant === 'story';
  return (
    <Shell
      variant={variant}
      chip={p.sim ? t.demo : 'LEAGUE'}
      footerNote={p.sim ? t.footnoteSim(p.m) : t.footnote(p.m)}
    >
      {(px) => (
        <Box style={{ flexDirection: story ? 'column' : 'row', alignItems: story ? 'flex-start' : 'center', justifyContent: 'space-between' }}>
          <Box style={{ flexDirection: 'column' }}>
            <Txt style={{ color: C.mute, fontSize: px(24), fontWeight: 800, letterSpacing: px(3) }}>{`${p.n.toUpperCase()} · ${t.myRank}`}</Txt>
            <Txt style={{ fontSize: px(story ? 230 : 250), fontWeight: 800, lineHeight: 1, color: p.r === 1 ? C.amber : C.text, marginTop: px(6) }}>{`#${p.r}`}</Txt>
            <Txt style={{ color: C.text, fontSize: px(34), fontWeight: 800 }}>{t.ofTeams(p.t)}</Txt>
            <Txt style={{ color: C.mute, fontSize: px(26), marginTop: px(6) }}>{`${fmtNum(p.p)} ${t.pts}`}</Txt>
          </Box>
          <Box
            style={{
              flexDirection: 'column',
              width: story ? '100%' : px(560),
              marginTop: story ? px(48) : 0,
              padding: px(26),
              borderRadius: px(26),
              backgroundColor: C.panel,
              border: `1px solid ${C.border}`,
            }}
          >
            <Txt style={{ color: C.mute, fontSize: px(17), fontWeight: 800, letterSpacing: px(2) }}>{t.journey}</Txt>
            <Box style={{ marginTop: px(10) }}>
              <Sparkline values={p.s} w={px(story ? 790 : 500)} h={px(story ? 250 : 190)} />
            </Box>
            {p.b && (
              <Box style={{ flexDirection: 'column', marginTop: px(14), paddingTop: px(14), borderTop: `1px solid ${C.border}` }}>
                <Txt style={{ color: C.amber, fontSize: px(16), fontWeight: 800, letterSpacing: px(2) }}>{t.best}</Txt>
                <Txt style={{ color: C.text, fontSize: px(story ? 28 : 23), marginTop: px(6), lineHeight: 1.3 }}>{p.b}</Txt>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Shell>
  );
}

const TAG_COLOR: Record<string, string> = {
  WICKET: C.red,
  HAUL: C.red,
  SIX: C.amber,
  FOUR: C.amber,
  MILESTONE: C.green,
  MAIDEN: '#60a5fa',
  OVER_END: C.mute,
  STORY: C.amber,
};

function MomentCard({ p, variant }: { p: MomentPayload; variant: CardVariant }) {
  const t = L[cardLang(p.l)];
  const story = variant === 'story';
  const color = TAG_COLOR[p.e] ?? C.red;
  const len = p.h.length;
  const size = story ? (len <= 30 ? 120 : len <= 55 ? 98 : 80) : len <= 30 ? 88 : len <= 55 ? 70 : 56;
  return (
    <Shell
      variant={variant}
      chip={p.sim ? t.demo : 'PULSE'}
      footerNote={p.sim ? t.footnoteSim(p.m) : t.footnote(p.m)}
    >
      {(px) => (
        <Box style={{ flexDirection: 'column' }}>
          <Box style={{ alignItems: 'center' }}>
            <Chip px={px} color={color} bg="rgba(255,255,255,0.05)" border={color}>
              {t.tag[p.e]}
            </Chip>
            <Txt style={{ marginLeft: px(16), color: C.mute, fontSize: px(22), fontWeight: 800, letterSpacing: px(2) }}>{`${t.over} ${p.o}`}</Txt>
          </Box>
          <Box style={{ marginTop: px(26) }}>
            <Box style={{ width: px(10), backgroundColor: color, borderRadius: px(6), marginRight: px(28) }} />
            <Txt style={{ flex: 1, fontSize: px(size), fontWeight: 800, lineHeight: 1.08, color: C.text }}>{p.h}</Txt>
          </Box>
          {p.x && <Txt style={{ marginTop: px(28), fontSize: px(story ? 38 : 34), color: '#cbd5e1', lineHeight: 1.25 }}>{p.x}</Txt>}
          <Box style={{ marginTop: px(34), alignItems: 'center' }}>
            {p.d !== undefined && p.d !== 0 && (
              <Chip px={px} color={p.d > 0 ? C.green : C.red} bg="rgba(255,255,255,0.05)" border={p.d > 0 ? C.green : C.red}>
                {`${fmtSigned(p.d)} ${t.swing}`}
              </Chip>
            )}
            <Txt style={{ marginLeft: p.d ? px(18) : 0, color: C.mute, fontSize: px(22) }}>{`${p.n}'s moment`}</Txt>
          </Box>
        </Box>
      )}
    </Shell>
  );
}

function StatBox({ px, label, value, flex = 1 }: { px: (n: number) => number; label: string; value: string; flex?: number }) {
  return (
    <Box
      style={{
        flex,
        flexDirection: 'column',
        padding: px(20),
        borderRadius: px(20),
        backgroundColor: C.panel,
        border: `1px solid ${C.border}`,
      }}
    >
      <Txt style={{ color: C.mute, fontSize: px(15), fontWeight: 800, letterSpacing: px(1.5) }}>{label}</Txt>
      <Txt style={{ color: C.text, fontSize: px(46), fontWeight: 800, marginTop: px(6) }}>{value}</Txt>
    </Box>
  );
}

function StreakCard({ p, variant }: { p: StreakPayload; variant: CardVariant }) {
  const t = L[cardLang(p.l)];
  const story = variant === 'story';
  const flames = Math.min(p.bs, 10);
  return (
    <Shell variant={variant} chip={t.predictor} footerNote={t.footnote(p.m)}>
      {(px) => (
        <Box style={{ flexDirection: 'column' }}>
          <Txt style={{ color: C.mute, fontSize: px(24), fontWeight: 800, letterSpacing: px(3) }}>{p.n.toUpperCase()}</Txt>
          <Box style={{ alignItems: 'flex-end', marginTop: px(4) }}>
            <Txt style={{ fontSize: px(story ? 200 : 128), fontWeight: 800, lineHeight: 1, color: C.amber }}>{String(p.xp)}</Txt>
            <Txt style={{ fontSize: px(52), fontWeight: 800, color: C.text, marginLeft: px(16), marginBottom: px(story ? 22 : 14) }}>{t.xp}</Txt>
          </Box>
          <Box style={{ alignItems: 'center', marginTop: px(14), height: px(36) }}>
            {Array.from({ length: Math.max(flames, 1) }).map((_, i) => (
              <Box
                key={i}
                style={{
                  width: px(26),
                  height: px(26),
                  borderRadius: px(13),
                  marginRight: px(10),
                  backgroundColor: flames > 0 ? C.red : C.border,
                }}
              />
            ))}
            <Txt style={{ color: C.mute, fontSize: px(22), marginLeft: px(6) }}>{`${t.bestStreak}: ${p.bs}`}</Txt>
          </Box>
          <Box style={{ marginTop: px(story ? 30 : 20), flexDirection: story ? 'column' : 'row' }}>
            <Box style={{ flex: 1, marginRight: story ? 0 : px(16) }}>
              <StatBox px={px} label={t.perfect} value={String(p.pf)} />
              <Box style={{ width: px(16) }} />
              <StatBox px={px} label={t.played} value={String(p.ov)} />
            </Box>
            <Box style={{ flex: 1, marginTop: story ? px(16) : 0 }}>
              <Box
                style={{
                  flex: 1,
                  flexDirection: 'column',
                  padding: px(20),
                  borderRadius: px(20),
                  backgroundColor: C.panel,
                  border: `1px solid ${C.border}`,
                }}
              >
                <Txt style={{ color: C.mute, fontSize: px(15), fontWeight: 800, letterSpacing: px(1.5) }}>{t.accuracy}</Txt>
                <Txt style={{ color: C.text, fontSize: px(46), fontWeight: 800, marginTop: px(6) }}>{`${p.ac}%`}</Txt>
                <Box style={{ marginTop: px(8), height: px(10), borderRadius: px(5), backgroundColor: C.border }}>
                  <Box style={{ width: `${p.ac}%`, height: px(10), borderRadius: px(5), backgroundColor: C.green }} />
                </Box>
              </Box>
            </Box>
          </Box>
          <Box style={{ marginTop: px(story ? 26 : 18), alignItems: 'center', flexWrap: 'wrap' }}>
            <Txt style={{ color: C.mute, fontSize: px(17), fontWeight: 800, letterSpacing: px(2), marginRight: px(14) }}>{t.badges}</Txt>
            {p.bd.length === 0 && <Txt style={{ color: C.dim, fontSize: px(22) }}>{t.noBadges}</Txt>}
            {p.bd.map((id) => (
              <Box key={id} style={{ marginRight: px(10), marginTop: px(6) }}>
                <Chip px={px} color={C.amber} bg="rgba(251,191,36,0.1)" border="rgba(251,191,36,0.5)">
                  {BADGES[id].title.toUpperCase()}
                </Chip>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </Shell>
  );
}

/** Generic brand card: used when a link has no/invalid payload so unfurls still look right. */
function BrandCard({ variant }: { variant: CardVariant }) {
  const story = variant === 'story';
  return (
    <Shell variant={variant} chip="DEMO" footerNote="IPL replay · demo friends · entertainment only">
      {(px) => (
        <Box style={{ flexDirection: 'column' }}>
          <Txt style={{ fontSize: px(story ? 120 : 92), fontWeight: 800, lineHeight: 1.05 }}>Har ball ka matlab,</Txt>
          <Txt style={{ fontSize: px(story ? 120 : 92), fontWeight: 800, lineHeight: 1.05, color: C.red }}>tumhari team ke liye.</Txt>
          <Txt style={{ marginTop: px(28), fontSize: px(32), color: C.mute, lineHeight: 1.3 }}>
            Your fantasy co-pilot for every ball. Predict overs, flex your rank, tease your friends.
          </Txt>
        </Box>
      )}
    </Shell>
  );
}

export function renderCard(payload: SharePayload | null, variant: CardVariant): ReactElement {
  if (!payload) return <BrandCard variant={variant} />;
  switch (payload.k) {
    case 'rank':
      return <RankCard p={payload} variant={variant} />;
    case 'moment':
      return <MomentCard p={payload} variant={variant} />;
    case 'streak':
      return <StreakCard p={payload} variant={variant} />;
  }
}
