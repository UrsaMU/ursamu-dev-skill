# The Six-Stage Skill Pipeline

When `/ursamu-dev` is active, the agent follows a six-stage pipeline for every task.

```
Stage 0 — Design    → Design Plan + Decision Log     (skill/references/stage-0-design.md)
Stage 1 — Generate  → Working code                   (skill/references/stage-1-generate.md)
Stage 2 — Audit     → Audit Report <N>/<TOTAL>       (skill/references/stage-2-audit.md)
Stage 3 — Refine    → Fixed code                     (skill/references/stage-3-refine.md)
Stage 4 — Test      → Deno tests + /tdd-audit        (skill/references/stage-4-test.md)
Stage 5 — Docs      → Help + JSDoc + README          (skill/references/stage-5-docs.md)
```

## Layout (v2.1.0)

`skill/SKILL.md` is a thin (~150-line) router. Per-stage guidance lives in
`skill/references/stage-N-*.md` and is loaded only when that stage is active —
this is a deliberate progressive-disclosure split done in v2.1.0 to stay under
Anthropic's skill-size ceilings. The canonical worked example moved out of
SKILL.md into `skill/references/example-gold.md`.

`SKILL.md` and the references are the authoritative source for every stage's
contract. This page only summarises *what* the stages are and *how* they
compose — it does not restate the checklists.

## Stage 0 — Design

The agent reads `skill/references/api-reference.md` and existing source before
asking targeted clarifying questions, then produces a Design Plan that must be
confirmed before Stage 1 writes any files.

### Optional PreToolUse stage-gate

By default the Stage 0 gate is a soft instruction — the model can violate it.
Installing the PreToolUse hook (see [hooks.md](./hooks.md) and
[install.md](./install.md#claude-code-stage-gate-hook----install-claude-hooks))
converts it into a deterministic block: Write/Edit/NotebookEdit calls into the
plugin tree are denied by Claude Code itself until `.ursamu-stage` reports
`design_confirmed: true`. Useful for autonomous runs; opt-in.

## Stage 1 — Generate

Writes code for the correct target context:

| Context | Location | Available APIs |
|---------|----------|----------------|
| Native command | `src/commands/` | Full Deno — filesystem, network, all SDK |
| Plugin | `src/plugins/<name>/` | Full Deno via `jsr:@ursamu/ursamu` |
| System script | `system/scripts/` | Sandbox only — `u.*` SDK, no Deno/fetch/fs |

v2.x extension points (`registerCmdMiddleware`, `registerLockFunc`,
`registerFormatHandler`, `engine:ready`, `joinSocketToRoom`) are covered in
`stage-1-generate.md` and [architecture.md](./architecture.md).

## Stage 2 — Audit

Every response includes an Audit Report formatted as `<N>/<TOTAL>`, where
`TOTAL` is the count of applicable checks for the feature (not always 18). The
v2.x checklist has 18 entries — the v1.x 15 plus the new v2.x labels
`format-pair`, `middleware`, and `lockfunc`.

See [audit.md](./audit.md) for the full reference and the `ursamu-audit` CLI
that enforces the same invariants statically.

## Stage 3 — Refine

If Stage 2 finds failures, only the affected sections are rewritten. The full
checklist runs again before the final output is shown.

## Stage 4 — Test

Deno tests using `mockU()` / `mockPlayer()`. Stage 4b invokes `/tdd-audit` for
Red-Green-Refactor remediation of OWASP-class vulnerabilities the static
checklist misses.

## Stage 5 — Docs

In-game help text, JSDoc blocks, plugin README, REST route contracts, and
`help/<name>.md` files registered via `registerHelpDir()`. The same output
format is what `ursamu-docs` emits in batch mode — see
[docs-generator.md](./docs-generator.md).
