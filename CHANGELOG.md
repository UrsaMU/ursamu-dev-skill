# Changelog

All notable changes to `@lhi/ursamu-dev` are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
