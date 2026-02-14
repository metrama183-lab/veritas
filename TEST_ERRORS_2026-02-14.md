# Veritas - 5 Additional Probe Tests (2026-02-14)

## Scope
- Endpoint tested: `POST /api/analyze`
- 5 videos / 5 languages:
  - IT: `https://youtu.be/F2lm0UELlhY`
  - EN: `https://www.youtube.com/watch?v=EbjKcHPmxKQ`
  - ES: `https://www.youtube.com/watch?v=dH5v_mcvlXM`
  - FR: `https://www.youtube.com/watch?v=ZBCk1k3Gru0`
  - DE: `https://www.youtube.com/watch?v=CAJlZcB6eKw`

---

## Errors observed during testing

### 1) Groq Whisper audio quota exceeded (429)
- **Where:** Transcript Strategy 3 (`audio + whisper-large-v3-turbo`)
- **Observed error:** `rate_limit_exceeded` for ASPH (audio seconds/hour), with retry-after windows.
- **Impact:** Audio transcription failed temporarily; fallback moved to metadata.

### 2) Malformed LLM JSON in claim extraction
- **Where:** Claim extraction step (strict/relaxed output parsing)
- **Observed pattern:** outputs like split arrays / malformed JSON chunks (`...}], [{...}]` and wrapper arrays)
- **Impact:** Some runs returned `Analysis Failed` with `claims_count = 0` (especially FR/DE under heavy fallback conditions).

### 3) Manipulation analysis parse failure (non-blocking)
- **Where:** Manipulation analysis parsing
- **Observed error:** parse failure when model returned non-strict JSON
- **Impact:** `manipulationScore` could drop to default 0 in affected runs.

---

## Fixes applied

### A) Heavy model cooldown + fallback prompt trimming
- Added 70B cooldown circuit breaker and retry-after parsing.
- Reduced fallback prompt length for light model extraction.
- **File:** `src/app/api/analyze/route.ts`

### B) Whisper cooldown for audio strategy
- Added cooldown tracking for `whisper-large-v3-turbo` after 429.
- Skips repeated audio attempts during cooldown and proceeds directly to metadata fallback.
- **File:** `src/lib/youtube.ts`

### C) Extraction robustness improvements
- Added retry to RELAXED mode when strict extraction is too sparse (<3 claims on larger transcripts).
- Added salvage path to recover claims from malformed extraction text when JSON parse fails.
- **File:** `src/app/api/analyze/route.ts`

### D) Manipulation robustness improvements
- Added JSON-repair pass for manipulation output when first parse fails.
- **File:** `src/app/api/analyze/route.ts`

---

## Post-fix validation (latest 5-run batch)

| Lang | Duration (s) | Topic | Claims | True | False | Unverified | Error field |
|---|---:|---|---:|---:|---:|---:|---|
| IT | 15 | Ludovica Ciriello interview with Roberto Vannacci | 1 | 1 | 0 | 0 | empty |
| EN | 22 | Climate Change | 1 | 1 | 0 | 0 | empty |
| ES | 39 | Data Science | 4 | 2 | 0 | 2 | empty |
| FR | 62 | French news and politics | 8 | 4 | 0 | 4 | empty |
| DE | 78 | Deutsche Wirtschaft im Krisenmodus: Ursachen, Auswirkungen und Auswege | 10 | 6 | 3 | 1 | empty |

## Status
- No blocking API errors in final batch (`error` and `details` empty).
- Fallback chain remained operational under quota pressure.
- Quality variability remains possible when both 70B and Whisper are in cooldown (expected behavior under quota constraints).
