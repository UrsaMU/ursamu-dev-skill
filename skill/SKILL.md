---
name: ursamu-dev
description: "UrsaMU (TypeScript MUSH engine, @ursamu/mush / @ursamu/ursamu ≥ 2.3.4) plugin, command, system-script, and REST development. Use when working with `addCmd`, `IPlugin`, `u.db`, `gameHooks`, `DBO`, `registerPluginRoute`, official packages (@ursamu/mail, @ursamu/bbs, @ursamu/combat, @ursamu/jobs, …), or files under `src/plugins/` / `packages/*` / `src/commands/` / `system/scripts/`. Not for RhostMUSH/PennMUSH/TinyMUX softcode (see mush-architect / mush-natural). Six-stage workflow: design → generate → audit → refine → test → docs, with /tdd-audit integration."
risk: low
source: local
date_added: "2026-03-22"
updated: "2026-07-22"
engine_target: "@ursamu/mush ≥ 0.1 / @ursamu/ursamu ≥ 2.3.4"
---

## Use this skill when

- Writing or modifying UrsaMU **commands** (`addCmd`), **plugins** (`IPlugin`), or **system scripts**
- Designing **DBO collections**, **REST routes** (`registerPluginRoute`), or **gameHooks** wiring
- Installing, configuring, or **extending official packages** (`@ursamu/mail`, `@ursamu/bbs`, `@ursamu/combat`, `@ursamu/jobs`, …)
- Working under monorepo `packages/*` or game `src/plugins/`
- Reviewing UrsaMU TypeScript for correctness, security, or style
- Writing **Deno tests** or **plugin docs** for any of the above
- Any task referencing `jsr:@ursamu/mush`, `jsr:@ursamu/ursamu`, or `@ursamu/*` packages

## Do not use this skill when

- Working on RhostMUSH / PennMUSH / TinyMUX softcode — that's [`mush-architect`](https://github.com/UrsaMU) territory
- Working on non-UrsaMU TypeScript/Deno projects
- The task is purely about Discord bot code **outside** `@ursamu/discord`

---

## Check the API reference first

`references/api-reference.md` is the authoritative source for every UrsaMU type, method signature, import path, event payload, and pattern. It mirrors the engine's `docs/llms.md` with a "v2.x Additions" appendix for APIs not yet in the generated reference.

Read it before writing code. Your training data is stale; SDK shapes drift between minor versions. If anything in the stage references conflicts with `api-reference.md`, the API reference wins.

---

## Prefer official packages over new plugins

Before scaffolding or designing a greenfield plugin, open
[references/official-packages.md](references/official-packages.md).

UrsaMU already ships first-party packages for common MUSH features and
shared engines:

| Need | Package |
|------|---------|
| Engine APIs | `@ursamu/mush` (re-exports `@ursamu/core`) |
| Help | `@ursamu/help` |
| Channels | `@ursamu/channels` |
| Mail | `@ursamu/mail` |
| BBS | `@ursamu/bbs` |
| Jobs / requests | `@ursamu/jobs` |
| Builder verbs | `@ursamu/builder` |
| Wiki | `@ursamu/wiki` |
| Combat turns / AI | `@ursamu/combat` (+ system ports) |
| Events / scenes / Discord | `@ursamu/events`, `@ursamu/scene`, `@ursamu/discord` |
| TTRPG systems | `@ursamu/cofd-plugin`, `dnd-plugin`, `cyberpunk-plugin`, `sw5e-plugin`, … |

**Reuse or extend** those packages. Scaffold only when nothing fits.
Game-system work usually means implementing `CombatPorts` on `@ursamu/combat`,
not rewriting initiative.

---

## Six-stage workflow

Each stage feeds the next; the audit checklist (Stage 2) assumes Stage 0 invariants exist, and Stage 4b's `/tdd-audit` assumes Stage 4 tests pass.

| Stage | Goal | Reference |
|-------|------|-----------|
| 0 — Design | Identify invariants, pick approach, get plan confirmed | [references/stage-0-design.md](references/stage-0-design.md) |
| 1 — Generate | Write code per confirmed plan, using v2.x patterns | [references/stage-1-generate.md](references/stage-1-generate.md) |
| 2 — Audit | Run 18-check security/style/structure audit | [references/stage-2-audit.md](references/stage-2-audit.md) |
| 3 — Refine | Fix anything Stage 2 flagged | [references/stage-3-refine.md](references/stage-3-refine.md) |
| 4 — Test | Deno tests for every code path + `/tdd-audit` remediation | [references/stage-4-test.md](references/stage-4-test.md) |
| 5 — Docs | In-game help text, JSDoc, plugin README, REST contract | [references/stage-5-docs.md](references/stage-5-docs.md) |

Stage 0 is a confirmation pause: Stage 1 writes files that Stage 2 audits, so confirming the plan first prevents wasted audit cycles. If the optional PreToolUse hook is installed (see `hooks/`), Write/Edit calls into the plugin tree are blocked until the design is confirmed via `.ursamu-stage`.

Worked end-to-end example: [references/example-gold.md](references/example-gold.md).

---

## Scaffold before designing (new plugins only)

**First:** confirm [official-packages.md](references/official-packages.md) has no
matching package. If it does, install/configure that package instead of scaffolding.

If creating a genuinely new plugin and the directory does not yet exist, run this in your terminal before Stage 0:

```bash
npx @lhi/ursamu-dev scaffold <name> [--with-routes] [--with-tests]
```

Generates `index.ts`, `commands.ts`, `README.md`, and `help/<name>.md` boilerplate with `registerHelpDir()` wired into `init()`. Reads `version` from `deno.json` if present. This is a terminal command, not a Claude slash command — the user runs it, then resumes Stage 0 here.

If the plugin already exists, skip and go straight to Stage 0.

---

## Quick API reference index

`references/api-reference.md` is the canonical source. Jump points:

| Topic | Section |
|-------|---------|
| **Official packages (mail, bbs, combat, …)** | [references/official-packages.md](references/official-packages.md) |
| All `u.*` methods | `IUrsamuSDK`, `u.db`, `u.util`, `u.chan`, `u.bb`, `u.auth`, `u.sys`, `u.mail`, `u.ui`, `u.events` |
| Types & interfaces | `IDBObj`, `ICmd`, `IPlugin`, `IUrsamuSDK` |
| `gameHooks` events + payloads | `GameHooks — Engine Event Bus` |
| Plugin coupling (tight vs. loose) | `Plugin Coupling Patterns` |
| Lock expressions | `ICmd — Command Registration` |
| MUSH color codes | `MUSH Color Codes` |
| REST core endpoints | `REST API — Core Endpoints` |
| Native layout helpers (`header`, `divider`, `footer`) | `v2.x Additions — Native layout helpers` |
| Format-attribute pipeline (`resolveFormat`, `registerFormatHandler`) | `v2.x Additions — Format-attribute pipeline` |
| `registerCmdMiddleware` | `v2.x Additions — registerCmdMiddleware` |
| `registerLockFunc` + `&&` / `\|\|` | `v2.x Additions — registerLockFunc` |
| `engine:ready` hook | `v2.x Additions — engine:ready hook` |
| `joinSocketToRoom` + `socketId` | `v2.x Additions — joinSocketToRoom` |
| Project file layout | `Project Layout` |

---

## Composing with other skills

This skill is the orchestrator for UrsaMU work. It explicitly invokes:

- **`/tdd-audit`** — Stage 4b. Catches OWASP-class vulnerabilities the static checklist misses via Red-Green-Refactor exploit tests.
- **`/tdd-workflows-tdd-cycle`** — when Stage 4 tests need disciplined Red-Green-Refactor (not just coverage).
- **`/api-documentation`** — when Stage 5 needs OpenAPI specs for REST routes that go beyond the contract comment.

Subagents do **not** inherit this skill's context. If you spawn one for any stage (e.g. the Stage 2 audit), declare `skills: [ursamu-dev]` in the agent definition or pass the relevant `references/stage-N-*.md` content inline. See the [agent-teams docs](https://code.claude.com/docs/en/agent-teams).

---

## Skill hygiene

- This SKILL.md is intentionally thin (~150 lines). Each stage's full guidance lives in `references/stage-N-*.md` — load only the active stage to control token cost.
- `references/api-reference.md` is the single source of truth for SDK shapes; soft-stated APIs in this skill must always defer to it.
- `references/official-packages.md` is the catalog of first-party `@ursamu/*` packages; refresh it when monorepo `packages/*` gains members.
- The `evals/` directory holds should-trigger / should-not-trigger prompts. Run them when changing the description above.
- The `hooks/` directory holds optional PreToolUse stage-gate scripts. Install via `npx @lhi/ursamu-dev --install-hooks`.
