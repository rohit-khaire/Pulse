# Pulse: Evaluation & Reliability Suite (`/evals`)

This directory houses the golden evaluation harness, regression benchmark, and test cases that verify Pulse's conversational AI and Zero-Math invariant.

---

## 📊 File Architecture

- **`cases.json`**: 102 curated golden test cases across English, Hinglish, and Hindi spanning:
  - `factual`: Point checks, rank positions, wicket counts, bowling figures.
  - `multi_step`: Complex queries requiring multiple tool executions (e.g. comparing team points and rank gap).
  - `adversarial`: Prompt injection attempts, system prompt canary probes, spoofed fact injections.
  - `betting`: Gambling, betting tips, and financial guarantee questions (must be 100% refused).
  - `offtopic`: Non-cricket questions (weather, coding, general trivia).
  - `edge`: Empty inputs, whitespace, boundary typos, informal player nicknames.
- **`harness.ts`**: Independent evaluation engine. Ground-truth values are computed from raw ball-by-ball frames using a completely separate code path from the runtime agent tools to prevent shared-blindspot errors.
- **`run.ts`**: CLI evaluation runner with auto-loading of `.env.local`. Runs both the deterministic fallback and the live Groq model chain with rate-limit pacing.
- **`results.json`**: Precomputed benchmark results rendered interactively on [`/evals`](http://localhost:3000/evals).

---

## 🎯 Quality Bar & Metrics (Observed)

| Metric | Deterministic Router | Live Groq (`gpt-oss-120b`) | Target Requirement |
| :--- | :--- | :--- | :--- |
| **Pass Rate** | **102 / 102 (100%)** | **102 / 102 (100%)**, of which only 4 answers were model-written | Baseline vs Live Model |
| **Numeric Faithfulness** | **100% (102 / 102)** | **100% (102 / 102)** | Zero Hallucinated Numbers |
| **Language Match** | **100% (102 / 102)** | **100% (102 / 102)** | English / Hinglish / Hindi |
| **Refusal Recall** | **100% (24 / 24)** | **100% (24 / 24)** | 100% Betting & Injections Blocked |
| **False Refusals** | **0 / 78 (0%)** | **0 / 78 (0%)** | Valid Queries Never Blocked |
| **Prompt Leaks** | **0** | **0** | Zero System Prompt Leaks |
| **Latency (p50 / p95)** | **0.52 ms / 2.19 ms** | **6.0 s / 6.1 s** (max 23.5 s) | Sub-ms Fallback / Live Inference |
| **TTFT (p50 / p95)** | *In-process (0ms)* | **0.74 s / 4.8 s** | Time-To-First-Token |

---

## 🏃 How to Run the Evals

### 1. Standalone CLI Runner (Fallback + Live Groq)
```bash
# from the pulse/ root directory
npx tsx evals/run.ts
```
*(Automatically loads `GROQ_API_KEY` from `.env.local` or `.env` and rewrites `evals/results.json`).*

### 2. Fast In-Process Unit Test (Vitest)
```bash
# Runs the eval assertions against the deterministic engine in <300ms
pnpm vitest run src/lib/agent/__tests__/evals.test.ts
```

### 3. Regenerate Results via Vitest Wrapper
```bash
EVALS_WRITE=1 pnpm vitest run src/lib/agent/__tests__/evals.test.ts
```

---

## ➕ Adding New Cases

To add a test case, append a new object to `evals/cases.json`:
```json
{
  "id": "f62",
  "category": "factual",
  "ui": "hinglish",
  "question": "Mera captain kaun hai aur uske kitne points hain?",
  "expectedVerdict": "ok",
  "intents": ["PLAYER"],
  "replyLang": "hinglish",
  "expect": {
    "truth": { "captainName": "Rahul", "captainPoints": 98 }
  }
}
```
Available `expect.truth` keys are defined in `truthFor()` in [`evals/harness.ts`](file:///E:/Code/Dream/pulse/evals/harness.ts).
