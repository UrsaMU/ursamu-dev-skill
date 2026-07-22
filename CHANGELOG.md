# Changelog

All notable changes to `@lhi/ursamu-dev` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added

- **`skill/references/official-packages.md`** — catalog of first-party monorepo
  packages (`@ursamu/mail`, `@ursamu/bbs`, `@ursamu/combat`, `@ursamu/jobs`,
  `@ursamu/channels`, `@ursamu/help`, `@ursamu/builder`, `@ursamu/wiki`,
  combat-backed TTRPG systems, ai-gm, discord, map, vendor, lang, …). Includes
  reuse-before-invent rules, load-order notes, combat `CombatPorts` pattern,
  and a decision cheat-sheet so agents stop scaffolding features that already
  ship as packages.
- **`lib/official-packages.js`** — shared JS catalog of reserved scaffold
  slugs (mail, bbs, combat, jobs, aliases like `channel` / `map-plugin`, …).
- **Scaffold refuses official package names.** `validateName` / `writeScaffold`
  / `ursamu-scaffold` error with install hints when the name is reserved.
  Escape hatch: `--force` for monorepo package authors. Tests in
  `__tests__/scaffold/official-names.test.js`.

### Changed

- **SKILL.md** — triggers and quick index point at official packages; scaffold
  section requires checking the catalog first; engine target notes
  `@ursamu/mush` alongside legacy `@ursamu/ursamu`.
- **Stage 0** — `PKG:` line required on design plans; questions cover official
  package reuse, peers, and load order.
- **Stage 1 / api-reference** — prefer `jsr:@ursamu/mush` imports; document
  official package import examples; link the package catalog.
- **Scaffold help / docs / CLI examples** — use `greeter` / `faction-board`
  instead of `bbs` / `mail` as sample names.
- **Scaffold templates use modern imports** — `jsr:@ursamu/mush` (engine) and
  `jsr:@ursamu/help` instead of legacy `jsr:@ursamu/ursamu` /
  `jsr:@ursamu/help-plugin`.

---

## [2.1.0] — 2026-05-12

### Added (after 2.1.0)

- **`--install-claude-hooks` / `--uninstall-claude-hooks` CLI flags.** Automate
  merging the PreToolUse stage-gate hook entry into `~/.claude/settings.json`.
  Idempotent (matches on command-string substring), preserves unrelated keys
  and other PreToolUse matchers, makes a `.bak` on first modify, and surfaces
  a clear error on corrupted settings JSON instead of crashing. Opt-in only —
  not auto-installed by `--claude` / `--all`.
- **`lib/claude-hooks.js`** module exposing `installClaudeStageGate` and
  `uninstallClaudeStageGate` for programmatic use.
- **Test suite** `__tests__/cli/install-claude-hooks.test.js` (10 cases:
  missing/empty/populated settings, unrelated keys, existing matchers,
  idempotency, dry-run, uninstall, corrupted JSON, `.bak` creation).
  Run via `npm run test:claude-hooks`.

### Changed (SKILL.md refactor for progressive disclosure)

- **SKILL.md split by stage.** Was 1110 lines / 5970 words (2.2× / 1.2× over the
  Anthropic ceilings). Now 108 lines / 852 words — a thin router that points at
  per-stage references. Each stage loads only when its work is active.
- **New `skill/references/` files** carved from the old monolithic SKILL.md:
  - `stage-0-design.md`, `stage-1-generate.md`, `stage-2-audit.md`,
    `stage-3-refine.md`, `stage-4-test.md`, `stage-5-docs.md`
  - `example-gold.md` (full end-to-end worked example, moved out of SKILL.md)
- **Description rewritten to fix trigger collisions** — front-loads "UrsaMU
  (TypeScript MUSH engine)" and explicitly excludes RhostMUSH/PennMUSH/TinyMUX
  softcode work (delegated to `mush-architect` / `mush-natural`). Eliminates the
  "design → audit → test → docs" overlap with `sdd` / `tdd-audit` /
  `code-reviewer` / `documentation`.
- **ALL-CAPS imperatives softened.** Skill-creator's current guidance treats
  `MUST`/`ALWAYS`/`NEVER`/`MANDATORY` as yellow flags — models generalize better
  from stated reasoning. Replaced narrative gates ("Do not proceed", "REQUIRED
  BLOCKER", "MANDATORY — do not skip") with explanatory framing. Code-comment
  uses of `MUST`/`REQUIRED` in technical diagrams kept where they're labels,
  not directives.
- **Three redundant duplicate gates collapsed** (Stage-0 confirmation appeared
  twice, Stage-4b/Stage-5 transition appeared three times).

### Added (skill-design state-of-the-art for May 2026)

- **`skill/hooks/` — optional PreToolUse stage-gate.** Converts the soft "wait
  for design confirmation" into a deterministic block on Write/Edit/NotebookEdit
  calls into the plugin tree. Marker file is `.ursamu-stage` (git-ignored,
  per-project). Fails open if neither `jq` nor `python3` is present. Sibling-repo
  safety guaranteed by requiring co-located `deno.json` referencing
  `@ursamu/ursamu`. Includes `advance-stage.sh` helper and full README.
- **`skill/evals/` — trigger evals.** 10 should-trigger + 10 should-not-trigger
  near-miss prompts, each explicitly naming the sibling skill it *should* route
  to. Covers known collisions with `mush-architect`, `tdd-workflows-tdd-cycle`,
  `tdd-audit`, `code-reviewer`, `sdd`, `documentation`, and others. Includes
  JSON Schema and a v0 paste-into-Claude runner.
- **Skill composition section** in the new SKILL.md router — documents that
  this skill explicitly invokes `/tdd-audit`, and that subagents do not inherit
  parent-skill context (must declare `skills: [ursamu-dev]` or pass references
  inline).

### Notes

- Programmatic eval execution requires the Anthropic SDK with a configured
  skill loader — out of scope for this release; `evals/run.sh` is a v0 paste
  harness.
- The PreToolUse hook is opt-in: users add the snippet to their
  `~/.claude/settings.json` per `skill/hooks/README.md`. Auto-install via
  `bin/cli.js --install-hooks` is queued for a follow-up release.
- Package `files:` allowlist already includes `skill/`, so the new `hooks/`,
  `evals/`, and split `references/` directories ship without further changes.

---

## [2.0.0] — 2026-05-12

### Changed (breaking-ish — skill rewrite for engine v2.x)

- **Skill aligned with `@ursamu/ursamu` v2.3.4.** All references and guidance now
  target the v2.x engine. Plugin authors using v1.9.x should pin
  `@lhi/ursamu-dev@^1` until upgrading.
- **`skill/references/api-reference.md` regenerated** from engine `docs/llms.md`
  (Mar 25 snapshot) plus a new "v2.x Additions" appendix covering APIs not yet in
  the auto-generated reference.
- **`rhost-vision` removed** from skill guidance. Use the native v2.3.0+ layout
  helpers (`header`, `divider`, `footer`) exported from `jsr:@ursamu/ursamu`
  instead.

### Added (v2.x extension points documented in SKILL.md)

- **`engine:ready` hook** (engine v1.9.30+) — guidance + pairing checklist for
  cross-plugin wiring that must wait until every plugin's `init()` has completed.
- **`registerCmdMiddleware`** (engine v1.9.27+) — section under Stage 1 with
  short-circuit / pass-through rules and a non-hot-removable caveat.
- **`registerLockFunc` + `&&` / `||` operators** (engine v2.2.0+) — custom lock
  vocabulary, reserved-name protection, and short-circuit operator support.
- **`registerFormatHandler` / `unregisterFormatHandler` / `resolveFormat`**
  (engine v2.3.0+) — format-attribute pipeline with resolution order (softcode →
  plugin handler → built-in), plus a new Stage 2 audit check (`format-pair`)
  enforcing register/unregister parity with `gameHooks`-style identical references.
- **`joinSocketToRoom` + `socketId` on `SessionEvent`** (engine v1.9.27+) —
  post-login socket wiring pattern for channel-style plugins.
- **Native layout helpers** (engine v2.3.0+) — `header` / `divider` / `footer` now
  used in the Stage 1 examples in place of hand-rolled `u.util.center` calls.
- **Stage 2 audit checklist expanded** with new labels `format-pair`,
  `middleware`, `lockfunc`. Audit Report format now reports `<N>/<TOTAL>` where
  TOTAL is the count of applicable checks for the feature.

### Notes

- The "builder privilege level returns 1 instead of 2" engine commit (#117)
  refers to an internal perm-table boundary, **not** the builder flag's `lvl`
  (still `7`). Lock expressions like `"connected builder+"` continue to work
  exactly as before. No skill changes were needed for that commit.
- `removePluginRoute` still does not exist; `registerCmdMiddleware` is also
  not unregisterable. Both are documented as "plugin is not hot-removable" in
  the relevant Stage 1 sections.

---

## [1.0.0] — 2026-03-24

### Added

- **Full 15-check audit coverage** — all Stage 2 checklist items now implemented:
  - `check-02` — `canEdit` permission guard: warns when `exec()` fetches a target
    and writes to the DB without calling `u.canEdit(u.me, target)`
  - `check-05` — Admin flags guard: hints when an `addCmd` with `lock: "connected admin+"`
    has no `u.me.flags.has()` call in `exec()` (belt-and-suspenders check)
  - `check-07` — Color reset: warns when a line contains a MUSH color-start code
    (`%ch`, `%cr`, etc.) without a `%cn` reset on the same line
  - `check-08` — Op string whitelist: errors when `db.modify()` is called with any
    op not in `{ $set, $inc, $unset }` (complements the check-03 blacklist)
- **`ursamu-audit --explain <check-id>`** — prints full plain-language explanation,
  root-cause analysis, and fix guidance for any check. Use `--explain all` for a
  one-line summary of every check.
- **`ursamu-scaffold --add-command <name>`** — appends a complete `addCmd()` skeleton
  (with help text and Examples) to an existing plugin's `commands.ts` without
  overwriting anything. Supports `--dry-run`.
- **`lib/audit/explanations.js`** — new module exporting `EXPLANATIONS` record and
  `explain(checkId)` helper used by the `--explain` flag.
- **`lib/scaffold/templates.js`** — `commandBlockTemplate(commandName)` for
  single-command block generation.

### Changed

- `bin/audit.js` help text updated to list all 15 checks with level annotations.
- `runAllChecks` in `lib/audit/checks.js` now runs all 15 checks in numeric order
  with inline `// check-NN` comments.
- `lib/scaffold/writer.js` exports new `addCommandToPlugin()` function.

---

## [0.7.0] — 2026-03-20

### Added

- **`ursamu-audit --fix`** — auto-repairs `check-09` (adds `jsr:` prefix) and
  `check-15` (inserts `return true;` into `init()`) in place.
- **`ursamu-audit --watch`** — watches `./src` and re-runs on every save, printing
  a compact diff of added/resolved violations.
- **`ursamu-dev --install-hooks`** — installs a pre-commit git hook that runs
  `npx ursamu-audit --no-hints`. Idempotent (safe to run multiple times).
- **IPv6 SSRF guard** (`lib/llm.js`) — blocks `::1` (loopback), `fc00::/7`
  (Unique Local), and `fe80::/10` (Link-Local) in `--base-url` validation.
- **`HELP` export** from `bin/docs.js` — enables direct test assertions on help
  text content; `--api-key` shell-history warning added to help output.
- **`lib/audit/fixer.js`** — pure transformation module used by `--fix`.
- **`lib/audit/watcher.js`** — `startWatch()`, `diffViolations()` helpers.
- **`lib/hooks.js`** — `findGitRoot()`, `installHook()` for pre-commit integration.
- **Security tests**: IPv6 SSRF (`ssrf-base-url.test.js`), `--api-key` help warning
  (`missing-arg.test.js`), fixer (`fixer.test.js`), hooks (`hooks.test.js`).

---

## [0.6.1] — 2026-03-18

Patch: version bump to fix npm publish conflict (0.6.0 already on registry).

---

## [0.6.0] — 2026-03-18

### Added

- **API reference** synced to engine v1.9.22–23 in `skill/SKILL.md`.
- Prominent reference guidance section in the skill prompt.
- `llms.md` mirrored in skill for LLM-accessible documentation.

---

## [0.5.0] — 2026-03-15

### Added

- **`ursamu-docs`** (`bin/docs.js`) — standalone LLM docs generator. Runs any
  SKILL.md stage (default: Stage 5) against UrsaMU source files using any
  OpenAI-compatible provider (Anthropic, Google, OpenAI, custom).
- **`lib/llm.js`** — provider resolution, SSRF guard for custom base URLs.
- **`lib/prompts.js`** — extracts Stage N section from `SKILL.md`.
- **`lib/scanner.js`** — globs `src/commands/*.ts` and `src/plugins/*/`.
- **`lib/writer.js`** — parses labeled sections from LLM response, writes artifacts.
- Security hardening: non-HTTPS scheme blocking, IPv4 private-range blocking.
- `standalone-docs-cli.md` architecture notes.

---

## [0.4.6] — 2026-03-12

### Added

- **`ursamu-scaffold`** (`bin/scaffold.js`) — plugin boilerplate generator.
  Creates `index.ts`, `commands.ts`, `README.md`; optionally `routes.ts` and
  `tests/` with a full `mockU()` helper.
- **`ursamu-audit`** (`bin/audit.js`) — static analysis CLI. 11 checks covering
  the Stage 2 audit invariants; JSON output; `--no-hints` flag.
- `lib/audit/checks.js` with `check-01`, `check-03`, `check-04`, `check-06`,
  `check-09` through `check-15`.
- `lib/audit/runner.js`, `lib/audit/reporter.js` supporting modules.

---

## [0.3.x – 0.1.0]

Early releases: skill installer (`bin/cli.js`), `--dry-run`, `--all` flag,
multi-agent support (Claude Code, Gemini CLI, Cursor, Codex, Antigravity,
OpenCode), `companion-skills/` directory.
