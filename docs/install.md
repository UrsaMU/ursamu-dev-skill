# Installation & Setup

## Prerequisites

- **Node.js 18+** (ESM required)
- **npm** or any compatible package manager
- Git (for `--install-hooks`)
- An LLM API key from Anthropic, Google, or OpenAI (for `ursamu-docs` only)

## Install

```bash
# Install the skill into your default AI agent (Claude Code)
npx @lhi/ursamu-dev

# Or install globally to use the CLIs without npx
npm install -g @lhi/ursamu-dev
```

## Platform Flags

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

## Companion Skills

Installed alongside `ursamu-dev` on every skills-dir platform:

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

## Hook Flags — Two Different Things

`@lhi/ursamu-dev` ships **two unrelated** opt-in hook installers. They live in
different files and solve different problems — do not conflate them.

| Flag | What it installs | Where |
|------|------------------|-------|
| `--install-hooks` | Git **pre-commit** hook that runs `ursamu-audit --no-hints` before every commit | `.git/hooks/pre-commit` in the current repo |
| `--install-claude-hooks` | Claude Code **PreToolUse** stage-gate hook that blocks Write/Edit/NotebookEdit until Stage 0 design is confirmed | `~/.claude/settings.json` |

Neither is installed automatically by `--claude` or `--all`. Both are
idempotent and support `--dry-run`.

### Git pre-commit hook — `--install-hooks`

```bash
npx @lhi/ursamu-dev --install-hooks
ursamu-dev --install-hooks --dry-run   # preview
```

Walks upward from the current directory to find the git root, then writes (or
patches) `.git/hooks/pre-commit` so `ursamu-audit --no-hints` runs before every
commit. Idempotent.

```sh
#!/bin/sh
# ursamu-audit (added by @lhi/ursamu-dev)
npx ursamu-audit --no-hints
```

### Claude Code stage-gate hook — `--install-claude-hooks`

```bash
npx @lhi/ursamu-dev --install-claude-hooks
npx @lhi/ursamu-dev --install-claude-hooks --dry-run
npx @lhi/ursamu-dev --uninstall-claude-hooks    # remove cleanly
```

Merges a single `PreToolUse` matcher entry into `~/.claude/settings.json` that
shells out to `~/.claude/skills/ursamu-dev/hooks/pretool-stage-gate.sh`. The
hook denies Write/Edit/NotebookEdit calls into your plugin tree until
`.ursamu-stage` reports `design_confirmed: true` — converting the soft Stage 0
gate into a deterministic block.

The installer:

- Creates `~/.claude/settings.json` if missing.
- Preserves all unrelated keys and any existing PreToolUse matchers.
- Makes a `.bak` on first modify.
- Matches on the command-string substring, so re-running is a no-op.
- Surfaces a clear error on corrupted settings JSON instead of overwriting.

`--uninstall-claude-hooks` removes only the matcher entry it installed; the
rest of your settings is untouched.

See [hooks.md](./hooks.md) for the full marker schema, scope rules, and
failure modes, and [pipeline.md](./pipeline.md) for how the gate fits into the
six-stage workflow.

## Activating the Skill

After installing, open your agent and run:

```
/ursamu-dev
```

The agent will confirm it has loaded the skill and is ready for UrsaMU work. From that point, every task follows the mandatory [six-stage pipeline](./pipeline.md).
