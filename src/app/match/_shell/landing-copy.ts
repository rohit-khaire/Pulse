export type Lang = 'en' | 'hinglish' | 'hi';

export const LANDING: Record<
  Lang,
  {
    h1a: string;
    h1b: string;
    sub: string;
    qTitle: string;
    questions: { q: string; a: string }[];
    cta: string;
    ctaSub: string;
    build: string;
    buildTeam: string;
    demoTitle: string;
    demoLabel: string;
    phases: [string, string, string];
    pause: string;
    play: string;
    scopeTitle: string;
    scope: string[];
    watch: string;
  }
> = {
  hinglish: {
    h1a: 'Har match moment ka matlab,',
    h1b: 'tumhari fantasy team ke liye.',
    sub: 'TV sirf match dikhata hai. Pulse batata hai ki har ball ne tumhari fantasy team ka kya kiya, aur kyun.',
    qTitle: 'Teen sawaal, teen jawaab',
    questions: [
      { q: '"Mera rank kyu gira?"', a: 'Har bade moment par chhota nudge: kitne points mile, kisne diye, captain ka multiplier kitna laga.' },
      { q: '"Kya main abhi bhi jeet sakta hoon?"', a: 'Path to Victory dikhata hai ki kaunsa wicket ya run sequence tumhe sample league mein #1 tak le jaa sakta hai.' },
      { q: '"Maine kya miss kiya?"', a: 'Catch Me Up last kuch overs ka recap deta hai. Why Out? batata hai wicket ka credit kisko mila.' },
    ],
    cta: 'Sample team se dekho',
    ctaSub: '20 second mein shuru, koi sign-up nahi',
    build: 'Apni team banao',
    buildTeam: 'Ya apni XI khud chuno',
    demoTitle: '20 second mein dekho Pulse kaise kaam karta hai',
    demoLabel: 'Asli replay, sample XI',
    phases: ['Match chal raha hai', 'Wicket!', 'Aapko nudge mila'],
    pause: 'Demo roko',
    play: 'Demo chalao',
    scopeTitle: 'Seedhi baat',
    scope: [
      'Yeh ek asli IPL match ka replay hai (Cricsheet data), live feed nahi.',
      'Rivals aur Fan Room sample / simulated hain.',
      'Points Dream11 T20 rules ka approximation hain.',
      'Pulse samjhata hai. Betting ya jeetne ki salah nahi deta. 18+.',
    ],
    watch: 'Match dekho',
  },
  en: {
    h1a: 'Understand what every match moment',
    h1b: 'means for your fantasy team.',
    sub: 'The TV only shows the match. Pulse tells you what each ball did to your fantasy team, and why.',
    qTitle: 'Three questions, three answers',
    questions: [
      { q: '"Why did my rank drop?"', a: 'A short nudge on every big moment: points earned, who earned them, and the captain multiplier.' },
      { q: '"Can I still win?"', a: 'Path to Victory shows which wicket or run sequence could lift you to #1 in the sample league.' },
      { q: '"What did I miss?"', a: 'Catch Me Up recaps the last few overs. Why Out? shows who gets credit for a wicket.' },
    ],
    cta: 'Try it with a sample team',
    ctaSub: 'Starts in seconds, no sign-up',
    build: 'Build your team',
    buildTeam: 'Or pick your own XI',
    demoTitle: 'See Pulse work in 20 seconds',
    demoLabel: 'Real replay, sample XI',
    phases: ['The match is on', 'Wicket!', 'Your nudge arrives'],
    pause: 'Pause demo',
    play: 'Play demo',
    scopeTitle: 'Honest scope',
    scope: [
      'A replay of a real IPL match (Cricsheet data), not a live feed.',
      'Rivals and the Fan Room are samples / simulated.',
      'Points approximate Dream11 T20 rules.',
      'Pulse is an explainer. No betting or winning advice. 18+.',
    ],
    watch: 'Watch the match',
  },
  hi: {
    h1a: 'हर मैच मोमेंट का मतलब,',
    h1b: 'आपकी फ़ैंटेसी टीम के लिए।',
    sub: 'टीवी सिर्फ़ मैच दिखाता है। Pulse बताता है कि हर गेंद ने आपकी फ़ैंटेसी टीम का क्या किया, और क्यों।',
    qTitle: 'तीन सवाल, तीन जवाब',
    questions: [
      { q: '"मेरी रैंक क्यों गिरी?"', a: 'हर बड़े पल पर छोटा नज: कितने पॉइंट मिले, किसने दिए, कप्तान का मल्टीप्लायर कितना लगा।' },
      { q: '"क्या मैं अभी भी जीत सकता हूँ?"', a: 'Path to Victory दिखाता है कि कौन सा विकेट या रन-सीक्वेंस आपको सैंपल लीग में #1 तक ले जा सकता है।' },
      { q: '"मुझसे क्या छूट गया?"', a: 'Catch Me Up पिछले कुछ ओवर का रिकैप देता है। Why Out? बताता है कि विकेट का क्रेडिट किसे मिला।' },
    ],
    cta: 'सैंपल टीम से देखिए',
    ctaSub: 'सेकंडों में शुरू, साइन-अप नहीं',
    build: 'अपनी टीम बनाएँ',
    buildTeam: 'या अपनी XI ख़ुद चुनें',
    demoTitle: '20 सेकंड में देखिए Pulse कैसे काम करता है',
    demoLabel: 'असली रीप्ले, सैंपल XI',
    phases: ['मैच चल रहा है', 'विकेट!', 'आपका नज आया'],
    pause: 'डेमो रोकें',
    play: 'डेमो चलाएँ',
    scopeTitle: 'सीधी बात',
    scope: [
      'यह एक असली IPL मैच का रीप्ले है (Cricsheet डेटा), लाइव फ़ीड नहीं।',
      'राइवल्स और फ़ैन रूम सैंपल / सिम्युलेटेड हैं।',
      'पॉइंट्स Dream11 T20 नियमों का अनुमान हैं।',
      'Pulse समझाता है। बेटिंग या जीत की सलाह नहीं। 18+।',
    ],
    watch: 'मैच देखिए',
  },
};
