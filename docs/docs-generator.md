# ursamu-docs — Docs Generator

Runs any SKILL.md stage against your UrsaMU source files and writes documentation artifacts. No agent session required — useful for CI or batch documentation runs.

## Usage

```bash
ursamu-docs [options]
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

## Options

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

## Provider Setup

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

Custom base URLs must be `https://` and may not target loopback, RFC-1918 private ranges, link-local, or IPv6 Unique Local addresses. See [security.md](./security.md) for the full block list.

## Output Layout

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

## CI Integration

```yaml
- name: Generate UrsaMU docs
  run: ursamu-docs --stage 5 --src src/ --out docs/generated
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```
