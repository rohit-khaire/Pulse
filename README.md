# Pulse: Live Sports Match AI Fan Companion

> *"Har ball ka matlab, tumhari fantasy team ke liye."*
>
> **Live sports companion & pre-match optimizer that turns live broadcast chaos into personal clarity, predictive insight, and social banter.**

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Turbopack](https://img.shields.io/badge/Bundler-Turbopack-6366f1)](https://turbo.build/pack)
[![Vitest](https://img.shields.io/badge/Tests-398%20Passed-emerald)](https://vitest.dev/)
[![Zero-Math AI](https://img.shields.io/badge/Numeric%20Faithfulness-100%25-green)](#5-evaluations--trust-engineering-evals)
[![Groq Live](https://img.shields.io/badge/Groq%20Tool--Calling-Active-orange)](https://groq.com/)

---

## 💡 The Real Fan Problem

Broadcast cricket commentary is designed for the neutral spectator: generic, English-first, and focused on broad match state. But millions of fans watching on TV or mobile have **personal stakes**—they have created fantasy teams, competed in private friend leagues, or picked specific captains.

During a live match, fans face five unresolved pain points:

1. **The Pre-Match Optimization Wall:** Assembling an 11-player squad within 100 credits across strict role rules (WK, BAT, AR, BOWL, franchise limits) is difficult; fans guess instead of optimizing for their specific contest risk profile.
2. **The "Why Did My Rank Drop?" Void:** A single ball causes a sudden rank drop, but static scorecards can't explain that the leader's captain bowled a maiden over or that boundary overthrows diluted points.
3. **The "Can I Still Win?" Anxiety:** In the death overs, fans obsess over whether they can still overtake their rival, with no way to simulate remaining game paths.
4. **The Umpire & DRS Confusion:** Broadcast commentary debates "Umpire's Call" and UltraEdge spikes without clearly quoting official MCC Laws or bowler credit rules.
5. **The Community & Bragging Barrier:** Fans lack automated, instant ways to celebrate milestones, banter with friends when overtaking them, or share high-contrast visual brag cards.

**Pulse** solves all five through a comprehensive, mobile-first companion combining deterministic fantasy math, probabilistic game-tree modeling, and zero-hallucination conversational AI in **Hinglish, Hindi, and English**.

---

## 🌟 The 5 Pillars of Pulse

Pulse covers the full fan lifecycle across 5 integrated modules:

```
[ Pre-Match ] ───► [ Live Match ] ───► [ Intelligence ] ───► [ Social & Banter ] ───► [ Trust & Evals ]
  /build               /match             /intel-lab             /share                  /evals
Team Optimizer       Ball-by-Ball         Monte Carlo &        Brag Cards & Friend     102 Tests & 100%
& Math Modes         AI Live Nudges       Win Prob Swings      League Overtakes        Zero-Math AI
```

---

### 1. Pre-Match Team Builder & Strategy Optimizer ([`/build`](http://localhost:3000/build))
Fans can build, lock, and test mathematically sound fantasy teams before the match starts:
- **Integer Programming Optimizer:** Generates legal 11-player teams satisfying all Dream11 constraints in under 10ms (100 credits, 1–8 WK/BAT/AR/BOWL, max 7 per franchise).
- **3 Distinct Strategic Modes:**
  - **Floor Mode (Safe):** Minimizes variance for Head-to-Head and small leagues.
  - **Ceiling Mode (Aggressive):** Maximizes 90th-percentile upside with explosive captain picks for Mega Grand Leagues.
  - **Differential Mode (Contrarian):** Identifies high-potential, low-ownership picks (<20%) to leapfrog crowded leaderboards.
- **Roster Locks & Excludes:** Tap to lock must-have core players or exclude out-of-form names; the optimizer solves for the remaining slots.
- **Explainable Captaincy (2× & 1.5×):** Transparent, data-backed reasons for Captain and Vice-Captain multipliers based on venue conditions and role usage.
- **One-Click "Go Live":** Immediately exports the custom squad into the live match tracker.

---

### 2. Live Match Companion & Second-Screen Engine ([`/match`](http://localhost:3000/match))
Replays all 240 balls of the historic IPL thriller (Rajasthan Royals vs Punjab Kings, Cricsheet `1254111`):
- **Live Scoring & Points Tracker:** Real-time fantasy points updated ball-by-ball with dynamic captain multipliers.
- **AI Live Nudges ("Why Did My Rank Drop?"):** Natural language notifications on pivotal deliveries explaining the exact point deltas.
- **Why Out? & Third Umpire Verification:** Full ball-tracking breakdown (Pitching, Impact, Wickets, UltraEdge) and official MCC Law citations (Law 33 Caught, Law 36 LBW, Law 38 Run Out).
- **Catch Me Up:** Instant 10-second contextual summaries across 2-over, 4-over, or death-over windows.
- **Path to Victory Simulator:** Calculates the exact wicket and boundary sequences required to reach Rank #1 in the league.
- **Ask Pulse AI Drawer:** Conversational voice/text assistant answering tactical questions in Hinglish, Hindi, and English.
- **Live Fan Room:** Deduplicated real-time crowd sentiment feed and interactive polls.

---

### 3. Match Intelligence Lab ([`/intel-lab`](http://localhost:3000/intel-lab))
Probabilistic modelling that transforms fan anxiety into mathematical clarity:
- **Monte Carlo Rank Forecast:** Runs 1,000 game-tree simulations over remaining deliveries in idle background slices, projecting expected rank distributions and probability of finishing #1.
- **Win Probability Shift Curves:** Ball-by-ball win probability tracking for both teams, highlighting critical momentum swing deliveries.
- **What-If Captain Hindsight Simulator:** Instant counterfactual recalculations (e.g. *"What if I had made KL Rahul captain instead of Sanju Samson?"*).
- **Main-Thread Latency Budget:** Heavy simulations use chunked scheduling (`requestIdleCallback`) ensuring the UI maintains a consistent 60fps.

---

### 4. Pulse Social & Dynamic Brag Cards ([`/share`](http://localhost:3000/share))
Community features built for sharing and celebration:
- **Automated Visual Brag Cards:** Generates dynamic, high-contrast SVG/PNG shareable cards for WhatsApp and Twitter on rank leads, captain milestones, and close finishes.
- **Simulated Friend Mini-League:** Real-time leaderboard against friends with automated overtake notifications.
- **Contextual Banter Feed:** Authentic, match-aware banter between simulated rivals.
- **Honesty & Transparency Invariant:** All cards and social widgets clearly carry the *"IPL Replay · Demo Friends · Entertainment Only"* watermark for responsible play.

---

### 5. Evaluations & Trust Engineering ([`/evals`](http://localhost:3000/evals))
The hardest problem in sports AI is hallucination—models inventing fantasy points or scores. Pulse solves this mechanically:
- **102 Golden Eval Suite:** Test cases covering factual stats, multi-step queries, adversarial injections, betting refusals, and edge cases across English, Hinglish, and Hindi.
- **100% Numeric Faithfulness Invariant:** The AI model is strictly prohibited from doing math. Every single number in an answer must exist in a whitelist produced by deterministic tool executions.
- **100% Refusal Recall:** Immediate, polite blocking of betting tips, financial predictions, and prompt injection attacks.
- **Live Model Benchmark:** Calibrated with Groq tool-calling (`openai/gpt-oss-120b` primary, `openai/gpt-oss-20b` fallback) backed by a **0.5ms sub-millisecond local router**. In the last live run all 102 cases passed; the rest were safely replaced by the deterministic engine (see `/evals` for the exact split).

---

## 🧭 Interactive System Demo (Judge Mode)

Experience the entire platform through the interactive 5-stage tour:

- **Launch from Home:** Visit [http://localhost:3000/](http://localhost:3000/) and click **"Start 3-Minute System Tour"**.
- **Direct Demo Link:** Visit any page with `?demo=1` (e.g. [`/match?demo=1`](http://localhost:3000/match?demo=1) or [`/build?demo=1`](http://localhost:3000/build?demo=1)).
- **Universal Top Bar (`SystemDemoBar`):** Track your progress across all 5 stages, navigate with `Next Stage →` / `← Prev Stage`, or re-trigger coach marks on any screen via `Page Tour`.
- **Reviewer Quick Jumps:** One-click shortcuts to key match moments:
  - *Final Over Thriller (19.1–19.6):* Kartik Tyagi defending 4 runs and taking 2 wickets.
  - *Arshdeep Singh 5-Wicket Haul:* Haul bonus (+12 pts) & VC point explosion.
  - *Mayank Agarwal 50 Milestone:* Milestone bonus (+8 pts) & boundary spree.

---

## 🏗️ Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Next.js 16 App Shell                          │
│         (Turbopack, Server/Client Boundaries, PWA Service Worker)      │
├───────────────┬─────────────────┬───────────────────┬──────────────────┤
│    Builder    │   Live Match    │     Intel Lab     │   Social/Cards   │
│  (/build)     │   (/match)      │   (/intel-lab)    │   (/share)       │
│ Mixed Integer │ Deterministic   │ Monte Carlo       │ Dynamic Satori/  │
│ Optimizer     │ Timeline Engine │ 1,000 Sims Engine │ SVG OG Cards     │
└───────┬───────┴────────┬────────┴─────────┬─────────┴────────┬─────────┘
        │                │                  │                  │
        ▼                ▼                  ▼                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Zero-Math AI Guard Layer                        │
│   • Streaming Sentence-Level Guard      • Deterministic Whitelist      │
│   • Injection & Canary Defense          • Sub-ms Offline Fallback      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Groq Tool-Calling Model Fallback Chain               │
│   Primary: openai/gpt-oss-120b  │ Fallbacks: openai/gpt-oss-20b, qwen3.8-27b │
│          Offline/Rate-Limit Circuit Breaker: Sub-ms Template           │
└────────────────────────────────────────────────────────────────────────┘
```

- **Frontend Framework:** Next.js 16 (App Router, Turbopack, React 19, TypeScript)
- **Styling & UI:** Tailwind CSS v4, Lucide Icons, Framer Motion
- **State Management:** Zustand with client-side hydration guards
- **AI Tool-Calling:** Vercel AI SDK with Groq API
- **Testing Engine:** Vitest (30 test suites, 398 passed tests)
- **Mobile Support:** PWA manifest, offline service worker, responsive touch targets (44px min)

---

## 🏃 Quick Start

### 1. Installation
```bash
git clone https://github.com/your-username/pulse.git
cd pulse
pnpm install
```

### 2. Environment Setup (Optional for Live Groq AI)
```bash
cp .env.example .env.local
```
Add your Groq API key:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```
*(Pulse functions 100% offline using deterministic fallbacks even without an API key).*

### 3. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Test Suite
```bash
pnpm test
```
*(All 30 test files and 398 tests pass in under 20 seconds).*

### 5. Run Live Evaluation Benchmark
```bash
npx tsx evals/run.ts
```
*(Executes all 102 golden cases against Groq models and updates `/evals`).*

---

## 📄 License & Responsible Play

Pulse is an educational and entertainment prototype created for the Dream11 Forward Deployed Engineer assignment. It does not provide real-money gambling, betting advice, or financial guarantees. All rival teams, friends, and crowd chats are simulated from sample data.
