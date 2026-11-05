import type { SharePayload } from './payload';

/**
 * Sample payloads for the /share demo route and for generateStaticParams.
 * They mirror what the live builders produce for the bundled replay (RR vs PBKS) with the
 * sample team vs the 4 demo friends. They are SAMPLES: the demo page labels them as such.
 */
export const SAMPLE_PAYLOADS: Record<'rank' | 'moment' | 'streak', SharePayload> = {
  rank: {
    v: 1,
    k: 'rank',
    n: 'Sample fan',
    m: 'RR vs PBKS',
    l: 'hinglish',
    r: 1,
    t: 5,
    p: 1147,
    s: [50, 71, 115, 163, 263, 276, 290, 348, 381, 472, 560, 643, 779, 806, 892, 911, 952, 996, 1042, 1057, 1062, 1063, 1066, 1147],
    b: 'Arshdeep ke 5 wicket. Tumhari team +64.5 pts. Rank abhi bhi #1.',
    sim: true,
  },
  moment: {
    v: 1,
    k: 'moment',
    n: 'Sample fan',
    m: 'RR vs PBKS',
    l: 'en',
    h: 'Tyagi defended 4 off the last over',
    x: 'my VC Arshdeep took 5/32',
    o: '19.6',
    e: 'STORY',
    sim: true,
  },
  streak: {
    v: 1,
    k: 'streak',
    n: 'Sample fan',
    m: 'RR vs PBKS',
    l: 'hinglish',
    xp: 240,
    bs: 4,
    pf: 3,
    ov: 9,
    ac: 56,
    bd: ['first_hit', 'hot_streak', 'wicket_hunter'],
  },
};
