#!/usr/bin/env bash
set -euo pipefail
OUT_JSONL="/home/marco/Scrivania/hackato/veritas/probe10_results.jsonl"
OUT_JSON="/home/marco/Scrivania/hackato/veritas/probe10_results.json"
: > "$OUT_JSONL"

run_test() {
  local label="$1"
  local lang="$2"
  local url="$3"
  local start end dur resp
  start=$(date +%s)
  resp=$(curl -s -X POST http://localhost:3001/api/analyze -H 'Content-Type: application/json' -d "{\"url\":\"$url\"}")
  end=$(date +%s)
  dur=$((end-start))

  echo "$resp" | jq --arg label "$label" --arg lang "$lang" --arg url "$url" --argjson duration "$dur" '{
    label:$label,
    lang:$lang,
    url:$url,
    duration_seconds:$duration,
    topic:(.topic//""),
    claims_count:((.claims//[])|length),
    true_count:(.meta.trueCount//0),
    false_count:(.meta.falseCount//0),
    unverified_count:(.meta.unverifiedCount//0),
    truth_score:(.truthScore//null),
    manipulation_score:(.manipulation.manipulationScore//null),
    summary:(.summary//""),
    details:(.details//""),
    error:(.error//""),
    first_claim:((.claims//[]|.[0].claim)//""),
    first_verdict:((.claims//[]|.[0].verdict)//""),
    first_source:((.claims//[]|.[0].source)//"")
  }' >> "$OUT_JSONL"

  echo "done $label ($lang) in ${dur}s"
}

run_test "it_1" "it" "https://youtu.be/F2lm0UELlhY"
run_test "en_1" "en" "https://www.youtube.com/watch?v=EbjKcHPmxKQ"
run_test "es_1" "es" "https://www.youtube.com/watch?v=dH5v_mcvlXM"
run_test "fr_1" "fr" "https://www.youtube.com/watch?v=ZBCk1k3Gru0"
run_test "de_1" "de" "https://www.youtube.com/watch?v=CAJlZcB6eKw"
run_test "it_2" "it" "https://www.youtube.com/watch?v=F2lm0UELlhY"
run_test "en_2" "en" "https://youtu.be/EbjKcHPmxKQ"
run_test "es_2" "es" "https://youtu.be/dH5v_mcvlXM"
run_test "fr_2" "fr" "https://youtu.be/ZBCk1k3Gru0"
run_test "de_2" "de" "https://youtu.be/CAJlZcB6eKw"

jq -s '.' "$OUT_JSONL" > "$OUT_JSON"
jq '{
  total: length,
  analysis_failed: map(select(.topic=="Analysis Failed" or .claims_count==0)) | length,
  errored: map(select((.error|length)>0 or (.details|length)>0)) | length,
  by_lang: (group_by(.lang) | map({lang:.[0].lang,total:length,avg_claims:(map(.claims_count)|add/length)}))
}' "$OUT_JSON"
