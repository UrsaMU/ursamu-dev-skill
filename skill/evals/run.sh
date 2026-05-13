#!/usr/bin/env bash
# ursamu-dev eval runner.
#
# Two modes:
#   1. If ANTHROPIC_API_KEY is set → invoke the programmatic judge-model runner
#      (skill/evals/run-programmatic.js). Predicts routing via Claude Haiku
#      over a curated sibling-skill catalog. NOT the real Claude Code skill
#      loader — it's a proxy that flags description ambiguity.
#   2. Otherwise → print the prompts grouped by expected routing so you can
#      paste them into Claude Code in a fresh session and visually confirm.

set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
file="$here/evals.json"

if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  exec node "$here/run-programmatic.js"
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "evals/run.sh requires jq for paste-mode" >&2
  exit 1
fi

echo "Set ANTHROPIC_API_KEY to run automated evals."
echo ""

print_block() {
  local key="$1" label="$2"
  echo "=================================================="
  echo "$label"
  echo "=================================================="
  jq -r --arg k "$key" '.[$k][] | "[\(.id)]  expect: \(.expect_skill // (.expect_skill_in | join(",")))\n        \(.prompt)\n        why:  \(.rationale)\n"' "$file"
}

print_block should_trigger "SHOULD TRIGGER ursamu-dev"
print_block should_not_trigger "SHOULD NOT TRIGGER ursamu-dev (named sibling owns it)"

echo "Total: $(jq '.should_trigger | length' "$file") should-trigger + $(jq '.should_not_trigger | length' "$file") should-not-trigger prompts."
echo "Paste each into Claude Code and confirm routing matches the expectation."
