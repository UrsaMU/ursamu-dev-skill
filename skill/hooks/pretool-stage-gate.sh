#!/usr/bin/env bash
# ursamu-dev PreToolUse stage gate.
#
# Reads Claude Code's PreToolUse JSON payload on stdin. Blocks Write/Edit/
# NotebookEdit calls into the UrsaMU plugin tree while the local .ursamu-stage
# marker says stage 0 and the design has not been confirmed.
#
# Exits 0 (no decision) for every situation that doesn't match all of:
#   - tool is Write/Edit/NotebookEdit
#   - target file is under a directory whose nearest ancestor contains both
#       .ursamu-stage and a deno.json mentioning "@ursamu/ursamu"
#   - .ursamu-stage has stage == 0 && design_confirmed != true
#   - target path matches one of .ursamu-stage's scope_globs (relative to
#     the marker dir)
#
# This guarantees the hook never blocks unrelated work.

set -euo pipefail

# --- JSON parser shim (jq preferred, python3 fallback) -----------------------
if command -v jq >/dev/null 2>&1; then
  _json() { jq -r "$1" "${2:--}"; }
else
  if ! command -v python3 >/dev/null 2>&1; then
    # Neither tool — fail open. Refusing to block is safer than bricking
    # unrelated repos; the soft instruction in SKILL.md still applies.
    echo "ursamu-dev hook: neither jq nor python3 available, fail-open" >&2
    exit 0
  fi
  _json() {
    local path="${2:--}"
    python3 -c '
import json, sys, os, re
src = sys.argv[2]
data = json.load(sys.stdin if src == "-" else open(src))
expr = sys.argv[1].lstrip(".")
# Minimal jq-subset: dotted keys + .arr[] flatten + .arr[<i>] index
cur = data
for tok in re.split(r"\.(?![^\[]*\])", expr):
    if not tok: continue
    if tok.endswith("[]"):
        cur = cur.get(tok[:-2], []) if isinstance(cur, dict) else []
        for x in cur: print(x)
        sys.exit(0)
    cur = cur.get(tok) if isinstance(cur, dict) else None
    if cur is None: print(""); sys.exit(0)
print(cur if not isinstance(cur, (list, dict)) else json.dumps(cur))
' "$1" "$path"
  }
fi

# --- read payload ------------------------------------------------------------
payload="$(cat)"
tool=$(printf '%s' "$payload" | _json '.tool_name')
case "$tool" in
  Write|Edit|NotebookEdit) ;;
  *) exit 0 ;;
esac

target=$(printf '%s' "$payload" | _json '.tool_input.file_path')
[ -n "$target" ] || exit 0

# Resolve to absolute path if possible
case "$target" in
  /*) ;;
  *)  target="$PWD/$target" ;;
esac

# --- walk up to find a marker dir --------------------------------------------
dir=$(dirname "$target")
while [ "$dir" != "/" ] && [ ! -f "$dir/.ursamu-stage" ]; do
  dir=$(dirname "$dir")
done
[ -f "$dir/.ursamu-stage" ] || exit 0

# Require deno.json co-located with the marker AND referencing @ursamu/ursamu.
# This prevents sibling-repo bleed: a stale marker in a parent dir won't fire
# unless that same dir is also an UrsaMU project.
[ -f "$dir/deno.json" ] || exit 0
grep -q '@ursamu/ursamu' "$dir/deno.json" 2>/dev/null || exit 0

stage=$(_json '.stage' "$dir/.ursamu-stage")
confirmed=$(_json '.design_confirmed' "$dir/.ursamu-stage")
[ "$stage" = "0" ] || exit 0
[ "$confirmed" != "true" ] || exit 0

# --- scope check -------------------------------------------------------------
# Normalize target to a path relative to the marker dir.
rel="${target#"$dir"/}"

# Read scope globs. Default to the standard UrsaMU layout if absent.
# (bash 3.2 on macOS lacks mapfile, so use a while-read loop.)
globs=()
while IFS= read -r line; do
  [ -n "$line" ] && globs+=("$line")
done < <(_json '.scope_globs[]' "$dir/.ursamu-stage" 2>/dev/null || true)
if [ "${#globs[@]}" -eq 0 ]; then
  globs=("src/plugins/**" "src/commands/**" "system/scripts/**" "tests/**")
fi

matched=0
for g in "${globs[@]}"; do
  # Convert glob -> regex: ** => .*, * => [^/]*
  re=$(printf '%s' "$g" | sed -e 's/\./\\./g' -e 's/\*\*/__DBLSTAR__/g' -e 's/\*/[^\/]*/g' -e 's/__DBLSTAR__/.*/g')
  if printf '%s' "$rel" | grep -Eq "^${re}$"; then
    matched=1; break
  fi
done
[ "$matched" = "1" ] || exit 0

# --- deny --------------------------------------------------------------------
feature=$(_json '.feature' "$dir/.ursamu-stage" 2>/dev/null || true)
feature_msg=""
[ -n "$feature" ] && feature_msg=" (feature: $feature)"

# Emit Claude Code permission deny JSON.
cat <<JSON
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "ursamu-dev Stage 0 gate active$feature_msg. Confirm the Design Plan before writing to $rel. To advance: bash ~/.claude/skills/ursamu-dev/hooks/advance-stage.sh --confirm-design  (or edit $dir/.ursamu-stage and set design_confirmed: true)."
  }
}
JSON
