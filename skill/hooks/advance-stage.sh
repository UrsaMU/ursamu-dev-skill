#!/usr/bin/env bash
# ursamu-dev stage marker tool.
#
# Reads/edits .ursamu-stage in the current working directory.
#
# Usage:
#   advance-stage.sh --init [--feature <name>]   Create a fresh marker at stage 0.
#   advance-stage.sh --confirm-design            Set design_confirmed: true.
#   advance-stage.sh --to <0..5>                 Jump to a specific stage.
#   advance-stage.sh --reset                     Reset to stage 0, unconfirmed.
#   advance-stage.sh --show                      Print current marker contents.
#   advance-stage.sh --clear                     Delete the marker (no gate).
#
# Always operates on $URSAMU_STAGE_FILE if set, else ./.ursamu-stage.

set -euo pipefail

marker="${URSAMU_STAGE_FILE:-.ursamu-stage}"

now_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

require_marker() {
  [ -f "$marker" ] || { echo "no marker at $marker (run --init first)" >&2; exit 1; }
}

write_initial() {
  local feature="${1:-}"
  cat > "$marker" <<JSON
{
  "version": 1,
  "stage": 0,
  "stages": ["design", "generate", "audit", "refine", "test", "docs"],
  "feature": "$feature",
  "design_confirmed": false,
  "scope_globs": ["src/plugins/**", "src/commands/**", "system/scripts/**", "tests/**"],
  "created_ts": "$(now_iso)",
  "updated_ts": "$(now_iso)"
}
JSON
  echo "initialized $marker (stage 0, design_confirmed=false)"
}

jq_edit() {
  # Usage: jq_edit <jq-filter>. Falls back to a python3 in-place edit.
  local filter="$1"
  if command -v jq >/dev/null 2>&1; then
    local tmp; tmp=$(mktemp)
    jq "$filter" "$marker" > "$tmp" && mv "$tmp" "$marker"
  else
    python3 - "$marker" "$filter" <<'PY'
import json, sys
# Only supports the small set of filter forms used below; full jq is not required.
path, f = sys.argv[1], sys.argv[2]
data = json.load(open(path))
# Each call passes one of a known set of edits via env vars; see callers.
data["updated_ts"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
for k, v in __import__("os").environ.items():
    if k.startswith("USTAGE_SET_"):
        key = k[len("USTAGE_SET_"):].lower()
        try: data[key] = json.loads(v)
        except Exception: data[key] = v
open(path, "w").write(json.dumps(data, indent=2))
PY
  fi
}

set_field() {
  # set_field <key> <json-value>
  if command -v jq >/dev/null 2>&1; then
    jq_edit ". | .${1} = ${2} | .updated_ts = \"$(now_iso)\""
  else
    USTAGE_SET_${1^^}="$2" jq_edit ""
  fi
}

case "${1:-}" in
  --init)
    feature=""
    if [ "${2:-}" = "--feature" ]; then feature="${3:-}"; fi
    write_initial "$feature"
    ;;
  --confirm-design)
    require_marker
    set_field design_confirmed true
    echo "design_confirmed=true at $marker"
    ;;
  --to)
    require_marker
    [ -n "${2:-}" ] || { echo "--to requires 0..5" >&2; exit 2; }
    set_field stage "$2"
    echo "stage=$2 at $marker"
    ;;
  --reset)
    require_marker
    set_field stage 0
    set_field design_confirmed false
    echo "reset $marker (stage 0, design_confirmed=false)"
    ;;
  --show)
    require_marker
    cat "$marker"
    ;;
  --clear)
    [ -f "$marker" ] && rm -f "$marker" && echo "cleared $marker" || echo "no marker"
    ;;
  *)
    cat <<USAGE >&2
ursamu-dev stage marker tool

Usage:
  $(basename "$0") --init [--feature <name>]
  $(basename "$0") --confirm-design
  $(basename "$0") --to <0..5>
  $(basename "$0") --reset
  $(basename "$0") --show
  $(basename "$0") --clear

Marker file: $marker
USAGE
    exit 2
    ;;
esac
