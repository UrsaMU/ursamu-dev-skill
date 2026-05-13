# Claude Code PreToolUse Stage-Gate Hook

The `skill/hooks/` directory ships an optional Claude Code PreToolUse hook
that converts the Stage 0 design-confirmation gate from a soft instruction
into a deterministic block on `Write`, `Edit`, and `NotebookEdit` tool calls.

Canonical reference: `skill/hooks/README.md`. This page covers the parts
worth documenting at the package level — the marker schema, distribution,
failure modes, and the rationale for *not* auto-advancing.

Install via [`--install-claude-hooks`](./install.md#claude-code-stage-gate-hook----install-claude-hooks).

## What it does

`pretool-stage-gate.sh` reads the PreToolUse JSON payload from stdin and
emits `permissionDecision: "deny"` when **all** of:

1. The tool is `Write`, `Edit`, or `NotebookEdit`.
2. The target file's nearest ancestor directory contains both
   `.ursamu-stage` **and** a `deno.json` referencing `@ursamu/ursamu`.
3. `.ursamu-stage` has `"stage": 0` and `"design_confirmed": false`.
4. The target matches one of `.ursamu-stage`'s `scope_globs` (defaults:
   `src/plugins/**`, `src/commands/**`, `system/scripts/**`, `tests/**`).

If any condition is false, the hook exits 0 and Claude Code proceeds normally.

## Marker schema — `.ursamu-stage`

```json
{
  "version": 1,
  "stage": 0,
  "stages": ["design", "generate", "audit", "refine", "test", "docs"],
  "feature": "+gold",
  "design_confirmed": false,
  "scope_globs": ["src/plugins/**", "src/commands/**", "system/scripts/**", "tests/**"],
  "created_ts": "2026-05-12T14:00:00Z",
  "updated_ts": "2026-05-12T14:00:00Z"
}
```

Per-project local state — add `.ursamu-stage` to `.gitignore`. Manage it via
`skill/hooks/advance-stage.sh` (`--init`, `--confirm-design`, `--to <n>`,
`--clear`, `--reset`).

## Distribution

The hook lives in `skill/hooks/` and ships with the skill payload — `--claude`
installs the scripts to `~/.claude/skills/ursamu-dev/hooks/`. The settings
patch is a **separate, opt-in** step:

- `--install-claude-hooks` merges a single `PreToolUse` matcher into
  `~/.claude/settings.json` pointing at the installed script. Idempotent,
  makes `.bak`, preserves unrelated keys.
- `--uninstall-claude-hooks` removes only that matcher.

Hand-edit form (if you prefer):

```json
{
  "matcher": "Write|Edit|NotebookEdit",
  "hooks": [
    {
      "type": "command",
      "command": "bash ~/.claude/skills/ursamu-dev/hooks/pretool-stage-gate.sh",
      "timeout": 5
    }
  ]
}
```

## Failure modes (all guarded)

| Mode | Mitigation |
|------|------------|
| Sibling-repo bleed | Marker discovery requires a co-located `deno.json` referencing `@ursamu/ursamu` — the hook will not fire in unrelated checkouts. |
| Stale marker | `created_ts` and `feature` are echoed in deny messages so old markers are visible. `advance-stage.sh --reset` / `--clear` are explicit. |
| `jq` missing | Falls back to `python3`. If neither exists, fails open with a stderr warning rather than blocking work. |
| Path normalization | Target path is resolved relative to the marker dir before glob matching. |
| Hook re-entry | The hook only reads files — it cannot trigger itself. |
| Corrupted settings JSON | `--install-claude-hooks` surfaces a clear error instead of overwriting. |

## Why not auto-advance on PostToolUse?

A `PostToolUse` hook that bumped `stage` to 4 when a test file appeared would
race against TDD-red — which intentionally writes failing tests at Stage 1 —
and would reward the model for fabricating tests to escape the gate. Stage
advancement is kept explicit and human-controlled via `advance-stage.sh`.

## Relationship to the audit

The stage-gate is **defense in depth**, not a replacement for the Stage 2
audit. It only ensures the audit gets a chance to run against code written
from a confirmed plan. See [security.md](./security.md) and
[pipeline.md](./pipeline.md).
