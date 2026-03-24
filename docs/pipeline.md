# The Six-Stage Skill Pipeline

When `/ursamu-dev` is active, the agent follows a mandatory six-stage pipeline for every task. No stage may be skipped.

```
Stage 0 — Design    → Design Plan + Decision Log
Stage 1 — Generate  → Working code
Stage 2 — Audit     → Audit Report (11 checklist items)
Stage 3 — Refine    → Fixed code (or "No issues found")
Stage 4 — Test      → Passing Deno test file + TDD remediation
Stage 5 — Docs      → Help text + JSDoc + README (if plugin)
```

## Stage 0 — Design

The agent reads `skill/references/api-reference.md` and all existing source files before asking any questions. It asks **one** targeted clarifying question per message (prefer multiple-choice), then produces a Design Plan that must be confirmed before any code is written. The plan includes a Decision Log documenting architecture choices and trade-offs.

## Stage 1 — Generate

Writes code for the correct target context:

| Context | Location | Available APIs |
|---------|----------|---------------|
| Native command | `src/commands/` | Full Deno — filesystem, network, all SDK |
| Plugin | `src/plugins/<name>/` | Full Deno via `jsr:@ursamu/ursamu` |
| System script | `system/scripts/` | Sandbox only — `u.*` SDK, no Deno/fetch/fs |

## Stage 2 — Security & Style Audit

Every response includes a full 11-item audit report. The same checks run in `ursamu-audit`. Covers:

- Input sanitization (`stripSubs` before DB writes)
- Atomic DB writes (`$set` / `$inc` / `$unset` only)
- Null checks on `u.util.target()` results
- Sandbox safety for system scripts
- `jsr:` import prefix
- Help text completeness on every `addCmd`
- Plugin phase discipline (no `addCmd` inside `init()`)
- `gameHooks` pairing — every `on()` paired with `off()` in `remove()`
- DBO namespace isolation (`<plugin>.<collection>`)
- REST auth guard — `if (!userId)` before any route logic
- `init()` returns `true`

See [audit.md](./audit.md) for the full checks reference.

## Stage 3 — Refine

If Stage 2 finds failures, only the affected sections are rewritten. The full checklist runs again before the final output is shown.

## Stage 4 — Test

Deno tests using the `mockU()` / `mockPlayer()` helpers. Required test cases: happy path, null target, permission denied, DB op validation, admin guard (if applicable), and input sanitization.

## Stage 5 — Docs

In-game help text, JSDoc blocks, plugin README, and REST route contracts. The same output format used by `ursamu-docs`. See [docs-generator.md](./docs-generator.md) for the output layout.
