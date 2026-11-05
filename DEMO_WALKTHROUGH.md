# Pulse: Virtual Demo Script & Technical Interview Guide

> **Candidate Role:** Dream11 Forward Deployed Engineer (FDE) Intern  
> **Topic:** Comprehensive Walkthrough of the 5-Pillar Pulse System

---

## ⏱️ 1. The 3-Minute Full-Platform Demo Script

Use this script during live demonstrations or video submissions. Open `http://localhost:3000/?demo=1` to launch the guided tour.

---

### [0:00 - 0:40] Introduction & Stage 1: Pre-Match Team Builder (`/build`)
> *"Hi everyone, I'm presenting **Pulse**—a mobile-first second-screen AI companion designed for the real problems fans face before, during, and after a live cricket match.*
>
> *Before the match even starts, fans struggle with the blank canvas: picking 11 players within 100 credits across strict role limits. In Pulse's **Team Builder**, our integer optimizer generates mathematically optimal teams in under 10 milliseconds.*
>
> *We offer 3 distinct strategic modes: **Floor Mode** for safe Head-to-Head leagues, **Ceiling Mode** for explosive Grand Leagues, and **Differential Mode** to surface contrarian gems under 20% ownership.*
>
> *Fans can lock core picks, exclude injured players, and read transparent data-backed rationale for Captain (2×) and Vice-Captain (1.5×). With one click on 'Go Live', our custom squad enters the live match tracker."*

---

### [0:40 - 1:25] Stage 2: Live Match Companion (`/match`)
> *"Now we are in the live match—a replay of the historic IPL thriller where Rajasthan Royals defended 185 against Punjab Kings.*
>
> *While TV broadcasts give generic English commentary, Pulse tracks our custom fantasy XI ball-by-ball. Look at over 19.5 when Nicholas Pooran gets out:*
> 1. *Our **AI Live Nudges** instantly explain: 'Pooran caught by Sakariya off Tyagi—your rank jumps to #2 because your rival has Pooran as VC (-2 pts)'.*
> 2. *Tapping **'Why Out?'** breaks down the dismissal with virtual ball tracking (Pitching, Impact, Wickets) and quotes official MCC Laws in simple Hinglish, clarifying why the bowler gets credit on a catch but zero wickets on a runout.*
> 3. *Stepping away for 5 minutes? Tap **'Catch Me Up'** for an instant 10-second recap of the last 2 overs.*
> 4. *Fans can tap the **'Fan Room'** to participate in live sentiment polls and crowd banter, or ask our voice/text agent **'Ask Pulse'** any tactical question."*

---

### [1:25 - 2:05] Stage 3: Match Intelligence Lab (`/intel-lab`)
> *"In the death overs, every fan asks: 'Can I still win?' Pulse's **Intel Lab** turns anxiety into probabilistic clarity.*
>
> *Our **Monte Carlo Rank Forecast** runs 1,000 stochastic game-tree simulations over remaining balls to project your exact probability of finishing #1 and expected rank distribution.*
>
> *We also display live **Win Probability and Point Swing curves**, and our **What-If Captain Simulator** lets fans test counterfactuals—like 'What if I had made KL Rahul captain instead of Sanju Samson?'—recalculating point deltas in milliseconds.*
>
> *Crucially for mobile performance, these 1,000 simulations run in chunked idle slices within a 16ms frame budget, keeping the UI silky smooth at 60fps."*

---

### [2:05 - 2:35] Stage 4: Social Brag Cards & Friend Mini-Leagues (`/share`)
> *"Fantasy cricket is inherently social. In **Pulse Social**, we empower fans to celebrate and banter with friends.*
>
> *Whenever you take the league lead or survive a close finish, Pulse dynamically generates high-contrast visual **Brag Cards** formatted for WhatsApp and Twitter.*
>
> *Our **Friend Contest Leaderboard** tracks point gaps against your circle ball-by-ball and fires real-time overtake alerts when you pass a rival.*
>
> *Every card carries our strict honesty watermark: 'IPL Replay · Demo Friends · Entertainment Only', ensuring responsible gaming compliance."*

---

### [2:35 - 3:00] Stage 5: Trust Engineering & Evaluation Benchmark (`/evals`)
> *"Finally, the hardest problem in sports AI is trust: models hallucinate numbers. At Pulse, we built a **Zero-Math AI Invariant**.*
>
> *The AI model is strictly forbidden from computing scores or ranks. All numbers are computed by our deterministic TypeScript engine and verified through a sentence-level streaming guard. If an unverified number appears, the response is discarded and replaced with a verified template instantly.*
>
> *We prove this through our **102-case Golden Evaluation Suite** on `/evals`, achieving **100% Numeric Faithfulness**, **100% Refusal Recall** against betting and injection prompts, and a live Groq run that passed 102/102, with a sub-millisecond offline router handling most answers (only 4 were written by the model; `/evals` shows the split).*
>
> *Pulse is fast, resilient, authentic, and battle-tested with 375 passing automated tests."*

---

## 🧠 2. Technical Q&A Cheat Sheet (For FDE Leads & Hiring Managers)

### Q1: Why did you build a Pre-Match Builder and Intel Lab when the prompt focused on a live match companion?
> **Answer:** *"Because a fan's live match experience is inextricably linked to their pre-match choices and in-game probabilities. When a fan watches a match, they don't care about neutral cricket data; they care about their specific 11 players and whether they can still win. By building the Optimizer (`/build`) and the Monte Carlo Lab (`/intel-lab`), Pulse provides an end-to-end fan loop: Strategy ➔ Live Attribution ➔ Predictive Clarity ➔ Social Celebration."*

---

### Q2: How do you guarantee the LLM never hallucinates numbers or scores?
> **Answer:** *"Through our four-layer Zero-Math AI Invariant:
> 1. **Zero Arithmetic Prompts:** The LLM prompt explicitly commands the model to use tool results only and never perform math.
> 2. **Deterministic Engine Authority:** All scoring rules (`scoring.t20.json`), bonus milestones (+8 at 50, +12 for 5-wicket hauls), and captain multipliers (2×, 1.5×) are calculated deterministically in TypeScript.
> 3. **Whitelist Validation:** Output numbers are extracted via regex and verified against a strict whitelist of numbers produced by the executed tools (`NudgeFacts`, `ToolResult`).
> 4. **Sentence-Level Streaming Guard:** During live streaming, each sentence is checked in flight. If an illegal number appears, the stream is aborted immediately, falling back to a deterministic template with zero latency."*

---

### Q3: Why Mixed-Integer Optimization for the Builder instead of a Genetic Algorithm?
> **Answer:** *"For an 11-player squad out of a 22-player pool with linear constraints (100 credits, role quotas, max 7 per franchise), mixed-integer programming (branch-and-bound knapsack) guarantees the **global mathematical optimum** in <10ms. Genetic algorithms are stochastic, slower, and can violate edge constraints. Our integer solver guarantees 100% constraint satisfaction on every run."*

---

### Q4: How do you run 1,000 Monte Carlo simulations on mobile without freezing the browser?
> **Answer:** *"Through chunked cooperative multitasking. Instead of running all 1,000 simulations synchronously in one blocking loop, the Monte Carlo engine slices computation across animation frames using `requestIdleCallback` (with a 16ms deadline budget). This guarantees the browser main thread remains unblocked, animations remain at 60fps, and scrub inputs feel instantaneous."*

---

### Q5: How does your Groq model fallback chain work in production?
> **Answer:** *"We use a tiered resilience pipeline:
> - **Primary Model:** `openai/gpt-oss-120b` (on Groq) for multi-step tool-calling with high reasoning fidelity.
> - **Secondary Model:** `openai/gpt-oss-20b` (on Groq) for fast secondary fallback.
> - **Circuit Breaker:** If TTFT exceeds 6,000ms or API returns 429/500 errors, the request gracefully falls back to our deterministic offline router (`src/lib/agent/router.ts`), which synthesizes verified answers in under 0.5ms with zero blank screens."*

---

### Q6: How would you scale Pulse to 10M concurrent users during an IPL Final?
> **Answer:** *"1. **Edge Caching for Match Timelines:** Timeline events and score snapshots are immutable ball-by-ball artifacts cached on Cloudflare/Vercel Edge with HTTP `stale-while-revalidate`.
> 2. **Fan Room Sharding:** Instead of one global WebSocket room, chat rooms are sharded into regional clusters (500–1,000 active fans per shard) via Redis Pub/Sub, preventing DOM thrashing.
> 3. **Client-Side Simulation:** Monte Carlo forecasting and what-if calculations run entirely client-side in the user's browser, incurring zero backend server compute costs for millions of concurrent users."*

---

## 🎯 3. Direct Reviewer Links

| Screen | URL | What to Observe |
| :--- | :--- | :--- |
| **System Tour** | `http://localhost:3000/?demo=1` | Universal top bar navigating all 5 stages end-to-end |
| **Pre-Match Builder** | `http://localhost:3000/build?demo=1` | 3 optimizer modes (Floor/Ceiling/Differential) & Go Live |
| **Live Match** | `http://localhost:3000/match?demo=1` | Ball-by-ball replay, AI nudges, Why Out, Catch Me Up |
| **Intel Lab** | `http://localhost:3000/intel-lab?demo=1` | 1,000 Monte Carlo simulations, win prob, What-If captain |
| **Pulse Social** | `http://localhost:3000/share?demo=1` | Brag cards, simulated friend league, overtake alerts |
| **Trust & Evals** | `http://localhost:3000/evals?demo=1` | 102 golden tests, 100% numeric faithfulness, live Groq |
