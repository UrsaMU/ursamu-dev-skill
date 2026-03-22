# @lhi/ursamu-dev

A skill installer that adds UrsaMU development expertise to your AI coding agent. Works with Claude Code, Gemini CLI, Cursor, Codex, Antigravity, and OpenCode.

Once installed, activate with `/ursamu-dev` in your agent to get a purpose-built assistant for writing idiomatic TypeScript/Deno code targeting the UrsaMU MU\* server platform.

## Table of Contents

- [What This Does](#what-this-does)
- [Installation](#installation)
- [Supported Platforms](#supported-platforms)
- [What the Skill Does](#what-the-skill-does)
- [Docs Generation (CI)](#docs-generation-ci)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

---

## What This Does

UrsaMU is a TypeScript/Deno MUSH-style multiplayer game server built on the `jsr:@ursamu/ursamu` SDK. Writing correct UrsaMU code requires knowing a specific set of conventions: correct import paths for native vs. plugin contexts, the three-stage Generate → Audit → Refine pipeline, security patterns like `stripSubs` and `canEdit`, atomic DB operations, lock expressions, MUSH color codes, and sandbox rules for system scripts.

This package installs a skill file into your agent's skills directory so the agent applies all of that knowledge automatically when you're working in a UrsaMU codebase.

---

## Installation

```bash
npx @lhi/ursamu-dev
```

Defaults to Claude Code. For other platforms, pass a flag:

```bash
npx @lhi/ursamu-dev --gemini
npx @lhi/ursamu-dev --opencode
npx @lhi/ursamu-dev --all        # install to every supported platform
npx @lhi/ursamu-dev --claude --opencode  # install to multiple specific platforms
```

Preview what would be installed without writing anything:

```bash
npx @lhi/ursamu-dev --dry-run --all
```

After installation, open your agent and run:

```
/ursamu-dev
```

---

## Supported Platforms

| Flag | Platform | Install Location |
|------|----------|-----------------|
| `--claude` *(default)* | Claude Code | `~/.claude/skills/ursamu-dev/` |
| `--gemini` | Gemini CLI | `~/.gemini/skills/ursamu-dev/` |
| `--cursor` | Cursor | `~/.cursor/skills/ursamu-dev/` |
| `--codex` | Codex CLI | `~/.codex/skills/ursamu-dev/` (or `$CODEX_HOME/skills/`) |
| `--antigravity` | Antigravity | `~/.antigravity/skills/ursamu-dev/` |
| `--opencode` | OpenCode | `~/.config/opencode/agents/ursamu-dev.md` |

When targeting Claude Code, the installer also sets up the `@lhi/tdd-audit` toolchain automatically.

---

## What the Skill Does

When `/ursamu-dev` is active, the agent follows a three-stage pipeline for every code generation task:

**Stage 1 — Generate**
Writes code using the correct patterns for the target context:

- `src/commands/` — native `addCmd` with full Deno APIs
- `src/plugins/<name>/` — plugin structure with `IPlugin`, `index.ts`, `commands.ts`
- `system/scripts/` — sandboxed Web Worker scripts (no Deno APIs)

Correct import paths, regex patterns, lock expressions, SDK calls, MUSH color codes, and `DBO` collection usage are applied automatically.

**Stage 2 — Security & Style Audit**
Every response includes an audit report checking:

- Input sanitization (`stripSubs` before DB keys or length checks)
- Permission guards (`canEdit` before modifying others' objects)
- Atomic DB writes (`$set` / `$inc` / `$unset` only)
- Null checks on `u.util.target()` results
- Admin flag validation
- Sandbox safety for system scripts
- Color reset (`%cn` at end of all colored strings)
- Correct `u.db.modify` op strings

**Stage 3 — Refine**
If the audit finds issues, the affected code is rewritten and re-checked before the final output.

The skill also ships a full API reference at `skill/references/api-reference.md` covering all public types, method signatures, event payloads, REST endpoints, and plugin conventions.

---

## Docs Generation (CI)

`ursamu-docs` (`bin/docs.js`) runs any SKILL.md stage against your UrsaMU source
files and writes documentation artifacts — no agent session required.  It uses
any OpenAI-compatible LLM provider via a single `openai` SDK client.

### Provider support

| Provider | Flag | Key env var | Default model |
|---|---|---|---|
| Anthropic | `--provider anthropic` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` |
| Google | `--provider google` | `GOOGLE_API_KEY` | `gemini-2.0-flash` |
| OpenAI | `--provider openai` | `OPENAI_API_KEY` | `gpt-4o` |
| Custom | `--provider custom --base-url <url> --model <id>` | `LLM_API_KEY` | *(required)* |

Provider is **auto-detected** from whichever key env var is set (anthropic → google → openai).
No `--provider` flag needed in most CI setups.

### Basic usage

```bash
# Preview what would run — no LLM calls
node bin/docs.js --dry-run --src src/

# Generate Stage 5 docs to docs/generated/
ANTHROPIC_API_KEY=sk-ant-... node bin/docs.js --src src/ --out docs/generated

# Use a specific provider and model
GOOGLE_API_KEY=... node bin/docs.js --provider google --model gemini-2.0-flash --src src/

# Patch JSDoc and help text back into source files (local dev)
ANTHROPIC_API_KEY=... node bin/docs.js --patch --src src/
```

### GitHub Actions examples

**Anthropic:**
```yaml
- name: Generate UrsaMU docs
  run: node bin/docs.js --stage 5 --src src/ --out docs/generated
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Google:**
```yaml
- name: Generate UrsaMU docs
  run: node bin/docs.js --stage 5 --src src/ --out docs/generated
  env:
    GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
```

**OpenAI:**
```yaml
- name: Generate UrsaMU docs
  run: node bin/docs.js --stage 5 --src src/ --out docs/generated
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

### Output layout

```
docs/generated/
  commands/
    <name>/
      help.md       ← 5a: in-game help text
      jsdoc.md      ← 5b: JSDoc block
  plugins/
    <name>/
      help.md
      jsdoc.md
      README.md     ← 5c: plugin README
      routes.md     ← 5d: REST route contracts
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Dry-run install to all platforms (smoke test) |

---

## Contributing

The skill content lives in `skill/SKILL.md` and `skill/references/`. The installer logic is in `bin/cli.js`.

To test changes locally:

```bash
node bin/cli.js --dry-run --all
node bin/cli.js --claude
```

---

## License

MIT — Kyra Lee
