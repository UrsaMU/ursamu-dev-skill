# ursamu-docs — Architecture Notes

> **Usage documentation is in [README.md](./README.md#ursamu-docs--docs-generator).**

## Design: Single SDK, Multiple Providers

`ursamu-docs` uses the `openai` npm package as the only HTTP client. Every supported
provider ships an OpenAI-compatible `/v1/chat/completions` endpoint, so zero
provider-specific SDKs or adapter layers are needed.

| Provider | Base URL | Key env var | Default model |
|----------|----------|-------------|---------------|
| anthropic | `https://api.anthropic.com/v1` | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` |
| google | `https://generativelanguage.googleapis.com/v1beta/openai/` | `GOOGLE_API_KEY` | `gemini-2.0-flash` |
| openai | *(SDK default)* | `OPENAI_API_KEY` | `gpt-4o` |
| custom | `--base-url <url>` | `--api-key` / `LLM_API_KEY` | `--model` (required) |

## Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `lib/llm.js` | Resolves provider name (or auto-detects from env) → configured `OpenAI` client + model string. Validates custom base URLs against SSRF. |
| `lib/prompts.js` | Reads `skill/SKILL.md`, extracts the `## Stage N —` section as a trimmed string for use as the LLM system prompt. |
| `lib/scanner.js` | Globs `--src` for `commands/*.ts` and `plugins/<name>/` directories, reads file content, returns `SourceUnit[]`. |
| `lib/writer.js` | Parses labeled sections from the LLM response (`### 5a`, `### 5b`, etc.), maps each to an output path, writes files. Supports default (artifact tree) and `--patch` (write alongside source) modes. |

## Per-file LLM Call Strategy

One LLM call is made per source unit (command file or plugin directory). This keeps
prompts focused and context windows manageable. Calls are sequential; parallelism is
not implemented to avoid rate-limit bursts on free-tier keys.

## SSRF Guard

Custom base URLs are validated in `lib/llm.js → validateBaseURL()` before the
`OpenAI` client is constructed. Blocked ranges:

- Non-HTTPS schemes
- IPv4: loopback (`127.x`), RFC-1918 (`10.x`, `172.16–31.x`, `192.168.x`), link-local (`169.254.x`)
- IPv6: loopback (`::1`), Unique Local (`fc00::/7`), Link-Local (`fe80::/10`)

DNS rebinding is acknowledged as out of scope for a local CLI tool.

## Stage Suitability

| Stage | Suitable for CI? | Notes |
|-------|-----------------|-------|
| 0 — Design | No | Requires interactive clarification |
| 1–3 — Generate/Audit/Refine | No | Requires design confirmation |
| 4 — Test | No | Requires Deno test runner |
| 5 — Docs | ✓ Yes | Fully unattended; default stage |
| Others via `--stage` | With caution | Stages 0–4 will run but are designed for interactive use |
