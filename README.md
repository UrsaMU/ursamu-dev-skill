# @lhi/ursamu-dev

A complete development toolkit for writing UrsaMU plugins and commands with an AI coding agent. Install the skill once and your agent knows the full UrsaMU development pipeline — correct import paths, plugin architecture, security patterns, and the mandatory six-stage **Design → Generate → Audit → Refine → Test → Docs** workflow.

**Four tools in one package:**

| Tool | What it does | Needs LLM? |
|------|-------------|-----------|
| `ursamu-dev` | Install the skill into your AI agent | No |
| `ursamu-audit` | Static analysis — catch violations before CI does | No |
| `ursamu-scaffold` | Generate correct plugin boilerplate in one command | No |
| `ursamu-docs` | Run any skill stage against your source to produce docs | Yes |

**Three commands every UrsaMU project should run after install:**

```bash
ursamu-dev --install-hooks   # block commits that fail the audit
ursamu-audit --fix           # auto-repair the two most common violations
ursamu-audit --watch         # live violation diff on every file save
```

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [ursamu-dev — Skill Installer](#ursamu-dev--skill-installer)
  - [Platform Flags](#platform-flags)
  - [Install the Pre-commit Hook](#install-the-pre-commit-hook)
  - [Activating the Skill](#activating-the-skill)
- [ursamu-audit — Static Analysis](#ursamu-audit--static-analysis)
  - [Usage](#usage-audit)
  - [Checks Reference](#checks-reference)
  - [Auto-fix Mode](#auto-fix-mode)
  - [Watch Mode](#watch-mode)
  - [JSON Output](#json-output)
  - [Exit Codes](#exit-codes-audit)
  - [CI Integration](#ci-integration)
- [ursamu-scaffold — Plugin Scaffold](#ursamu-scaffold--plugin-scaffold)
  - [Usage](#usage-scaffold)
  - [Options](#options-scaffold)
  - [Name Rules](#name-rules)
  - [Generated Files](#generated-files)
  - [Example](#example-scaffold)
- [ursamu-docs — Docs Generator](#ursamu-docs--docs-generator)
  - [Usage](#usage-docs)
  - [Options](#options-docs)
  - [Provider Setup](#provider-setup)
  - [Output Layout](#output-layout)
  - [CI Integration](#ci-integration-docs)
- [The Six-Stage Skill Pipeline](#the-six-stage-skill-pipeline)
- [Architecture](#architecture)
  - [Directory Structure](#directory-structure)
  - [Module Map](#module-map)
- [Security Model](#security-model)
- [Environment Variables](#environment-variables)
- [Scripts & Testing](#scripts--testing)
- [Supported Platforms](#supported-platforms)
- [Contributing](#contributing)
- [License](#license)

---

## Prerequisites

- **Node.js 18+** (ESM required)
- **npm** or any compatible package manager
- Git (for `--install-hooks`)
- An LLM API key from Anthropic, Google, or OpenAI (for `ursamu-docs` only)

---

## Installation

```bash
# Install the skill into your default AI agent (Claude Code)
npx @lhi/ursamu-dev

# Or install globally to use the CLIs without npx
npm install -g @lhi/ursamu-dev
```

---

## ursamu-dev — Skill Installer

Copies `skill/SKILL.md` and companion skills into your AI agent's skills directory. Once installed, activate the skill with `/ursamu-dev` to give your agent full UrsaMU context.

```bash
npx @lhi/ursamu-dev [platform flags] [options]
```

### Platform Flags

By default, installs for **Claude Code**. Pass one or more flags to target other platforms:

| Flag | Platform | Install Location |
|------|----------|-----------------|
| `--claude` *(default)* | Claude Code | `~/.claude/skills/ursamu-dev/` |
| `--gemini` | Gemini CLI | `~/.gemini/skills/ursamu-dev/` |
| `--cursor` | Cursor | `~/.cursor/skills/ursamu-dev/` |
| `--codex` | Codex CLI | `~/.codex/skills/ursamu-dev/` (or `$CODEX_HOME/skills/`) |
| `--antigravity` | Antigravity | `~/.antigravity/skills/ursamu-dev/` |
| `--opencode` | OpenCode | `~/.config/opencode/agents/ursamu-dev.md` |
| `--all` | Every platform above | — |

```bash
npx @lhi/ursamu-dev --all                    # install everywhere
npx @lhi/ursamu-dev --claude --opencode      # two specific platforms
npx @lhi/ursamu-dev --dry-run --all          # preview without writing
npx @lhi/ursamu-dev --claude --no-companions # skip companion skills
```

**Companion skills** are installed alongside `ursamu-dev` on every skills-dir platform:

| Companion | Purpose |
|-----------|---------|
| `game-development` | Game design concepts for UrsaMU |
| `typescript-expert` | TypeScript guidance |
| `typescript-advanced-types` | Advanced type patterns |
| `tdd-workflows-tdd-cycle` | TDD cycle discipline |
| `error-handling-patterns` | Error handling in Deno/TS |
| `docs-architect` | Documentation structure |
| `readme` | README writing |
| `api-documentation` | API reference patterns |

When targeting Claude Code, the installer also sets up the `@lhi/tdd-audit` toolchain automatically.

### Install the Pre-commit Hook

Block commits that fail the audit in one step:

```bash
npx @lhi/ursamu-dev --install-hooks
```

Or, if already installed globally:

```bash
ursamu-dev --install-hooks
ursamu-dev --install-hooks --dry-run   # preview the hook without writing it
```

This walks upward from your current directory to find the git root, then writes (or patches) `.git/hooks/pre-commit` so `ursamu-audit --no-hints` runs before every commit. The hook is **idempotent** — running it twice produces the same result as once. It never removes existing hook content; it only appends if the marker is absent.

```bash
# What gets written (new hook):
#!/bin/sh
# ursamu-audit (added by @lhi/ursamu-dev)
npx ursamu-audit --no-hints
```

### Activating the Skill

After installing, open your agent and run:

```
/ursamu-dev
```

The agent will confirm it has loaded the skill and is ready for UrsaMU work. From that point, every task follows the mandatory six-stage pipeline.

---

## ursamu-audit — Static Analysis

Scans `.ts` and `.js` source files for violations of the UrsaMU Stage 2 audit invariants. No LLM — pure static analysis built to run in CI.

### Usage (audit) {#usage-audit}

```bash
ursamu-audit [path] [options]
```

```bash
ursamu-audit                   # scan ./src (default)
ursamu-audit src/plugins/bbs   # scan one plugin directory
ursamu-audit --fix             # auto-repair check-09 and check-15
ursamu-audit --watch           # re-run on every file save
ursamu-audit --json            # machine-readable JSON for CI
ursamu-audit --no-hints        # suppress informational findings
```

### Checks Reference

| ID | Check | Level | Auto-fix? |
|----|-------|-------|-----------|
| check-01 | `stripSubs()` called before `u.db` writes | warn | |
| check-03 | `u.db.modify` op is `$set`/`$inc`/`$unset` only | error | |
| check-04 | `util.target()` result is null-guarded before use | hint | |
| check-06 | No `Deno`/`fetch`/`require` in `system/scripts/` | error | |
| check-09 | `@ursamu/ursamu` imports use `jsr:` prefix | warn | ✓ `--fix` |
| check-10 | Every `addCmd` has `help:` with an Examples section | error/warn | |
| check-11 | No `addCmd()` calls inside `init()` | error | |
| check-12 | Every `gameHooks.on()` has a matching `gameHooks.off()` in `remove()` | error | |
| check-13 | `new DBO(...)` collection names are `<plugin>.<collection>` namespaced | error | |
| check-14 | Every `registerPluginRoute` handler checks `if (!userId)` first | error | |
| check-15 | `init()` returns `true` | error | ✓ `--fix` |

**Levels explained:**
- `error` — high-confidence, deterministic; CI should fail on these
- `warn` — high-confidence on common patterns; may miss edge cases
- `hint` — heuristic; informational only, does not affect the exit code

Violations marked ✗ (check-01, check-03, check-10, check-11, check-12, check-13, check-14) require developer judgment and are intentionally left for manual review.

### Auto-fix Mode

```bash
ursamu-audit --fix
ursamu-audit src/plugins/bbs --fix
```

Reads each violating file, applies safe in-place patches for the two mechanical checks, then re-runs the full audit and prints the updated results. Manual violations are listed as skipped with an explanation.

**What `--fix` repairs:**

| Check | Transformation |
|-------|---------------|
| check-09 | `from "@ursamu/ursamu"` → `from "jsr:@ursamu/ursamu"` |
| check-15 | Inserts `return true;` before the closing `}` of `init()` with correct indentation |

**Sample output:**

```
UrsaMU Audit — auto-fixing 3 file(s)

  fixed  src/plugins/bbs/commands.ts  (1 change(s))
  fixed  src/plugins/mail/index.ts    (1 change(s))

  Skipped (require manual review): check-12, check-14

After auto-fix:

UrsaMU Audit — 12 file(s) scanned

No violations found.
```

### Watch Mode

```bash
ursamu-audit --watch
ursamu-audit src/plugins/bbs --watch
```

Runs a full audit on startup, then watches the directory for `.ts`/`.js` changes. On every save (debounced 300 ms), re-runs the scan and prints a compact diff:

```
[14:32:01] commands.ts changed — 4 file(s)
  + ERROR [check-09] src/plugins/bbs/commands.ts:3 — Import uses "@ursamu/ursamu" ...
  ✓ resolved [check-15] src/plugins/bbs/index.ts:8
1 violation(s) remaining.
```

Press `Ctrl+C` to stop. Watch mode requires Node 20+ on Linux (uses `fs.watch` with `{ recursive: true }`).

> **Note:** `--watch` and `--fix` are mutually exclusive. `--json` cannot be combined with either.

### JSON Output

```bash
ursamu-audit --json
ursamu-audit --json --no-hints > audit-results.json
```

Outputs structured JSON:

```json
{
  "fileCount": 12,
  "violations": [
    {
      "file": "/abs/path/src/plugins/bbs/commands.ts",
      "line": 24,
      "check": "check-10",
      "level": "error",
      "message": "addCmd() is missing a help: field."
    }
  ]
}
```

### Exit Codes (audit) {#exit-codes-audit}

| Code | Meaning |
|------|---------|
| `0` | Clean — no errors or warnings |
| `1` | One or more errors or warnings found |
| `2` | Fatal error (bad path, not a directory, incompatible flags) |

Hints (check-04) alone return exit code `0`.

### CI Integration

**GitHub Actions — block on violations:**

```yaml
- name: UrsaMU audit
  run: npx ursamu-audit --no-hints
```

**With JSON output piped to a reporter:**

```yaml
- name: UrsaMU audit
  run: npx ursamu-audit --json > audit-results.json
```

**Sample human-readable output:**

```
UrsaMU Audit — 12 file(s) scanned

  src/plugins/bbs/commands.ts
    ERROR line   24  [check-10]  addCmd() is missing a help: field.
    WARN  line   31  [check-01]  exec() writes to the DB but no stripSubs() call found.

  src/plugins/mail/index.ts
    ERROR line    8  [check-12]  gameHooks.on("player:login", onLogin) has no matching off() in remove().

Summary: 2 error(s), 1 warning(s) across 2 file(s).
```

---

## ursamu-scaffold — Plugin Scaffold

Generates a fully-wired, correctly-structured UrsaMU plugin from one command. Every generated file follows the exact conventions enforced by the skill and checked by `ursamu-audit`.

### Usage (scaffold) {#usage-scaffold}

`ursamu-scaffold` is a **terminal command** — run it in your shell, not inside Claude.

```bash
# With npx (no install required)
npx @lhi/ursamu-dev scaffold <name> [options]

# Or if installed globally
ursamu-scaffold <name> [options]
```

```bash
npx @lhi/ursamu-dev scaffold bbs
npx @lhi/ursamu-dev scaffold mail --with-routes --with-tests
npx @lhi/ursamu-dev scaffold my-plugin --out ./plugins/my-plugin --dry-run
```

### Options (scaffold) {#options-scaffold}

| Flag | Description | Default |
|------|-------------|---------|
| `--with-routes` | Include `routes.ts` with a pre-wired `routeHandler` and `if (!userId)` auth guard | off |
| `--with-tests` | Include `tests/<name>.test.ts` and `tests/helpers/mockU.ts` | off |
| `--out <dir>` | Override the output root | `./src/plugins/<name>` |
| `--dry-run` | Preview files that would be created without writing anything | off |
| `--help` | Show help | — |

### Name Rules

Plugin names must:
- Be lowercase
- Start with a letter
- Contain only letters, digits, and hyphens

**Valid:** `bbs`, `my-plugin`, `mail2`
**Invalid:** `MyPlugin`, `my_plugin`, `123bad`, `../evil`

### Generated Files

**Always created:**

| File | Contents |
|------|----------|
| `index.ts` | `IPlugin` export with three-phase lifecycle: module-load imports `addCmd`, `init()` returns `true`, `remove()` tears down hooks |
| `commands.ts` | `addCmd()` skeleton with correct `jsr:` imports, pattern, lock, `help:` with Examples, `stripSubs` in exec |
| `README.md` | Plugin documentation template with Commands, Events, Storage, REST Routes, and Notes sections |

**With `--with-routes`:**

| File | Contents |
|------|----------|
| `routes.ts` | `routeHandler` with `if (!userId) return new Response(null, { status: 401 })` as the first statement |

**With `--with-tests`:**

| File | Contents |
|------|----------|
| `tests/<name>.test.ts` | Deno test file with happy-path, null-target, and permission-denied stubs |
| `tests/helpers/mockU.ts` | Complete `mockU()` / `mockPlayer()` helper from SKILL.md Stage 4, with `_sent` and `_dbCalls` tracking |

### Example (scaffold) {#example-scaffold}

```bash
npx @lhi/ursamu-dev scaffold greeter --with-routes --with-tests
```

```
@lhi/ursamu-dev scaffold — creating plugin "greeter"

  created  src/plugins/greeter/index.ts
  created  src/plugins/greeter/commands.ts
  created  src/plugins/greeter/README.md
  created  src/plugins/greeter/routes.ts
  created  src/plugins/greeter/tests/greeter.test.ts
  created  src/plugins/greeter/tests/helpers/mockU.ts

Done. 6 file(s) created.

Next steps:
  1. Fill in your plugin description in index.ts and README.md
  2. Implement the exec() body in commands.ts
  3. Run Stage 0 design with the ursamu-dev skill
```

---

## ursamu-docs — Docs Generator

Runs any SKILL.md stage against your UrsaMU source files and writes documentation artifacts. No agent session required — useful for CI or batch documentation runs.

### Usage (docs) {#usage-docs}

```bash
ursamu-docs [options]
# or
node bin/docs.js [options]
```

```bash
# Preview what would run — no LLM calls made
ANTHROPIC_API_KEY=sk-ant-... ursamu-docs --dry-run --src src/

# Generate Stage 5 docs to docs/generated/
ANTHROPIC_API_KEY=sk-ant-... ursamu-docs --src src/ --out docs/generated

# Use a specific provider and model
GOOGLE_API_KEY=AIza... ursamu-docs --provider google --model gemini-2.0-flash --src src/

# Patch JSDoc and help text back into source files
ANTHROPIC_API_KEY=sk-ant-... ursamu-docs --patch --src src/

# Custom OpenAI-compatible provider
LLM_API_KEY=... ursamu-docs --provider custom --base-url https://my-llm.example.com/v1 --model my-model --src src/
```

### Options (docs) {#options-docs}

| Flag | Description | Default |
|------|-------------|---------|
| `--stage <n>` | Skill stage to run (0–9) | `5` |
| `--src <dir>` | Source directory to scan | `./src` |
| `--out <dir>` | Output directory for generated docs | `./docs/generated` |
| `--patch` | Write JSDoc/help text back into source files | off |
| `--provider <name>` | `anthropic` \| `google` \| `openai` \| `custom` | auto-detect |
| `--model <id>` | Override default model for selected provider | provider default |
| `--base-url <url>` | OpenAI-compatible base URL (requires `--provider custom`) | — |
| `--api-key <key>` | API key override ⚠ visible in shell history — prefer env vars | — |
| `--max-tokens <n>` | Max tokens per LLM call (max: 100,000) | `4096` |
| `--dry-run` | Print config and discovered files; skip LLM calls | off |
| `--help` | Show help | — |

### Provider Setup

Set one of these environment variables and `ursamu-docs` auto-detects the provider:

| Priority | Env var | Provider | Default model |
|----------|---------|---------|--------------|
| 1 | `ANTHROPIC_API_KEY` | Anthropic | `claude-sonnet-4-6` |
| 2 | `GOOGLE_API_KEY` | Google | `gemini-2.0-flash` |
| 3 | `OPENAI_API_KEY` | OpenAI | `gpt-4o` |
| — | `LLM_API_KEY` | Custom (requires `--base-url` + `--model`) | *(required)* |

**Custom provider example:**

```bash
LLM_API_KEY=my-key ursamu-docs \
  --provider custom \
  --base-url https://my-llm.example.com/v1 \
  --model my-model \
  --src src/
```

Custom base URLs must be `https://` and may not target loopback (`127.x`, `::1`), RFC-1918 private ranges (`10.x`, `172.16–31.x`, `192.168.x`), link-local (`169.254.x`, `fe80::/10`), or IPv6 Unique Local (`fc00::/7`) addresses.

### Output Layout

```
docs/generated/
  commands/
    <name>/
      help.md        ← 5a: in-game help text
      jsdoc.md       ← 5b: JSDoc block
  plugins/
    <name>/
      help.md
      jsdoc.md
      README.md      ← 5c: plugin README
      routes.md      ← 5d: REST route contracts
```

With `--patch`, artifacts are written alongside source files instead of to a separate docs tree.

### CI Integration (docs) {#ci-integration-docs}

```yaml
- name: Generate UrsaMU docs
  run: ursamu-docs --stage 5 --src src/ --out docs/generated
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

---

## The Six-Stage Skill Pipeline

When `/ursamu-dev` is active, the agent follows a mandatory six-stage pipeline for every task. No stage may be skipped.

```
Stage 0 — Design    → Design Plan + Decision Log
Stage 1 — Generate  → Working code
Stage 2 — Audit     → Audit Report (11 checklist items)
Stage 3 — Refine    → Fixed code (or "No issues found")
Stage 4 — Test      → Passing Deno test file + TDD remediation
Stage 5 — Docs      → Help text + JSDoc + README (if plugin)
```

### Stage 0 — Design

The agent reads `skill/references/api-reference.md` and all existing source files before asking any questions. It asks **one** targeted clarifying question per message (prefer multiple-choice), then produces a Design Plan that must be confirmed before any code is written. The plan includes a Decision Log documenting architecture choices and trade-offs.

### Stage 1 — Generate

Writes code for the correct target context:

| Context | Location | Available APIs |
|---------|----------|---------------|
| Native command | `src/commands/` | Full Deno — filesystem, network, all SDK |
| Plugin | `src/plugins/<name>/` | Full Deno via `jsr:@ursamu/ursamu` |
| System script | `system/scripts/` | Sandbox only — `u.*` SDK, no Deno/fetch/fs |

### Stage 2 — Security & Style Audit

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

### Stage 3 — Refine

If Stage 2 finds failures, only the affected sections are rewritten. The full checklist runs again before the final output is shown.

### Stage 4 — Test

Deno tests using the `mockU()` / `mockPlayer()` helpers. Required test cases: happy path, null target, permission denied, DB op validation, admin guard (if applicable), and input sanitization.

### Stage 5 — Docs

In-game help text, JSDoc blocks, plugin README, and REST route contracts. The same output format used by `ursamu-docs`.

---

## Architecture

### Directory Structure

```
@lhi/ursamu-dev/
├── bin/
│   ├── cli.js          # ursamu-dev — skill installer + hook installer
│   ├── audit.js        # ursamu-audit — static analysis CLI
│   ├── scaffold.js     # ursamu-scaffold — plugin boilerplate generator
│   └── docs.js         # ursamu-docs — LLM-powered docs generator
│
├── lib/
│   ├── scanner.js      # source unit discovery (commands + plugins)
│   ├── writer.js       # docs artifact writer (default + patch modes)
│   ├── hooks.js        # git pre-commit hook installer
│   ├── llm.js          # LLM provider resolution + SSRF guard
│   ├── prompts.js      # SKILL.md stage extraction
│   │
│   ├── audit/
│   │   ├── checks.js   # 11 pure check functions + block extractor
│   │   ├── runner.js   # orchestrates checks across a directory tree
│   │   ├── reporter.js # formats violations for console or JSON
│   │   ├── fixer.js    # auto-repairs check-09 and check-15 in place
│   │   └── watcher.js  # fs.watch loop + pure diff utilities
│   │
│   └── scaffold/
│       ├── templates.js # all file template strings (6 templates)
│       └── writer.js    # validates names, resolves paths, writes files
│
├── skill/
│   ├── SKILL.md                     # full skill content (~34k lines)
│   └── references/
│       └── api-reference.md         # authoritative UrsaMU SDK reference
│
├── companion-skills/                # 8 skills installed alongside ursamu-dev
│   ├── game-development/
│   ├── typescript-expert/
│   ├── typescript-advanced-types/
│   ├── tdd-workflows-tdd-cycle/
│   ├── error-handling-patterns/
│   ├── docs-architect/
│   ├── readme/
│   └── api-documentation/
│
└── __tests__/
    ├── audit/           # checks, runner, fixer tests (68 total)
    ├── scaffold/        # templates, writer tests (62 total)
    ├── hooks/           # hook installer + watcher diff tests (20 total)
    ├── docs/            # LLM, scanner, writer tests (28 total)
    └── security/        # path traversal, SSRF, DoS, NaN tests (69 total)
```

### Module Map

```
bin/audit.js
  └── lib/audit/runner.js      → lib/scanner.js (assertSafePath)
                                → lib/audit/checks.js (runAllChecks)
  └── lib/audit/reporter.js    (formatReport, exitCode)
  └── lib/audit/fixer.js       → lib/audit/checks.js (extractBlock, INIT_BLOCK_RE)
  └── lib/audit/watcher.js     (startWatch, diffViolations)

bin/scaffold.js
  └── lib/scaffold/writer.js   → lib/scaffold/templates.js

bin/docs.js
  └── lib/scanner.js           (scan, assertSafePath)
  └── lib/writer.js            (write, assertSafeOutPath)
  └── lib/llm.js               (resolve, validateBaseURL)
  └── lib/prompts.js           (systemPrompt)

bin/cli.js
  └── lib/hooks.js             (installHook, findGitRoot)
```

---

## Security Model

Every user-controlled input is validated before any filesystem or network operation.

### Path Traversal Protection

All paths supplied by users (`--src`, `--out`, plugin `--out`, audit scan path) are resolved to their absolute canonical form and checked to be strictly inside `process.cwd()`. The check:

```js
const abs = resolve(rawPath);
if (abs !== cwd && !abs.startsWith(cwd + "/")) throw new Error("...");
```

This is applied at multiple layers:
- `lib/scanner.js` → `assertSafePath()`
- `lib/writer.js` → `assertSafeOutPath()`
- `lib/scaffold/writer.js` → local `assertSafeOutPath()`
- `lib/audit/runner.js` → delegates to `assertSafePath()`
- `lib/hooks.js` → never writes outside the detected git root

### SSRF Prevention

Custom LLM base URLs (`--base-url`) are validated against all known internal address classes:

| Class | Range | Blocked |
|-------|-------|---------|
| Non-HTTPS schemes | `http://`, `ftp://`, `file://`, etc. | ✓ |
| IPv4 loopback | `127.0.0.0/8` | ✓ |
| Localhost | `localhost`, `ip6-localhost` | ✓ |
| RFC-1918 class A | `10.0.0.0/8` | ✓ |
| RFC-1918 class B | `172.16.0.0/12` | ✓ |
| RFC-1918 class C | `192.168.0.0/16` | ✓ |
| Link-local / cloud metadata | `169.254.0.0/16` | ✓ |
| IPv6 loopback | `::1` | ✓ |
| IPv6 Unique Local | `fc00::/7` (`fc__`, `fd__` prefixes) | ✓ |
| IPv6 Link-Local | `fe80::/10` (`fe80`–`febf`) | ✓ |

DNS rebinding is acknowledged as out of scope for a local CLI tool.

### DoS Limits

Recursive directory scans cap at:
- `MAX_DEPTH = 8` — maximum directory nesting
- `MAX_FILES = 500` — maximum source files per scan

Symlinks are never followed.

### Input Validation

| Input | Constraint |
|-------|-----------|
| Plugin name | `/^[a-z][a-z0-9-]*$/` |
| `--stage` | Integer in `[0, 9]` |
| `--max-tokens` | Positive integer ≤ 100,000 |
| `CODEX_HOME` | Must resolve to a path inside `$HOME` |

---

## Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | `ursamu-docs` | Enables Anthropic as LLM provider (highest priority) |
| `GOOGLE_API_KEY` | `ursamu-docs` | Enables Google as LLM provider |
| `OPENAI_API_KEY` | `ursamu-docs` | Enables OpenAI as LLM provider |
| `LLM_API_KEY` | `ursamu-docs` | API key for `--provider custom` |
| `CODEX_HOME` | `ursamu-dev` | Override Codex skills install root (must be inside `$HOME`) |

All variables are optional except when the feature that requires them is used. `ursamu-audit` and `ursamu-scaffold` require no environment variables.

---

## Scripts & Testing

| Script | Description | Tests |
|--------|-------------|-------|
| `npm test` | Dry-run skill install to all platforms | — |
| `npm run test:audit` | Unit + integration tests for `ursamu-audit` + fixer | 68 |
| `npm run test:scaffold` | Unit tests for `ursamu-scaffold` templates + writer | 62 |
| `npm run test:hooks` | Unit tests for hook installer + watcher diff utilities | 20 |
| `npm run test:docs` | Tests for `ursamu-docs` + all security tests | 97 |
| `npm run test:security` | Path-traversal and SSRF security tests only | — |
| `npm run docs` | Run `ursamu-docs` against `./src` | — |

**Total: 247 tests across 18 test files.**

### Test Structure

```
__tests__/
  audit/
    checks.test.js      # 41 unit tests, one per check + edge cases
    runner.test.js      # 12 integration tests against fixture directories
    fixer.test.js       # 15 tests for applyFixesToLines + fixFile
  scaffold/
    templates.test.js   # 35 tests, one per template function
    writer.test.js      # 27 tests for validateName + writeScaffold
  hooks/
    hooks.test.js       # 13 hook installer tests + 7 watcher diff tests
  docs/
    llm.test.js         # 14 tests for provider resolution + SSRF
    scanner.test.js     # 6 tests for source unit discovery
    writer.test.js      # 8 tests for section parsing + artifact writing
  security/
    ssrf-base-url.test.js         # 21 SSRF exploit tests (all IP ranges)
    path-traversal-src.test.js    # path traversal via --src
    arbitrary-write-out.test.js   # path traversal via --out
    nan-numeric-args.test.js      # NaN injection via --stage / --max-tokens
    unbounded-scan.test.js        # DoS via deeply nested or huge directories
    missing-arg.test.js           # missing value after flag
    patch-mode-write.test.js      # patch mode path safety
    codex-home-traversal.test.js  # CODEX_HOME escape attempts
```

### Running Tests Locally

```bash
# Run everything
npm run test:audit && npm run test:scaffold && npm run test:hooks && npm run test:docs

# Run a single file
node --test __tests__/audit/checks.test.js

# Run security tests only
npm run test:security
```

---

## Supported Platforms

| Flag | Platform | Skill Format | Install Location |
|------|----------|-------------|-----------------|
| `--claude` *(default)* | Claude Code | Directory | `~/.claude/skills/ursamu-dev/` |
| `--gemini` | Gemini CLI | Directory | `~/.gemini/skills/ursamu-dev/` |
| `--cursor` | Cursor | Directory | `~/.cursor/skills/ursamu-dev/` |
| `--codex` | Codex CLI | Directory | `~/.codex/skills/ursamu-dev/` (or `$CODEX_HOME/skills/`) |
| `--antigravity` | Antigravity | Directory | `~/.antigravity/skills/ursamu-dev/` |
| `--opencode` | OpenCode | Single `.md` agent file | `~/.config/opencode/agents/ursamu-dev.md` |

---

## Contributing

| Component | Location |
|-----------|----------|
| Skill content | `skill/SKILL.md` |
| API reference | `skill/references/api-reference.md` |
| Skill installer + hook installer | `bin/cli.js`, `lib/hooks.js` |
| Static audit checks | `lib/audit/checks.js` |
| Audit runner | `lib/audit/runner.js` |
| Audit auto-fixer | `lib/audit/fixer.js` |
| Watch mode diff utilities | `lib/audit/watcher.js` |
| Scaffold templates | `lib/scaffold/templates.js` |
| Scaffold writer + name validation | `lib/scaffold/writer.js` |
| Docs generator | `bin/docs.js` |
| LLM provider resolution + SSRF guard | `lib/llm.js` |

**To test changes locally:**

```bash
node bin/cli.js --dry-run --all        # installer smoke test
node bin/audit.js --help               # audit CLI
node bin/scaffold.js --help            # scaffold CLI
npm run test:audit                     # audit + fixer tests
npm run test:scaffold                  # scaffold tests
npm run test:hooks                     # hook installer tests
npm run test:docs                      # docs + security tests
```

**Adding a new audit check:**

1. Add the check function to `lib/audit/checks.js` and export it
2. Add it to `runAllChecks()` at the bottom of `checks.js`
3. Add a passing fixture to `__tests__/audit/__fixtures__/passing/`
4. Add a failing fixture to `__tests__/audit/__fixtures__/failing/`
5. Add unit tests to `__tests__/audit/checks.test.js`
6. Add a runner integration test to `__tests__/audit/runner.test.js`
7. Update the checks table in this README and in `bin/audit.js` HELP

**Adding an auto-fixable check:**

1. Follow the steps above
2. Add the check ID to `FIXABLE_CHECKS` in `lib/audit/fixer.js`
3. Add a fix branch in `applyFixesToLines()`
4. Add fixer tests to `__tests__/audit/fixer.test.js`
5. Mark the check ✓ in the README checks table

---

## License

MIT — Lemuel Lee Canady, Jr.
