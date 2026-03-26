![Coverage](https://img.shields.io/badge/coverage-96%25-brightgreen) [![Ursamu AI Dev](https://img.shields.io/badge/Ursamu_AI_Dev-passing-brightgreen)](https://github.com/UrsaMU/ursamu-dev-skill) <!-- tdd-audit-badge -->

# @lhi/ursamu-dev

A complete development toolkit for writing UrsaMU plugins and commands with an AI coding agent. Install the skill once and your agent knows the full UrsaMU development pipeline — correct import paths, plugin architecture, security patterns, and the mandatory six-stage **Design → Generate → Audit → Refine → Test → Docs** workflow.

## Tools

| Tool | What it does | Needs LLM? |
|------|-------------|-----------|
| `ursamu-dev` | Install the skill into your AI agent | No |
| `ursamu-audit` | Static analysis — catch violations before CI does | No |
| `ursamu-scaffold` | Generate correct plugin boilerplate — including help files and version wiring | No |
| `ursamu-docs` | Run any skill stage against your source to produce docs | Yes |

## Quick Start

```bash
# Install the skill (Claude Code by default)
npx @lhi/ursamu-dev

# Three commands every UrsaMU project should run after install:
ursamu-dev --install-hooks   # block commits that fail the audit
ursamu-audit --fix           # auto-repair the two most common violations
ursamu-audit --watch         # live violation diff on every file save
```

Then activate the skill in your agent:

```
/ursamu-dev
```

## Documentation

- [Installation & Setup](docs/install.md) — platforms, companion skills, pre-commit hook, activating the skill
- [ursamu-audit](docs/audit.md) — checks reference, auto-fix, watch mode, JSON output, CI integration
- [ursamu-scaffold](docs/scaffold.md) — options, name rules, generated files, adding commands
- [ursamu-docs](docs/docs-generator.md) — provider setup, options, output layout, CI integration
- [Six-Stage Pipeline](docs/pipeline.md) — how the agent works through Design → Docs
- [Architecture](docs/architecture.md) — directory structure, module map
- [Security Model](docs/security.md) — path traversal, SSRF, DoS limits, input validation
- [Contributing](docs/contributing.md) — adding checks, testing locally, test suite layout

## Requirements

- **Node.js 18+** (ESM required)
- Git (for `--install-hooks`)
- An LLM API key — Anthropic, Google, or OpenAI (for `ursamu-docs` only)

## License

MIT — Lemuel Lee Canady, Jr.
