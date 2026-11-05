# Pulse: Dream11 Forward Deployed Engineer Intern Submission

> **Candidate Submission:** Rohit • **Target Role:** Forward Deployed Engineer (FDE) Intern  
> **Assignment Goal:** Build one AI-powered artifact that solves a real problem fans face during a live match.

---

## 📋 The 200-Word Submission Note (Copy-Paste for Google Form)

```text
What fan problem are you solving?
During live IPL matches, Dream11 fans watch their leaderboard ranks swing wildly but have no visibility into why. Standard scorecards show raw points, leaving fans confused when taking a wicket drops their rank because a rival’s captain took the catch. Fans lack real-time clarity on what every ball means for their specific XI and whether they can still win.

How does your solution help?
Pulse is an AI live match companion that transforms raw ball-by-ball deliveries into personalized fantasy intelligence:
1. Instant Ball Nudges: Explains point swings and rival leaderboard impacts in English, Hinglish, and Hindi.
2. Zero-Math AI: Deterministic engines compute points, milestones, and DRS rules; AI strictly narrates verified numbers without hallucination.
3. Path to Victory: Real-time simulation showing plausible wicket/boundary combinations needed to overtake rivals.
4. Social Banter & Moments Reel: One-tap shareable stories of clutch match turnarounds.

Which AI tools did you use?
Groq Cloud LPUs with AI SDK for ultra-low latency streaming (sub-200ms TTFT), multi-model fallbacks (GPT-OSS-120B/20B, Qwen-2.5), deterministic template fallbacks for offline resilience, and Vitest for continuous numeric guardrail verification.
```
*(Word count: 187 words — strictly compliant with the 200-word limit)*

---

## 1. What Fan Problem Are You Solving?

During a live cricket match, television commentary is designed for the broad neutral audience. However, millions of fans on TV and mobile have **deep personal and competitive stakes**:
1. **Pre-Match Decision Overload:** Fans struggle to build legally compliant 11-player squads within 100 credits without guessing.
2. **The "Why Did My Rank Drop?" Attribution Gap:** Scorecards show runs and wickets, but cannot explain why a non-boundary delivery caused a 5-rank drop.
3. **The "Can I Still Win?" Anxiety:** In death overs, fans have no way of knowing if their points deficit is mathematically surmountable.
4. **Umpire & DRS Confusion:** Controversial dismissals leave fans arguing on social media without clear MCC law explanations.
5. **Social Celebration Friction:** Fans have no frictionless way to generate visual brag cards or banter with friends during live point swings.

---

## 2. The Solution: Pulse (5-Pillar Live Companion)

Pulse is an end-to-end, mobile-first companion combining deterministic fantasy math, probabilistic game-tree modeling, and conversational AI in **Hinglish, Hindi, and English**:

- **1. Pre-Match Team Builder (`/build`):** Integer programming optimizer generating legal squads in <10ms across 3 distinct risk modes: **Floor** (safe H2H), **Ceiling** (high-variance Grand Leagues), and **Differential** (low-ownership contrarians), with transparent captaincy rationale.
- **2. Live Match Companion (`/match`):** Ball-by-ball IPL replay with real-time fantasy points tracking, AI Live Nudges, **Why Out?** MCC law demystification, **Catch Me Up** 10-second recaps, and **Path to Victory** simulations.
- **3. Match Intelligence Lab (`/intel-lab`):** 1,000 Monte Carlo game-tree simulations projecting final rank probability distributions within a strict 16ms frame budget, alongside live win probability curves and What-If captain hindsight analysis.
- **4. Pulse Social (`/share`):** Automated dynamic SVG/PNG brag cards for WhatsApp and Twitter, simulated friend contest leaderboard, and real-time overtake notifications with an honesty watermark.
- **5. Evaluations & Trust Benchmark (`/evals`):** 102 golden test cases proving **100% Numeric Faithfulness** and **100% Refusal Recall** across English, Hinglish, and Hindi, benchmarked on live Groq models.

---

## 3. Engineering Rigour & Key Innovations

1. **Zero-Math AI Invariant:** The LLM is strictly forbidden from computing numbers. All points, ranks, and bonuses are calculated by deterministic TypeScript engines. Outputs are validated sentence-by-sentence against a strict tool result whitelist (0% hallucinated stats).
2. **Cooperative Multitasking (<16ms Frame Budget):** 1,000 Monte Carlo simulations execute in chunked idle slices (`requestIdleCallback`), preserving a silky-smooth 60fps UI.
3. **Resilient Model Fallback Chain:** Calibrated Groq tool-calling (`openai/gpt-oss-120b` primary, `openai/gpt-oss-20b` fallback) backed by an instant 0.5ms offline router circuit breaker.
4. **Comprehensive Test Suite:** **30 test files and 398 passed tests** (399 total) passing in Vitest, plus a verified Next.js 16 Turbopack production build with zero errors.

---

## 4. Responsible Gaming & Transparency

Pulse is built for fan entertainment and comprehension. It rejects gambling queries, refuses betting advice, and never predicts financial returns. All cards, friend leagues, and fan rooms carry explicit *"IPL Replay · Demo Friends · Entertainment Only"* labels.

---

## 5. Quick Test & Demo

- **Home Launchpad:** Open `http://localhost:3000/` and click **"Start 3-Minute System Tour"**.
- **Interactive Judge Mode:** Visit any route with `?demo=1` (e.g. `http://localhost:3000/match?demo=1`).
- **Run All Tests:** `pnpm test` (30 test suites, 398 passed tests).
- **Run Live Benchmark:** `npx tsx evals/run.ts` (102 cases on Groq).
