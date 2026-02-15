#!/usr/bin/env bash
set -euo pipefail
OUT_JSONL="/home/marco/Scrivania/hackato/veritas/multilang_probe_after_fix.jsonl"
OUT_JSON="/home/marco/Scrivania/hackato/veritas/multilang_probe_after_fix.json"
: > "$OUT_JSONL"

run_test() {
  local lang="$1"
  local url="$2"
  local start end dur resp
  start=$(date +%s)
  resp=$(curl -s -X POST http://localhost:3001/api/analyze -H 'Content-Type: application/json' -d "{\"url\":\"$url\"}")
  end=$(date +%s)
  dur=$((end-start))

  echo "$resp" | jq --arg lang "$lang" --arg url "$url" --argjson duration "$dur" '{
    lang:$lang,
    url:$url,
    duration_seconds:$duration,
    topic:(.topic//""),
    claims_count:((.claims//[])|length),
    true_count:(.meta.trueCount//0),
    false_count:(.meta.falseCount//0),
    unverified_count:(.meta.unverifiedCount//0),
    summary:(.summary//""),
    details:(.details//""),
    error:(.error//""),
    first_claim:((.claims//[]|.[0].claim)//""),
    first_verdict:((.claims//[]|.[0].verdict)//""),
    first_source:((.claims//[]|.[0].source)//"")
  }' >> "$OUT_JSONL"

  echo "done $lang in ${dur}s"
}

run_test "it" "https://youtu.be/F2lm0UELlhY"
run_test "en" "https://www.youtube.com/watch?v=EbjKcHPmxKQ"
run_test "es" "https://www.youtube.com/watch?v=dH5v_mcvlXM"
run_test "fr" "https://www.youtube.com/watch?v=ZBCk1k3Gru0"
run_test "de" "https://www.youtube.com/watch?v=CAJlZcB6eKw"

jq -s '.' "$OUT_JSONL" > "$OUT_JSON"
