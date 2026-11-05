import type { Lang, Mode, Role } from './types';

type Dict = {
  title: string;
  hook: string;
  illustrative: string;
  illustrativeLong: string;
  importBtn: string;
  importedNote: (n: number) => string;
  modes: Record<Mode, { name: string; blurb: string }>;
  autoBuild: string;
  rebuild: string;
  clear: string;
  creditsUsed: string;
  players: string;
  squad: string;
  all: string;
  roleName: Record<Role, string>;
  lock: string;
  unlock: string;
  exclude: string;
  include: string;
  expected: string;
  badDay: string;
  greatDay: string;
  ownership: string;
  team: string;
  teamTotal: string;
  creditsLeft: string;
  whyPick: string;
  whyTitle: string;
  captain: string;
  vc: string;
  aiLine: string;
  templateLine: string;
  thinking: string;
  backtestBtn: string;
  backtestTitle: string;
  backtestHindsight: string;
  rankOf: (r: number, n: number) => string;
  totalPts: string;
  hindsightBest: string;
  pctOfBest: (p: number) => string;
  bestPick: string;
  worstPick: string;
  sampleRivals: string;
  running: string;
  goLive: string;
  moreTeams: string;
  fewer: string;
  disclaimer: string;
  importTitle: string;
  importHelp: string;
  importPlaceholder: string;
  importApply: string;
  importClear: string;
  importMatched: (n: number) => string;
  importUnmatched: string;
  importBySurname: string;
  close: string;
  backHome: string;
  lockedHint: string;
  noBacktestFrames: string;
};

export const STR: Record<Lang, Dict> = {
  en: {
    title: 'Pulse Builder',
    hook: 'Match is about to start: which 11, and who captains?',
    illustrative: 'Illustrative model, not real form data',
    illustrativeLong:
      'Player names and teams are real. Roles, credits and projections are assumptions from a transparent model, not statistics. Import your own numbers to replace them.',
    importBtn: 'Import real projections',
    importedNote: (n) => `Your imported numbers are used for ${n} players; the rest are illustrative.`,
    modes: {
      safe: { name: 'Safe', blurb: 'Best "bad day" floor. Fewer nasty surprises.' },
      balanced: { name: 'Balanced', blurb: 'Highest expected points overall.' },
      grand: { name: 'Grand League', blurb: 'High upside + lower-owned picks to stand out in a big field.' },
    },
    autoBuild: 'Auto-build',
    rebuild: 'Rebuild',
    clear: 'Clear locks',
    creditsUsed: 'Credits',
    players: 'Players',
    squad: 'Squad',
    all: 'All',
    roleName: { WK: 'WK', BAT: 'BAT', AR: 'AR', BOWL: 'BOWL' },
    lock: 'Lock',
    unlock: 'Unlock',
    exclude: 'Skip',
    include: 'Undo skip',
    expected: 'Expected',
    badDay: 'Bad day',
    greatDay: 'Great day',
    ownership: 'Ownership',
    team: 'Team',
    teamTotal: 'Projected total with C/VC',
    creditsLeft: 'credits left',
    whyPick: 'Why this pick?',
    whyTitle: 'Why this pick?',
    captain: 'Captain',
    vc: 'Vice-Captain',
    aiLine: 'AI-narrated, numbers verified',
    templateLine: 'Standard explanation',
    thinking: 'Thinking...',
    backtestBtn: 'How would this have done?',
    backtestTitle: 'Hindsight check',
    backtestHindsight: 'Hindsight on ONE replayed match. Not a prediction, not proof the model works.',
    rankOf: (r, n) => `Rank ${r} of ${n}`,
    totalPts: 'Total points',
    hindsightBest: 'Best possible XI in hindsight',
    pctOfBest: (p) => `${p}% of that`,
    bestPick: 'Best pick',
    worstPick: 'Weakest pick',
    sampleRivals: 'Sample rivals (demo data)',
    running: 'Replaying the match...',
    goLive: 'Go Live with this team',
    moreTeams: 'Alternative teams',
    fewer: 'Fewer than 3 different teams fit your locks.',
    disclaimer: 'For fun and explanation only. Real matches can go either way.',
    importTitle: 'Import projections',
    importHelp: 'Paste CSV or rows copied from a sheet. Columns: name, expected points, floor, ceiling, ownership %. Only name + expected points are required.',
    importPlaceholder: 'name,expected,floor,ceiling,ownership\nKL Rahul,70,25,120,85',
    importApply: 'Apply',
    importClear: 'Remove imported numbers',
    importMatched: (n) => `${n} players updated`,
    importUnmatched: 'Not in this match, ignored:',
    importBySurname: 'Matched by surname, please check',
    close: 'Close',
    backHome: 'Home',
    lockedHint: 'Lock players you want in; Skip the ones you do not.',
    noBacktestFrames: 'Could not load the match replay. Check your connection and try again.',
  },
  hinglish: {
    title: 'Pulse Builder',
    hook: 'Match shuru hone wala hai: kaun se 11 players, aur captain kaun?',
    illustrative: 'Illustrative model, asli form data nahi',
    illustrativeLong:
      'Player names aur teams asli hain. Roles, credits aur projections ek transparent model ke assumptions hain, stats nahi. Apne numbers import karke inhe badal sakte ho.',
    importBtn: 'Asli projections import karo',
    importedNote: (n) => `${n} players ke liye aapke import kiye numbers use ho rahe hain; baaki illustrative hain.`,
    modes: {
      safe: { name: 'Safe', blurb: 'Best "bad day" floor. Kam bura surprise.' },
      balanced: { name: 'Balanced', blurb: 'Overall sabse zyada expected points.' },
      grand: { name: 'Grand League', blurb: 'High upside + kam-owned picks, badi bheed mein alag dikhne ke liye.' },
    },
    autoBuild: 'Auto-build',
    rebuild: 'Dobara banao',
    clear: 'Locks hatao',
    creditsUsed: 'Credits',
    players: 'Players',
    squad: 'Squad',
    all: 'Sab',
    roleName: { WK: 'WK', BAT: 'BAT', AR: 'AR', BOWL: 'BOWL' },
    lock: 'Lock',
    unlock: 'Unlock',
    exclude: 'Skip',
    include: 'Skip hatao',
    expected: 'Expected',
    badDay: 'Kharab din',
    greatDay: 'Shandar din',
    ownership: 'Ownership',
    team: 'Team',
    teamTotal: 'C/VC ke saath projected total',
    creditsLeft: 'credits bache',
    whyPick: 'Ye pick kyun?',
    whyTitle: 'Ye pick kyun?',
    captain: 'Captain',
    vc: 'Vice-Captain',
    aiLine: 'AI ne samjhaya, numbers verified',
    templateLine: 'Standard explanation',
    thinking: 'Soch raha hoon...',
    backtestBtn: 'Ye team kaisi chalti?',
    backtestTitle: 'Hindsight check',
    backtestHindsight: 'Sirf EK replay match par hindsight. Prediction nahi hai, aur ye model sahi hone ka saboot bhi nahi.',
    rankOf: (r, n) => `${n} mein se rank ${r}`,
    totalPts: 'Total points',
    hindsightBest: 'Hindsight mein best possible XI',
    pctOfBest: (p) => `uska ${p}%`,
    bestPick: 'Sabse achha pick',
    worstPick: 'Sabse kamzor pick',
    sampleRivals: 'Sample rivals (demo data)',
    running: 'Match replay ho raha hai...',
    goLive: 'Is team ke saath Live jao',
    moreTeams: 'Doosri teams',
    fewer: 'Aapke locks ke saath 3 alag teams nahi ban paayin.',
    disclaimer: 'Sirf masti aur samjhane ke liye. Asli match kuch bhi ho sakta hai.',
    importTitle: 'Projections import',
    importHelp: 'CSV ya sheet se copy ki hui rows paste karo. Columns: name, expected points, floor, ceiling, ownership %. Sirf name + expected points zaroori hain.',
    importPlaceholder: 'name,expected,floor,ceiling,ownership\nKL Rahul,70,25,120,85',
    importApply: 'Lagao',
    importClear: 'Import kiye numbers hatao',
    importMatched: (n) => `${n} players update hue`,
    importUnmatched: 'Is match mein nahi hain, ignore kiye:',
    importBySurname: 'Surname se match hua, ek baar check karo',
    close: 'Band karo',
    backHome: 'Home',
    lockedHint: 'Jo players chahiye unhe Lock karo; jo nahi chahiye unhe Skip karo.',
    noBacktestFrames: 'Match replay load nahi hua. Connection check karke dobara try karo.',
  },
  hi: {
    title: 'Pulse Builder',
    hook: 'मैच शुरू होने वाला है: कौन से 11 खिलाड़ी, और कप्तान कौन?',
    illustrative: 'उदाहरण मॉडल, असली फ़ॉर्म डेटा नहीं',
    illustrativeLong:
      'खिलाड़ियों के नाम और टीमें असली हैं। रोल, क्रेडिट और प्रोजेक्शन एक पारदर्शी मॉडल की मान्यताएँ हैं, आँकड़े नहीं। अपने नंबर इम्पोर्ट करके इन्हें बदल सकते हैं।',
    importBtn: 'असली प्रोजेक्शन इम्पोर्ट करें',
    importedNote: (n) => `${n} खिलाड़ियों के लिए आपके इम्पोर्ट किए नंबर इस्तेमाल हो रहे हैं; बाक़ी उदाहरण हैं।`,
    modes: {
      safe: { name: 'सेफ़', blurb: 'सबसे अच्छा "खराब दिन" फ़्लोर। कम बुरे सरप्राइज़।' },
      balanced: { name: 'बैलेंस्ड', blurb: 'कुल मिलाकर सबसे ज़्यादा अनुमानित पॉइंट्स।' },
      grand: { name: 'ग्रैंड लीग', blurb: 'ऊँचा ऊपरी अनुमान + कम चुने गए खिलाड़ी, बड़ी भीड़ में अलग दिखने के लिए।' },
    },
    autoBuild: 'ऑटो-बिल्ड',
    rebuild: 'दोबारा बनाएँ',
    clear: 'लॉक हटाएँ',
    creditsUsed: 'क्रेडिट',
    players: 'खिलाड़ी',
    squad: 'स्क्वाड',
    all: 'सभी',
    roleName: { WK: 'WK', BAT: 'BAT', AR: 'AR', BOWL: 'BOWL' },
    lock: 'लॉक',
    unlock: 'अनलॉक',
    exclude: 'छोड़ें',
    include: 'वापस लाएँ',
    expected: 'अनुमान',
    badDay: 'खराब दिन',
    greatDay: 'शानदार दिन',
    ownership: 'ओनरशिप',
    team: 'टीम',
    teamTotal: 'C/VC के साथ अनुमानित कुल',
    creditsLeft: 'क्रेडिट बचे',
    whyPick: 'यह चुनाव क्यों?',
    whyTitle: 'यह चुनाव क्यों?',
    captain: 'कप्तान',
    vc: 'उप-कप्तान',
    aiLine: 'AI ने समझाया, नंबर जाँचे हुए',
    templateLine: 'सामान्य व्याख्या',
    thinking: 'सोच रहा हूँ...',
    backtestBtn: 'यह टीम कैसी चलती?',
    backtestTitle: 'बीती बात की जाँच',
    backtestHindsight: 'सिर्फ़ एक रीप्ले मैच पर पीछे मुड़कर देखना। यह भविष्यवाणी नहीं है, न ही मॉडल सही होने का सबूत।',
    rankOf: (r, n) => `${n} में से रैंक ${r}`,
    totalPts: 'कुल पॉइंट्स',
    hindsightBest: 'बाद में पता चला सबसे अच्छी XI',
    pctOfBest: (p) => `उसका ${p}%`,
    bestPick: 'सबसे अच्छा चुनाव',
    worstPick: 'सबसे कमज़ोर चुनाव',
    sampleRivals: 'नमूना प्रतिद्वंद्वी (डेमो डेटा)',
    running: 'मैच रीप्ले हो रहा है...',
    goLive: 'इस टीम के साथ लाइव जाएँ',
    moreTeams: 'दूसरी टीमें',
    fewer: 'आपके लॉक के साथ 3 अलग टीमें नहीं बन पाईं।',
    disclaimer: 'सिर्फ़ मनोरंजन और समझाने के लिए। असली मैच कुछ भी हो सकता है।',
    importTitle: 'प्रोजेक्शन इम्पोर्ट',
    importHelp: 'CSV या शीट से कॉपी की हुई पंक्तियाँ पेस्ट करें। कॉलम: नाम, अनुमानित पॉइंट्स, फ़्लोर, सीलिंग, ओनरशिप %। सिर्फ़ नाम और अनुमानित पॉइंट्स ज़रूरी हैं।',
    importPlaceholder: 'name,expected,floor,ceiling,ownership\nKL Rahul,70,25,120,85',
    importApply: 'लागू करें',
    importClear: 'इम्पोर्ट किए नंबर हटाएँ',
    importMatched: (n) => `${n} खिलाड़ी अपडेट हुए`,
    importUnmatched: 'इस मैच में नहीं हैं, छोड़े गए:',
    importBySurname: 'सरनेम से मिलान हुआ, एक बार जाँच लें',
    close: 'बंद करें',
    backHome: 'होम',
    lockedHint: 'जो खिलाड़ी चाहिए उन्हें लॉक करें; जो नहीं चाहिए उन्हें छोड़ें।',
    noBacktestFrames: 'मैच रीप्ले लोड नहीं हुआ। कनेक्शन जाँचकर दोबारा कोशिश करें।',
  },
};
