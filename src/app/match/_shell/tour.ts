/**
 * Judge-mode guided tour: 8 coach-mark steps that add up to 90 seconds.
 * Data only (no React) so the timing, targets and translations are testable.
 */
export type TourLang = 'en' | 'hinglish' | 'hi';

export type TourAction = 'play' | 'pause' | 'none';

export interface TourStep {
  id: string;
  /** value of a data-tour="..." attribute; null = centred card */
  target: string | null;
  durationMs: number;
  onEnter: TourAction;
  copy: Record<TourLang, { title: string; body: string }>;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    durationMs: 9000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Stage 2: Live Match Companion',
        body: 'Yeh ek asli IPL match ka replay hai, aakhri over se shuru. Kabhi bhi Skip dabao. Chalo dekhte hain Pulse har ball ka matlab kaise batata hai.',
      },
      en: {
        title: 'Stage 2: Live Match Companion',
        body: 'This is a replay of a real IPL match, starting at the final over thriller. Skip any time. Let us see how Pulse explains every single ball.',
      },
      hi: {
        title: 'स्टेज 2: लाइव मैच ट्रैकर',
        body: 'यह एक असली IPL मैच का रीप्ले है, आख़िरी ओवर से शुरू। कभी भी स्किप करें। देखिए Pulse हर गेंद का मतलब कैसे बताता है।',
      },
    },
  },
  {
    id: 'score',
    target: 'score',
    durationMs: 9000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Live score, ek nazar mein',
        body: 'Score, batter, bowler aur last 6 balls. Upar se bhasha badal sakte ho: English, Hinglish ya Hindi.',
      },
      en: {
        title: 'Live score at a glance',
        body: 'Score, batter, bowler and the last 6 balls. You can switch language at the top: English, Hinglish or Hindi.',
      },
      hi: {
        title: 'लाइव स्कोर एक नज़र में',
        body: 'स्कोर, बल्लेबाज़, गेंदबाज़ और आख़िरी 6 गेंदें। ऊपर से भाषा बदलें: English, Hinglish या हिन्दी।',
      },
    },
  },
  {
    id: 'team',
    target: 'team',
    durationMs: 10000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Tumhari team, tumhare points',
        body: 'Tumhari XI ke points, captain aur vice-captain ke multiplier ke saath. League rank ek sample friends league ka hai, asli contest ka nahi.',
      },
      en: {
        title: 'Your team, your points',
        body: 'Your XI points with captain and vice-captain multipliers. The league rank is from a sample friends league, not a real contest.',
      },
      hi: {
        title: 'आपकी टीम, आपके पॉइंट्स',
        body: 'आपकी XI के पॉइंट्स, कप्तान और उप-कप्तान के मल्टीप्लायर के साथ। लीग रैंक एक सैंपल फ्रेंड्स लीग की है, असली कॉन्टेस्ट की नहीं।',
      },
    },
  },
  {
    id: 'replay',
    target: 'replay',
    durationMs: 10000,
    onEnter: 'play',
    copy: {
      hinglish: {
        title: 'Play dabao, match chalu',
        body: 'Replay shuru ho gaya. Smart mode tumhare players ke bade moment par apne aap ruk jaata hai. Slider se kahin bhi jump karo.',
      },
      en: {
        title: 'Press play, the match runs',
        body: 'The replay is running. Smart mode pauses on big moments for your players. Drag the slider to jump anywhere.',
      },
      hi: {
        title: 'प्ले दबाइए, मैच चलेगा',
        body: 'रीप्ले चल पड़ा। स्मार्ट मोड आपके खिलाड़ियों के बड़े पलों पर अपने आप रुकता है। स्लाइडर से कहीं भी जाइए।',
      },
    },
  },
  {
    id: 'feed',
    target: 'feed',
    durationMs: 11000,
    onEnter: 'play',
    copy: {
      hinglish: {
        title: 'Mera rank kyu gira?',
        body: 'Har bade moment par ek chhota nudge aata hai: kya hua, kitne points mile aur kyun. Saare numbers seedhe code se aate hain, AI sirf samjhata hai.',
      },
      en: {
        title: 'Why did my rank drop?',
        body: 'Each big moment brings a short nudge: what happened, how many points and why. All numbers come straight from code; the AI only explains.',
      },
      hi: {
        title: 'मेरी रैंक क्यों गिरी?',
        body: 'हर बड़े पल पर एक छोटा नज होता है: क्या हुआ, कितने पॉइंट और क्यों। सारे नंबर सीधे कोड से आते हैं, AI सिर्फ़ समझाता है।',
      },
    },
  },
  {
    id: 'path',
    target: 'path',
    durationMs: 10000,
    onEnter: 'pause',
    copy: {
      hinglish: {
        title: 'Kya main abhi bhi jeet sakta hoon?',
        body: 'Yeh batata hai ki kaunsa wicket ya run sequence tumhe sample league mein #1 tak le jaa sakta hai. Yeh ek simulator hai, guarantee nahi.',
      },
      en: {
        title: 'Can I still win?',
        body: 'It shows which wicket or run sequence could lift you to #1 in the sample league. It is a simulator, not a guarantee.',
      },
      hi: {
        title: 'क्या मैं अभी भी जीत सकता हूँ?',
        body: 'यह बताता है कि कौन सा विकेट या रन-सीक्वेंस आपको सैंपल लीग में #1 तक ले जा सकता है। यह सिम्युलेटर है, गारंटी नहीं।',
      },
    },
  },
  {
    id: 'actions',
    target: 'actions',
    durationMs: 10000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Kuch miss ho gaya?',
        body: '"Catch Me Up" last kuch overs ka recap deta hai. "Why Out?" batata hai wicket ka credit kisko mila. Run out mein bowler ko kuch nahi milta.',
      },
      en: {
        title: 'Missed something?',
        body: '"Catch Me Up" recaps the last few overs. "Why Out?" shows who gets credit for a wicket. On a run out the bowler gets nothing.',
      },
      hi: {
        title: 'कुछ छूट गया?',
        body: '"Catch Me Up" पिछले कुछ ओवर का रिकैप देता है। "Why Out?" बताता है कि विकेट का क्रेडिट किसे मिला। रन आउट में गेंदबाज़ को कुछ नहीं मिलता।',
      },
    },
  },
  {
    id: 'ask-pulse',
    target: 'ask-pulse',
    durationMs: 11000,
    onEnter: 'pause',
    copy: {
      hinglish: {
        title: 'Ask Pulse AI: Sawaal poocho',
        body: '"Mera rank kyu gira?", "Shami ke kitne points hain?" ya "Agar Rahul captain hota toh?". Zero-math AI har number tool se verify karta hai.',
      },
      en: {
        title: 'Ask Pulse AI: Ask anything',
        body: '"Why did my rank drop?", "What if Shami was captain?", or "How did that wicket fall?". Zero-Math AI verifies every number with deterministic tools.',
      },
      hi: {
        title: 'Ask Pulse AI: कोई भी सवाल पूछें',
        body: '"मेरी रैंक क्यों गिरी?", "शमी के कितने पॉइंट हैं?" या "अगर राहुल कप्तान होता तो?". ज़ीरो-मैथ AI हर नंबर को टूल से सत्यापित करता है।',
      },
    },
  },
  {
    id: 'honest',
    target: null,
    durationMs: 10000,
    onEnter: 'pause',
    copy: {
      hinglish: {
        title: 'Seedhi baat',
        body: 'Yeh ek purane match ka replay hai, live feed nahi. Rivals aur fan room sample hain. What-If aur Backtest sirf educational hindsight hain, prediction nahi. Pulse samjhata hai, betting ki salah nahi deta. 18+.',
      },
      en: {
        title: 'Straight talk',
        body: 'This is a replay of a past match, not a live feed. Rivals and the fan room are samples. What-If and Backtest models provide educational hindsight, not predictions. Pulse gives no betting advice. 18+.',
      },
      hi: {
        title: 'सीधी बात',
        body: 'यह एक पुराने मैच का रीप्ले है, लाइव फ़ीड नहीं। प्रतिद्वंद्वी और फ़ैन रूम सैंपल हैं। व्हाट-इफ़ और बैकटेस्ट केवल पिछली समझ के लिए हैं, भविष्यवाणी नहीं। Pulse बेटिंग की सलाह नहीं देता। 18+।',
      },
    },
  },
];

export const TOUR_TOTAL_MS = TOUR_STEPS.reduce((s, t) => s + t.durationMs, 0);

export interface TourState {
  step: number; // index into TOUR_STEPS; -1 = closed
  paused: boolean;
}

export type TourEvent =
  | { type: 'start' }
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'togglePause' };

export const TOUR_CLOSED: TourState = { step: -1, paused: false };

export function tourReducer(
  state: TourState,
  ev: TourEvent,
  total: number = TOUR_STEPS.length
): TourState {
  switch (ev.type) {
    case 'start':
      return { step: 0, paused: false };
    case 'skip':
      return TOUR_CLOSED;
    case 'togglePause':
      return state.step < 0 ? state : { ...state, paused: !state.paused };
    case 'next':
      if (state.step < 0) return state;
      return state.step + 1 >= total ? TOUR_CLOSED : { ...state, step: state.step + 1 };
    case 'back':
      if (state.step <= 0) return state;
      return { ...state, step: state.step - 1 };
  }
}
