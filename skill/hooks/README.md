# ursamu-dev hooks

Optional PreToolUse hook that converts the Stage 0 confirmation gate from a
soft instruction into a deterministic block. Useful for autonomous use where
the model could otherwise skip directly into Stage 1.

The hook fails open — if neither `jq` nor `python3` is installed, or if the
marker file is missing, every tool call passes through normally.

## What it does

`pretool-stage-gate.sh` reads the Claude Code PreToolUse JSON payload on stdin
and emits a `permissionDecision: "deny"` when **all** of these are true:

1. The tool is `Write`, `Edit`, or `NotebookEdit`.
2. The target file is under a directory whose nearest ancestor contains
   `.ursamu-stage` **and** a `deno.json` referencing `@ursamu/ursamu`.
3. `.ursamu-stage` has `"stage": 0` and `"design_confirmed": false`.
4. The target path matches one of `.ursamu-stage`'s `scope_globs` (relative
   to the marker dir). Defaults to
   `src/plugins/**`, `src/commands/**`, `system/scripts/**`, `tests/**`.

If any condition fails the hook exits 0 (no decision), so it cannot block
unrelated work.

## Install

One-liner (recommended — idempotent, preserves existing settings, makes a `.bak`):

```bash
npx @lhi/ursamu-dev --install-claude-hooks
```

To remove:

```bash
npx @lhi/ursamu-dev --uninstall-claude-hooks
```

### What gets installed

The installer merges this entry into `~/.claude/settings.json` under
`hooks.PreToolUse` (use this shape if you prefer to hand-edit):

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

If you already have a `hooks.PreToolUse` array, the installer appends (it never
replaces) and matches on command-string to stay idempotent.

## Use

```bash
# In your UrsaMU project root (where deno.json lives):
bash ~/.claude/skills/ursamu-dev/hooks/advance-stage.sh --init --feature "+gold"
# .ursamu-stage now exists at stage 0, design_confirmed=false.

# Claude works through Stage 0 with you. When the Design Plan is approved:
bash ~/.claude/skills/ursamu-dev/hooks/advance-stage.sh --confirm-design

# Writes are now unblocked.

# Optional: bump the stage marker as you progress (purely informational —
# only the design_confirmed flag controls the gate).
bash ~/.claude/skills/ursamu-dev/hooks/advance-stage.sh --to 2
```

When the feature ships, clear the marker:

```bash
bash ~/.claude/skills/ursamu-dev/hooks/advance-stage.sh --clear
```

## Marker schema (`.ursamu-stage`)

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

Add `.ursamu-stage` to your `.gitignore` — it is local state, not source.

## Why not auto-advance on PostToolUse?

A `PostToolUse` hook that bumped `stage` to 4 when a test file was written would
race against TDD-red (which intentionally writes failing tests at Stage 1) and
would reward the model for fabricating test files to escape the gate. Stage
advancement stays explicit.

## Failure modes guarded against

- **Sibling-repo bleed** — marker found via ancestor walk also requires a
  co-located `deno.json` referencing `@ursamu/ursamu`.
- **Stale marker** — `created_ts` and `feature` are echoed in the deny message
  so you notice old markers; `--reset` and `--clear` are explicit.
- **`jq` missing** — falls back to `python3`; if neither exists, fails open
  with a stderr warning.
- **Path normalization** — target path is resolved to a path relative to the
  marker dir before glob matching.
- **Hook re-entry** — `pretool-stage-gate.sh` only reads files, never writes,
  so it cannot trigger itself.

## Reference

Claude Code hooks guide: <https://code.claude.com/docs/en/hooks-guide>
