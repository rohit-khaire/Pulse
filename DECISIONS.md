# Pulse: Architecture & Technical Decision Records (ADR)

> **Context:** Dream11 Forward Deployed Engineer (FDE) Assignment  
> **System:** Pulse — Real-Time Sports AI Companion & Strategy Engine

---

## 1. Product Thesis & Fan Problem

### Context
Broadcast commentary is optimized for casual, neutral television audiences. It provides broad descriptions of boundaries and wickets in English. However, tens of millions of fans in India watch matches with **personal emotional and competitive stakes**:
- They manage a specific 11-player fantasy squad.
- They compete in private mini-leagues with friends and colleagues.
- They selected a Captain (2×) and Vice-Captain (1.5×) whose performance dictates their ranking.

### Decision
Pulse was built as a dedicated **second-screen AI companion** bridging the gap between the TV screen and personal fantasy stakes. Pulse does not duplicate Cricbuzz scorecards; instead, it answers the fan's real-time psychological questions:
- *"Why did my rank drop?"* (Attribution & point swings)
- *"What did I miss?"* (10-second contextual catch-up)
- *"How was that out?"* (MCC law demystification & 3D ball tracking)
- *"Can I still win?"* (Probabilistic game-tree simulation)

---

## 2. Zero-Math AI Invariant (Hallucination Defense)

### Context
Large Language Models (LLMs) are notorious for arithmetic hallucinations. In sports and fantasy, getting a player's fantasy score wrong or inventing a point delta completely destroys user trust.

### Decision
We established a strict **Zero-Math AI Invariant**:
1. **Zero Arithmetic in Prompts:** The LLM is never asked to add, subtract, multiply, or calculate fantasy points or rank gaps.
2. **Deterministic Engine Authority:** All scoring rules (`scoring.t20.json`), milestone bonuses (+8 at 50, +12 at 5 wickets), dot ball additions (+1), duck deductions (-2), and captain multipliers (2×, 1.5×) are computed in pure, unit-tested TypeScript.
3. **Whitelist Extraction & Verification:**
   - Whenever an AI answer is streamed or generated, all numbers in the response are extracted via regex.
   - Every extracted number is checked against a strict whitelist created from the deterministic tool call results (`NudgeFacts`, `ToolResult`).
   - If any number is ungrounded (not present in the whitelist), the output is immediately rejected and replaced with a deterministic template.
4. **Sentence-Level Streaming Guard:** During real-time streaming, the guard checks numbers sentence-by-sentence. If an invalid number appears midway through generation, the stream is aborted early to save tokens and latency, falling back to offline templates instantly.

---

## 3. Pre-Match Team Builder Optimizer Architecture

### Context
Fans entering contests often face the "blank canvas" dilemma: choosing 11 players from a 22-player pool within a strict 100-credit budget, balancing 4 distinct playing roles (1–8 WK, 1–8 BAT, 1–8 AR, 1–8 BOWL), and observing a maximum of 7 players from a single franchise.

### Decision
We implemented a fast **Mixed-Integer Constraint Optimizer** (`src/lib/builder/optimizer.ts`):
- **Performance:** Solves the combinatorial knapsack problem in <10ms in pure TypeScript without heavy external WASM dependencies.
- **3 Contest-Specific Modes:**
  - **Floor Mode (Safe):** Minimizes projection variance for Head-to-Head & small 3-10 player leagues where consistency beats volatility.
  - **Ceiling Mode (Aggressive):** Optimizes for 90th-percentile upside to maximize tournament scores in crowded Grand Leagues.
  - **Differential Mode (Contrarian):** Penalizes high-ownership players to select high-upside differentials (<20% ownership) needed to leapfrog leaderboards.
- **Lock/Exclude Matrix:** Fans retain full agency by locking must-have players or excluding players they believe will fail, with the optimizer filling the rest.
- **Backtest Verification:** Backtests generated squads against the historic match timeline to verify that optimized teams produce viable scores.

---

## 4. Probabilistic Rank Forecasting (Monte Carlo Engine)

### Context
During the 16th–20th death overs, fans obsess over *"Can I still win?"*. Static points tables are backwards-looking and cannot answer whether a 45-point deficit is realistically surmountable.

### Decision
We built the **Match Intelligence Lab** (`src/lib/intel/rankforecast.ts`):
- **1,000 Game-Tree Simulations:** Simulates 1,000 possible stochastic completions of the remaining balls based on historical delivery distributions, pitch wear, and bowler profiles.
- **Rank Probability Distribution:** Outputs the user's estimated probability of finishing #1, along with p10, p50 (median), and p90 projected ranks.
- **Main-Thread Latency Budget (16ms Budget):** Monte Carlo simulations run in chunked time-slices using `requestIdleCallback` (or `setTimeout` fallback). This ensures the 60fps UI never stutters or drops frames while thousands of stochastic games are simulated in background memory.
- **Deterministic Seeded PRNG:** Uses a seeded Pseudo-Random Number Generator (`src/lib/intel/rng.ts`) so results are 100% reproducible for automated regression testing.

---

## 5. Tool-Calling Model Chain & Fallback Circuit Breaker

### Context
Live sporting events experience severe traffic spikes and network volatility. Relying on a single cloud LLM endpoint introduces single-point-of-failure risks (rate limits, timeouts, API outages).

### Decision
We engineered a resilient, tiered model pipeline (`src/lib/agent/models.ts` & `src/lib/agent/live.ts`):
1. **Calibrated Model Chain:**
   - **Primary:** `openai/gpt-oss-120b` (on Groq) — High-precision multi-step tool-calling with zero hallucinations.
   - **Secondary Fallback:** `openai/gpt-oss-20b` (on Groq) — Ultra-fast secondary model if the primary is saturated.
2. **Tool Schema Hardening:** Built-in alias mapping (`explainMatchState`, `getScore` -> `getMatchState`) and optional parameter defaulting (`lastNOvers: default 5` for `catchUp`) prevents schema rejection errors across different LLM parameter variations.
3. **Sub-0.5ms Offline Router:** If any model call times out (>6,000ms TTFT) or throws an API error (e.g. 429 rate limit), the deterministic router (`src/lib/agent/router.ts`) answers in <0.5ms. The user experiences zero interruption or blank states.

---

## 6. Stateless Dynamic Card Generation (`/share`)

### Context
Fans want to share visual brag cards on WhatsApp, Instagram Stories, and Twitter when their captain scores 50+ or when they overtake a rival friend. Requiring database persistence or backend image rendering servers introduces heavy latency and hosting costs.

### Decision
We implemented a **Stateless URL Payload Architecture** (`src/lib/social/payload.ts`):
- **Base64URL Payload Packing:** Match state, user rank, points delta, and captain highlights are compressed and signed into a URL parameter (`/share/[payload]`).
- **Edge OG Rendering:** Server route `/api/og/[kind]` dynamically renders 1200×630 wide and 9:16 story-format SVG/PNG cards directly from the payload without database lookups.
- **Honesty Watermark:** Every card permanently carries the label *"IPL Replay · Demo Friends · Entertainment Only"* to maintain strict responsible gaming compliance.

---

## 7. Universal 5-Stage Guided Demo Architecture

### Context
Reviewers, evaluators, and first-time users need to understand how the entire system connects without having to hunt through obscure routes.

### Decision
We created a unified **Universal Demo System** (`src/components/demo/SystemDemoBar.tsx` & `PageTour.tsx`):
- **Universal Top Bar:** Automatically mounts when `?demo=1` is present or when launched from the home page.
- **Stage Progression:** Guides users across all 5 modules in logical order (`1. Builder` ➔ `2. Live Match` ➔ `3. Intel Lab` ➔ `4. Social & Friends` ➔ `5. Trust & Evals`).
- **Spotlight Coach Marks:** Uses non-invasive viewport cutouts with glowing amber borders to spotlight key interface elements in Hinglish, Hindi, and English.
- **One-Click Reviewer Jumps:** Direct shortcuts to the 20th-over thriller (Kartik Tyagi), 5-wicket haul (Arshdeep Singh), and milestone bonus (Mayank Agarwal).
