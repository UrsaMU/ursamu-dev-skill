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

## Pre-commit Hook

Block commits that fail the audit in one step:

```bash
npx @lhi/ursamu-dev --install-hooks
# or, if installed globally:
ursamu-dev --install-hooks
ursamu-dev --install-hooks --dry-run   # preview without writing
```

Walks upward from your current directory to find the git root, then writes (or patches) `.git/hooks/pre-commit` so `ursamu-audit --no-hints` runs before every commit. Idempotent — running it twice produces the same result as once.

```sh
#!/bin/sh
# ursamu-audit (added by @lhi/ursamu-dev)
npx ursamu-audit --no-hints
```

## Activating the Skill

After installing, open your agent and run:

```
/ursamu-dev
```

The agent will confirm it has loaded the skill and is ready for UrsaMU work. From that point, every task follows the mandatory [six-stage pipeline](./pipeline.md).
