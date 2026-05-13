[![Ursamu AI Dev](https://img.shields.io/badge/Ursamu_AI_Dev-passing-brightgreen)](https://github.com/UrsaMU/ursamu-dev-skill) ![Tests](https://img.shields.io/badge/tests-316_passing-brightgreen) <!-- tdd-audit-badge -->

# @lhi/ursamu-dev

A complete development toolkit for writing UrsaMU plugins and commands with an AI coding agent. Install the skill once and your agent knows the full UrsaMU development pipeline — correct import paths, plugin architecture, security patterns, and the six-stage **Design → Generate → Audit → Refine → Test → Docs** workflow.

> Targets **`@ursamu/ursamu` ≥ 2.3.4** (engine v2.x). Plugin authors still on v1.9.x should pin `@lhi/ursamu-dev@^1` until upgrading.

## What's new in 2.1.0

- **SKILL.md refactored** for progressive disclosure — a thin 108-line router that loads per-stage references from `skill/references/stage-N-*.md` only when needed. Worked end-to-end example moved to [`skill/references/example-gold.md`](skill/references/example-gold.md).
- **Optional Claude Code stage-gate hook** (`skill/hooks/`) — a PreToolUse hook that blocks `Write` / `Edit` / `NotebookEdit` into the plugin tree until a Stage-0 design plan is confirmed via a `.ursamu-stage` marker. Fails open when `jq`/`python3` are unavailable. Co-located `deno.json` check protects sibling repos.
- **`--install-claude-hooks` / `--uninstall-claude-hooks` CLI flags** — idempotent, opt-in install of the stage-gate into `~/.claude/settings.json`. Not auto-applied by `--claude` / `--all`.
- **Trigger evals** (`skill/evals/`) — 10 should-trigger + 10 should-not-trigger near-miss prompts plus a programmatic runner that uses Claude Haiku as a judge across a curated 15-skill catalog. (Proxy, not the real skill loader — see caveat below.)
- **SKILL.md description rewritten** to eliminate trigger collisions with `mush-architect`, `tdd-workflows-tdd-cycle`, `tdd-audit`, `code-reviewer`, `sdd`, and `documentation`. Explicitly excludes RhostMUSH / PennMUSH / TinyMUX softcode.
- **316 tests across 5 suites**, including new `test:claude-hooks` (10 cases) and `test:evals` (15 cases).

See [CHANGELOG.md](CHANGELOG.md) for the full 2.0.0 + 2.1.0 history (engine v2.x alignment, new extension points: `engine:ready`, `registerCmdMiddleware`, `registerLockFunc` with `&&`/`||`, `registerFormatHandler` / `resolveFormat`, `joinSocketToRoom` + `socketId`, native `header` / `divider` / `footer`; `rhost-vision` removed).

## Tools

| Tool | What it does | Needs LLM? |
|------|-------------|-----------|
| `ursamu-dev` | Install the skill into your AI agent | No |
| `ursamu-audit` | Static analysis — catch violations before CI does | No |
| `ursamu-scaffold` | Generate correct plugin boilerplate — including help files and version wiring | No |
| `ursamu-docs` | Run any skill stage against your source to produce docs | Yes |
| `skill/hooks/` | Optional Claude Code PreToolUse stage-gate (opt-in) | No |
| `skill/evals/` | Trigger evals — paste mode + programmatic Haiku judge runner | Optional |

## Quick Start

```bash
# Install the skill (Claude Code by default)
npx @lhi/ursamu-dev

# Recommended setup commands:
ursamu-dev --install-hooks          # git pre-commit hook: blocks commits that fail ursamu-audit
ursamu-dev --install-claude-hooks   # Claude Code PreToolUse stage-gate (different hook — see below)
ursamu-audit --fix                  # auto-repair the two most common violations
ursamu-audit --watch                # live violation diff on every file save
```

Then activate the skill in your agent:

```
/ursamu-dev
```

### Two different "install-hooks" flags — don't conflate them

| Flag | Target | What it does |
|------|--------|--------------|
| `--install-hooks` | `.git/hooks/pre-commit` | Installs a **git pre-commit** hook that runs `npx ursamu-audit --no-hints` before every commit. Idempotent. |
| `--install-claude-hooks` | `~/.claude/settings.json` | Merges the **Claude Code PreToolUse** stage-gate entry. Idempotent, makes a `.bak` on first modify, preserves unrelated keys, removable via `--uninstall-claude-hooks`. |

## Claude Code stage-gate hook (opt-in)

The stage-gate blocks Write/Edit into your plugin tree until you've confirmed a Stage-0 design plan. It enforces the six-stage workflow at the tool layer rather than relying on the agent to remember.

```bash
# Install (idempotent, opt-in only — not bundled with --claude / --all)
ursamu-dev --install-claude-hooks

# Opt out
ursamu-dev --uninstall-claude-hooks
```

How it works:

- Marker file: `.ursamu-stage` (per-project, git-ignored). Run `skill/hooks/advance-stage.sh` to move forward through the pipeline.
- **Sibling-repo safety**: the hook only fires when a co-located `deno.json` references `@ursamu/ursamu`, so unrelated repos are unaffected.
- **Fails open**: if neither `jq` nor `python3` is available, the hook does not block.

See `skill/hooks/README.md` for details.

## Trigger evals

Evals live under `skill/evals/`: 10 should-trigger + 10 should-not-trigger near-miss prompts, each naming the sibling skill it should route to. Run modes:

```bash
# Paste mode — copies prompts to your clipboard, you paste into Claude
bash skill/evals/run.sh

# Programmatic — Claude Haiku as judge model over a curated 15-skill catalog
ANTHROPIC_API_KEY=... node skill/evals/run-programmatic.js
```

> **Honest caveat:** the programmatic runner is a proxy. It asks Haiku to choose from a hand-curated skill catalog — it does **not** invoke the real Claude Code skill loader. Treat the score as a regression signal for description/trigger drift, not a ground-truth pass/fail.

## Documentation

- [Installation & Setup](docs/install.md) — platforms, companion skills, pre-commit hook, activating the skill
- [ursamu-audit](docs/audit.md) — checks reference, auto-fix, watch mode, JSON output, CI integration
- [ursamu-scaffold](docs/scaffold.md) — options, name rules, generated files, adding commands
- [ursamu-docs](docs/docs-generator.md) — provider setup, options, output layout, CI integration
- [Six-Stage Pipeline](docs/pipeline.md) — how the agent works through Design → Docs
- [Architecture](docs/architecture.md) — directory structure, module map
- [Security Model](docs/security.md) — path traversal, SSRF, DoS limits, input validation
- [Contributing](docs/contributing.md) — adding checks, testing locally, test suite layout
- [Changelog](CHANGELOG.md) — release history

## Skill structure (2.1.0+)

The skill is a thin router that loads stage references on demand:

```
skill/
├── SKILL.md                       # 108-line router
├── references/
│   ├── stage-0-design.md
│   ├── stage-1-generate.md
│   ├── stage-2-audit.md
│   ├── stage-3-refine.md
│   ├── stage-4-test.md
│   ├── stage-5-docs.md
│   ├── example-gold.md            # full worked example
│   └── api-reference.md           # regenerated from engine docs/llms.md + v2.x appendix
├── hooks/                         # optional PreToolUse stage-gate
└── evals/                         # trigger evals + programmatic runner
```

## Requirements

- **Node.js 18+** (ESM required)
- Git (for `--install-hooks`)
- An LLM API key — Anthropic, Google, or OpenAI (for `ursamu-docs`, and optionally for `skill/evals/run-programmatic.js`)
- UrsaMU engine target: **`@ursamu/ursamu` ≥ 2.3.4**

## License

MIT — Lemuel Lee Canady, Jr.
