/**
 * System-wide demo and guided tour definitions.
 * Connects the 5 core modules of Pulse:
 *   1. Builder   (/build)     - Pre-match team optimization & mathematical modes
 *   2. Match     (/match)     - Ball-by-ball companion, AI live nudges & why out
 *   3. Intel Lab (/intel-lab) - Monte Carlo rank forecast & win probability swings
 *   4. Social    (/share)     - Friend contest leaderboard & dynamic brag cards
 *   5. Evals     (/evals)     - 100% numeric faithfulness & trust engineering
 */
import type { TourStep } from '@/app/match/_shell/tour';

export interface SystemStage {
  id: 'builder' | 'match' | 'intel' | 'social' | 'evals';
  path: string;
  num: number;
  badge: string;
  title: Record<'en' | 'hinglish' | 'hi', string>;
  summary: Record<'en' | 'hinglish' | 'hi', string>;
}

export const SYSTEM_STAGES: SystemStage[] = [
  {
    id: 'builder',
    path: '/build?demo=1',
    num: 1,
    badge: 'Pre-Match',
    title: {
      en: '1. Team Builder',
      hinglish: '1. Team Builder',
      hi: '1. टीम बिल्डर',
    },
    summary: {
      en: 'Mathematical team optimizer with Floor/Ceiling modes & Dream11 constraints',
      hinglish: '100 credits mein 3 distinct mathematical modes aur captaincy logic',
      hi: '100 क्रेडिट में 3 गणितीय मोड्स और कप्तानी का सटीक तर्क',
    },
  },
  {
    id: 'match',
    path: '/match?demo=1',
    num: 2,
    badge: 'Live Game',
    title: {
      en: '2. Live Match',
      hinglish: '2. Live Match',
      hi: '2. लाइव मैच',
    },
    summary: {
      en: 'Ball-by-ball fantasy tracker, live AI nudges, Why Out & Catch Me Up',
      hinglish: 'Har ball ke points, rank drops aur live Hinglish nudges',
      hi: 'हर गेंद के पॉइंट, रैंक में बदलाव और लाइव नज',
    },
  },
  {
    id: 'intel',
    path: '/intel-lab?demo=1',
    num: 3,
    badge: 'Intelligence',
    title: {
      en: '3. Intel Lab',
      hinglish: '3. Intel Lab',
      hi: '3. इंटेल लैब',
    },
    summary: {
      en: 'Monte Carlo rank forecast (1,000 simulations) & win probability shift curves',
      hinglish: '1,000 simulations se rank forecast aur What-If captain simulator',
      hi: '1,000 सिमुलेशन से रैंक का अनुमान और व्हाट-इफ़ सिम्युलेटर',
    },
  },
  {
    id: 'social',
    path: '/share?demo=1',
    num: 4,
    badge: 'Social',
    title: {
      en: '4. Social & Friends',
      hinglish: '4. Social & Friends',
      hi: '4. सोशल और दोस्त',
    },
    summary: {
      en: 'Shareable brag cards, friend mini-league standings & live banter',
      hinglish: 'WhatsApp brag cards, friend contest aur simulated overtake alerts',
      hi: 'शेयर करने योग्य कार्ड्स, दोस्तों की लीग और ओवरटेक अलर्ट',
    },
  },
  {
    id: 'evals',
    path: '/evals?demo=1',
    num: 5,
    badge: 'Guardrails',
    title: {
      en: '5. Trust & Evals',
      hinglish: '5. Trust & Evals',
      hi: '5. विश्वसनीयता और इवैल',
    },
    summary: {
      en: '102 golden tests, 100% numeric faithfulness & live Groq benchmark',
      hinglish: '100% Zero-Math AI Invariant, 0% hallucinations aur safety benchmark',
      hi: '100% संख्यात्मक सटीकता, जीरो हैलूसिनेशन और सुरक्षा जांच',
    },
  },
];

/** 1. Builder page guided tour steps */
export const BUILDER_TOUR_STEPS: TourStep[] = [
  {
    id: 'builder-welcome',
    target: null,
    durationMs: 9000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Stage 1: Pre-Match Team Builder',
        body: 'Match shuru hone se pehle, fans ko 100 credits ke andar 11 khiladi chunne hote hain. Pulse ka integer optimizer andaza lagane ke bajaye 3 mathematical strategies banata hai.',
      },
      en: {
        title: 'Stage 1: Pre-Match Team Builder',
        body: 'Before the live match begins, fantasy fans must pick 11 players within 100 credits across strict constraints. Pulse uses an integer optimizer to produce 3 mathematical strategies.',
      },
      hi: {
        title: 'स्टेज 1: मैच-पूर्व टीम बिल्डर',
        body: 'मैच शुरू होने से पहले 100 क्रेडिट में 11 खिलाड़ी चुनना एक चुनौती होती है। Pulse का ऑप्टिमाइज़र बिना किसी अंदाजे के 3 सटीक गणितीय रणनीतियाँ तैयार करता है।',
      },
    },
  },
  {
    id: 'builder-modes',
    target: 'builder-modes',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: '3 Mathematical Optimization Modes',
        body: 'Floor mode Head-to-Head leagues ke liye safe consistent points deta hai. Ceiling mode Grand Leagues ke liye explosive upside chunta hai. Differential mode kam-ownership wale hidden gems pick karta hai.',
      },
      en: {
        title: '3 Strategic Optimization Modes',
        body: 'Floor mode minimizes variance for safe Head-to-Head contests. Ceiling mode maximizes explosive ceiling for Mega Grand Leagues. Differential targets low-ownership gems to beat the crowd.',
      },
      hi: {
        title: '3 रणनीतिक ऑप्टिमाइज़ेशन मोड्स',
        body: 'फ़्लोर मोड हेड-टू-हेड लीग के लिए सुरक्षित पॉइंट्स देता है। सीलिंग मोड मेगा लीग के लिए बड़ा स्कोर बनाता है। डिफ़रेंशियल कम चुने गए खिलाड़ियों से बढ़त दिलाता है।',
      },
    },
  },
  {
    id: 'builder-roster',
    target: 'builder-roster',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Dream11 Constraints & Lock System',
        body: 'Har team Dream11 rules follow karti hai: exactly 100 max credits, 1-8 WK/BAT/AR/BOWL, max 7 per team. Aap apne pasandeeda player ko Lock kar sakte ho, ya Exclude kar sakte ho.',
      },
      en: {
        title: 'Dream11 Constraints & Lock System',
        body: 'Every generated team strictly respects: 100 max credits, 1-8 WK/BAT/AR/BOWL, max 7 per franchise. Tap to lock your must-have picks or exclude players you want to bench.',
      },
      hi: {
        title: 'ड्रीम11 नियम और लॉक सिस्टम',
        body: 'हर टीम सभी नियमों का पालन करती है: अधिकतम 100 क्रेडिट और हर रोल की सीमा। अपने पसंदीदा खिलाड़ी को लॉक करें या बाहर रखें।',
      },
    },
  },
  {
    id: 'builder-captain',
    target: 'builder-captain',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Data-Backed Captaincy (2x aur 1.5x)',
        body: 'Captain ko 2x aur Vice-Captain ko 1.5x points milte hain. Pulse form, pitch aur role ke hisaab se transparent reason batata hai ki kisko captain banaya gaya hai.',
      },
      en: {
        title: 'Explainable Captaincy (2x & 1.5x)',
        body: 'Captain gives 2x and Vice-Captain gives 1.5x. Pulse provides transparent rationale based on pitch conditions, projected role, and form rather than gut hunches.',
      },
      hi: {
        title: 'कप्तानी का सटीक तर्क (2x और 1.5x)',
        body: 'कप्तान 2x और उप-कप्तान 1.5x पॉइंट देते हैं। Pulse आंकड़ों और पिच की स्थिति के आधार पर पारदर्शी कारण बताता है।',
      },
    },
  },
  {
    id: 'builder-backtest',
    target: 'builder-backtest',
    durationMs: 12000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Ye team kaisi chalti? (Hindsight Backtest)',
        body: 'Apni banayi team ko actual match par test karo. Yeh batata hai ki aapke best aur weakest picks kaun the, aur ideal Dream XI ke muqable kitne points mile. Saaf disclaimer: Yeh sirf 1 match ka hindsight hai, koi prediction ya future guarantee nahi!',
      },
      en: {
        title: 'Hindsight Backtest: "How would this have done?"',
        body: 'Stress-test your generated XI against actual historical match results. Inspect your best and weakest picks, and compare against the theoretical ideal XI. Explicit disclaimer: This is 1-match retrospective hindsight, not a prediction or proof of future accuracy.',
      },
      hi: {
        title: 'हाइंडसाइट बैकटेस्ट: यह टीम कैसी चलती?',
        body: 'अपनी टीम को पिछले मैच के वास्तविक परिणाम पर परखें। सर्वश्रेष्ठ और कमजोर खिलाड़ी देखें। पारदर्शी चेतावनी: यह केवल 1 मैच का पिछला विश्लेषण है, भविष्य की कोई गारंटीकृत भविष्यवाणी नहीं।',
      },
    },
  },
  {
    id: 'builder-golive',
    target: 'builder-golive',
    durationMs: 10000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Ek Click mein Live Match mein jao',
        body: 'Jab team ready ho jaye, "Go Live" dabao. Yeh custom XI seedhe Live Match companion mein chali jaati hai jahan har ball par aapki team track hogi!',
      },
      en: {
        title: 'One-Click Export to Live Match',
        body: 'When satisfied with your XI, tap "Go Live" to export this team directly into the live ball-by-ball companion tracker!',
      },
      hi: {
        title: 'एक क्लिक में लाइव मैच में जाएं',
        body: 'टीम पसंद आने पर "Go Live" दबाएं और इस टीम के साथ सीधे लाइव मैच ट्रैकर में प्रवेश करें!',
      },
    },
  },
];

/** 3. Intel Lab guided tour steps */
export const INTEL_TOUR_STEPS: TourStep[] = [
  {
    id: 'intel-welcome',
    target: null,
    durationMs: 9000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Stage 3: Match Intelligence Lab',
        body: 'Live match mein fan hamesha anxiety mein hote hain: "Kya main abhi bhi jeet sakta hoon?" Intel Lab andaze lagane ke bajaye real probabilistic modeling se jawab deta hai.',
      },
      en: {
        title: 'Stage 3: Match Intelligence Lab',
        body: 'During live matches fans face high anxiety: "Can I still win?" Pulse Intel Lab turns guessing into clear, probabilistic answers.',
      },
      hi: {
        title: 'स्टेज 3: मैच इंटेलिजेंस लैब',
        body: 'लाइव मैच के दौरान प्रशंसकों की सबसे बड़ी चिंता होती है: "क्या मैं अब भी जीत सकता हूँ?" इंटेल लैब सांख्यिकीय सिमुलेशन से इसका उत्तर देती है।',
      },
    },
  },
  {
    id: 'intel-forecast',
    target: 'intel-forecast',
    durationMs: 12000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Monte Carlo Rank Forecast (1,000 Paths)',
        body: 'Bache hue match par 1,000 game-tree simulations chalata hai. Yeh aapke #1 aane ke chances, expected final rank aur point distribution dikhata hai.',
      },
      en: {
        title: 'Monte Carlo Rank Forecast (1,000 Paths)',
        body: 'Runs 1,000 game-tree simulations over remaining deliveries to project your probability of finishing #1 and expected final rank distribution.',
      },
      hi: {
        title: 'मोंटे कार्लो रैंक का अनुमान (1,000 पाथ्स)',
        body: 'बची हुई गेंदों पर 1,000 सिमुलेशन चलाकर बताता है कि आपके #1 आने की क्या संभावना है और संभावित अंतिम रैंक क्या होगी।',
      },
    },
  },
  {
    id: 'intel-winprob',
    target: 'intel-winprob',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Live Win Probability & Momentum',
        body: 'Har ball par match ki win probability curve badalti hai. Dekhiye kis wicket ya boundary ne match aur aapki league standings mein sabse bada swing laya.',
      },
      en: {
        title: 'Live Win Probability & Momentum',
        body: 'Tracks real-time win probability shifts ball-by-ball. See which wickets or boundaries caused the biggest momentum swings for both the match and your fantasy team.',
      },
      hi: {
        title: 'लाइव मैच और जीत की संभावना',
        body: 'हर गेंद पर जीत की संभावना का ग्राफ़। देखें किस विकेट या चौके से मैच और आपकी फैंटेसी रैंकिंग में सबसे बड़ा बदलाव आया।',
      },
    },
  },
  {
    id: 'intel-whatif',
    target: 'intel-whatif',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Captain Hindsight Simulator (What-If)',
        body: '"Agar maine Samson ki jagah KL Rahul ko captain banaya hota toh?" Yeh tool milliseconds mein recalculate karke points ka exact net difference batata hai.',
      },
      en: {
        title: 'Captain Hindsight Simulator (What-If)',
        body: '"What if I had captained KL Rahul instead of Sanju Samson?" In milliseconds, this tool recalculates the exact point delta in hindsight.',
      },
      hi: {
        title: 'व्हाट-इफ़ कप्तान सिम्युलेटर',
        body: '"अगर मैंने संजू सैमसन की जगह केएल राहुल को कप्तान बनाया होता तो?" यह टूल तुरंत पॉइंट्स का सटीक अंतर बताता है।',
      },
    },
  },
];

/** 4. Social & Sharing guided tour steps */
export const SOCIAL_TOUR_STEPS: TourStep[] = [
  {
    id: 'social-welcome',
    target: null,
    durationMs: 9000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Stage 4: Pulse Social & Mini-Leagues',
        body: 'Fantasy cricket dosto ke saath khelne se sabse mazedaar banta hai. Pulse celebration aur dosto ke beech banter ko automatic cards se asaan banata hai.',
      },
      en: {
        title: 'Stage 4: Pulse Social & Mini-Leagues',
        body: 'Fantasy cricket is a community experience. Pulse empowers fans to celebrate milestones and engage in banter with friends in private mini-leagues.',
      },
      hi: {
        title: 'स्टेज 4: पल्स सोशल और मिनी-लीग',
        body: 'फ़ैंटेसी क्रिकेट दोस्तों के साथ खेलने में सबसे मज़ेदार है। Pulse उपलब्धियों को साझा करने और दोस्तों से बात करने को आसान बनाता है।',
      },
    },
  },
  {
    id: 'social-cards',
    target: 'share-cards',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Automated Brag Cards',
        body: 'Jab aapka captain milestone kare, rank spike ho ya close finish ho, WhatsApp aur social media ke liye instant high-contrast visual cards ban jaate hain.',
      },
      en: {
        title: 'Automated Visual Brag Cards',
        body: 'Generates real-time, high-contrast shareable cards for WhatsApp whenever your captain performs, your rank spikes, or you survive a close finish.',
      },
      hi: {
        title: 'ऑटोमेटेड ब्रैग कार्ड्स',
        body: 'जब भी कप्तान अच्छा प्रदर्शन करे या रैंक बढ़े, WhatsApp पर शेयर करने के लिए खूबसूरत कार्ड्स तैयार होते हैं।',
      },
    },
  },
  {
    id: 'social-contest',
    target: 'share-contest',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Friends League & Overtake Alerts',
        body: 'Aapke aur aapke dosto ke beech points ka gap har ball par track hota hai. Jaise hi aap kisi dost se aage nikalte ho, live overtake alert trigger hota hai.',
      },
      en: {
        title: 'Friends League & Overtake Alerts',
        body: 'Tracks point gaps between you and your friends ball-by-ball. Real-time notifications fire the instant you overtake a rival in your private group.',
      },
      hi: {
        title: 'फ्रेंड्स लीग और ओवरटेक अलर्ट',
        body: 'दोस्तों के बीच पॉइंट्स का अंतर हर गेंद पर ट्रैक होता है। किसी दोस्त से आगे निकलते ही तुरंत अलर्ट आता है।',
      },
    },
  },
  {
    id: 'social-honest',
    target: 'share-honest',
    durationMs: 10000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Honesty & Responsible Entertainment',
        body: 'Saare cards aur social elements par saaf likha hota hai "IPL Replay / Demo Friends". Pulse sirf pure entertainment ke liye hai, koi betting advice nahi.',
      },
      en: {
        title: 'Honesty & Responsible Entertainment',
        body: 'All simulated social features carry clear watermarks: "IPL Replay / Demo Friends". Pulse provides pure entertainment with zero gambling advice.',
      },
      hi: {
        title: 'जिम्मेदारी और ईमानदारी',
        body: 'सभी कार्ड्स पर स्पष्ट रूप से "IPL Replay / Demo Friends" लिखा होता है। कोई सट्टेबाजी या वित्तीय सलाह नहीं दी जाती।',
      },
    },
  },
];

/** 5. Evals & Trust guided tour steps */
export const EVALS_TOUR_STEPS: TourStep[] = [
  {
    id: 'evals-welcome',
    target: null,
    durationMs: 9000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Stage 5: Trust & Reliability Engineering',
        body: 'Sports AI mein sabse badi mushkil hoti hai hallucination: model galat points bol deta hai. Pulse ne ise Zero-Math AI Invariant aur 102 golden tests se solve kiya hai.',
      },
      en: {
        title: 'Stage 5: Trust & Reliability Engineering',
        body: 'The hardest problem in sports AI is trust: models hallucinate numbers. Pulse solved this through a Zero-Math AI Invariant and 102 golden test cases.',
      },
      hi: {
        title: 'स्टेज 5: विश्वसनीयता और इंजीनियरिंग',
        body: 'स्पोर्ट्स AI में सबसे बड़ी समस्या गलत आंकड़े बताना होती है। Pulse ने ज़ीरो-मैथ नियम और 102 टेस्ट से इसे पूरी तरह सुरक्षित किया है।',
      },
    },
  },
  {
    id: 'evals-numbers',
    target: 'evals-numbers',
    durationMs: 12000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: '100% Numeric Faithfulness Invariant',
        body: 'AI model ko points calculate karne ki permission nahi hai. Answer mein aane wala har ek number deterministic tool se cross-check hota hai.',
      },
      en: {
        title: '100% Numeric Faithfulness Invariant',
        body: 'The AI model is forbidden from computing scores or ranks. Every number in an answer is strictly whitelisted against deterministic tool execution outputs.',
      },
      hi: {
        title: '100% संख्यात्मक सटीकता नियम',
        body: 'AI को आंकड़े मन से गढ़ने की अनुमति नहीं है। हर नंबर पहले प्रमाणित टूल्स द्वारा जाँचा जाता है।',
      },
    },
  },
  {
    id: 'evals-guardrails',
    target: 'evals-guardrails',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: '100% Safety & Refusal Recall',
        body: 'Betting advice, financial predictions aur prompt injection attacks ko guardrails 100% block karti hain aur politely reject karti hain.',
      },
      en: {
        title: '100% Safety & Refusal Recall',
        body: 'Safety guardrails achieve 100% block rates against betting advice, financial guarantees, off-topic requests, and adversarial prompt injections.',
      },
      hi: {
        title: '100% सुरक्षा और गार्डरेल्स',
        body: 'सट्टेबाजी या वित्तीय सलाह मांगने वाले सवालों और प्रॉम्प्ट इंजेक्शन को गार्डरेल्स 100% रोक देती हैं।',
      },
    },
  },
  {
    id: 'evals-live',
    target: 'evals-live',
    durationMs: 11000,
    onEnter: 'none',
    copy: {
      hinglish: {
        title: 'Live Groq Benchmark & 0.5ms Fallback',
        body: 'Live Groq models multi-step tool calls karte hain. Agar network slow ho, deterministic fallback router 0.5ms mein bina rukaawat answer deliver karta hai.',
      },
      en: {
        title: 'Live Groq Benchmark & Sub-ms Fallback',
        body: 'Runs live Groq models with multi-step tool calling, backed by a sub-millisecond local router that takes over seamlessly if the network drops.',
      },
      hi: {
        title: 'लाइव ग्रॉक और सब-मिलीसेकंड फॉलबैक',
        body: 'Groq मॉडल टूल-कॉलिंग करता है। नेटवर्क न होने पर भी इन-बिल्ट इंजन 0.5 मिलीसेकंड में सही उत्तर देता है।',
      },
    },
  },
];

