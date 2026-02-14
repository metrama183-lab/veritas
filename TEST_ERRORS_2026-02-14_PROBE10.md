# Veritas - 10 Probe Run Error Log and Fixes (2026-02-14)

## Scope
- Endpoint: `POST /api/analyze`
- 10 probes executed (5 languages x 2 URL variants):
  - IT: `F2lm0UELlhY`
  - EN: `EbjKcHPmxKQ`
  - ES: `dH5v_mcvlXM`
  - FR: `ZBCk1k3Gru0`
  - DE: `CAJlZcB6eKw`

---

## Errors found during the first 10-run cycle

### 1) Tavily quota exhaustion during claim verification
- **Symptom:** repeated verification failures (`This request exceeds your plan's set usage limit`), many claims became unverified with poor source quality.
- **Root cause:** search provider quota was exceeded; no provider-level circuit breaker existed.
- **Impact:** verification quality degraded and repeated failing calls were still attempted.

### 2) Very long request outlier (1850s)
- **Symptom:** one probe took ~31 minutes.
- **Root cause:** no hard timeout around transcript strategies (especially strategy 1 / strategy 2), allowing long hangs in adverse network conditions.
- **Impact:** unacceptable latency spike.

### 3) Transcript fallback instability on some URL forms / network hiccups
- **Symptom:** some runs returned `Transcript Unavailable` with strategy failures.
- **Root cause:** inconsistent URL handling and no strict caps per transcript strategy.
- **Impact:** intermittent zero-claim output under unstable network.

---

## Fixes implemented

### A) Tavily cooldown + model-only verification fallback
- Added Tavily quota detection and cooldown (`tavilyBlockedUntil`).
- Added fallback verifier (`verifyWithModelOnly`) when search is unavailable/quota-limited.
- Replaced hard `source: "Error"` path with graceful fallback verification.
- **File:** `src/app/api/analyze/route.ts`

### B) Strategy timeouts to eliminate long hangs
- Added `withTimeout(...)` helper.
- Applied timeout to:
  - Strategy 1 (`youtube-transcript`) = 30s
  - Strategy 2 (custom scraper) = 20s
- **File:** `src/lib/youtube.ts`

### C) Canonical URL normalization for all downstream strategies
- Normalized all YouTube URLs to `https://www.youtube.com/watch?v=<videoId>`.
- Used canonical URL for strategy 1, strategy 3 (audio), and strategy 4 (metadata fallback).
- **File:** `src/lib/youtube.ts`

### D) Better diagnostics for empty transcript paths
- Explicitly record when strategy 1/2 returns empty transcript.
- **File:** `src/lib/youtube.ts`

---

## Final validation after fixes (second 10-run cycle)

- **Total probes:** 10
- **Analysis failed / transcript unavailable:** 0
- **API error/details fields populated:** 0
- **Average duration:** 61.3s

### By language (latest run)
- IT: 2/2 successful
- EN: 2/2 successful
- ES: 2/2 successful
- FR: 2/2 successful
- DE: 2/2 successful

## Notes
- Current Tavily plan remained quota-limited during the run, so verification used the model-only fallback path by design.
- Pipeline remained stable and produced non-empty analyses for all 10 probes.
