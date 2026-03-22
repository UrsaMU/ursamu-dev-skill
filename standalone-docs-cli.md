# Standalone Docs CLI (`bin/docs.js`)

## Goal
Add a `bin/docs.js` entrypoint to `ursamu-dev-pkg` that runs any SKILL.md stage
(default: Stage 5 — Docs) against UrsaMU source files using any OpenAI-compatible
LLM provider (Anthropic, Google, OpenAI, or a custom endpoint).

---

## Architecture Decision: Single SDK, Multiple Providers

Use the `openai` npm package as the **only** HTTP client. Every major provider
now ships an OpenAI-compatible `/v1/chat/completions` endpoint:

| Provider  | Base URL                                                        | Key env var          | Default model          |
|-----------|-----------------------------------------------------------------|----------------------|------------------------|
| openai    | *(default)*                                                     | `OPENAI_API_KEY`     | `gpt-4o`               |
| anthropic | `https://api.anthropic.com/v1`                                  | `ANTHROPIC_API_KEY`  | `claude-sonnet-4-6`    |
| google    | `https://generativelanguage.googleapis.com/v1beta/openai/`      | `GOOGLE_API_KEY`     | `gemini-2.0-flash`     |
| custom    | `--base-url <url>`                                              | `--api-key` / env    | `--model` (required)   |

Zero provider-specific SDKs. Zero adapter layer. One interface.

---

## File Layout

```
bin/
  docs.js               ← new CLI entrypoint
lib/
  llm.js                ← resolves provider → OpenAI client instance
  prompts.js            ← reads SKILL.md, extracts stage N section as string
  scanner.js            ← globs src/ into { path, content, type } objects
  writer.js             ← parses LLM response sections, writes output artifacts
__tests__/
  docs/
    llm.test.js         ← provider resolution unit tests
    scanner.test.js     ← file discovery tests
    writer.test.js      ← output parsing + write tests
```

---

## CLI Interface

```
node bin/docs.js [options]

Options:
  --stage <n>         Stage number to run (default: 5)
  --src <dir>         Source directory to scan (default: ./src)
  --out <dir>         Output directory for generated docs (default: ./docs/generated)
  --patch             Write JSDoc/help text back into source files (local use only)
  --provider <name>   anthropic | google | openai | custom (default: auto-detect from env)
  --model <id>        Override default model for the selected provider
  --base-url <url>    Custom OpenAI-compatible base URL (requires --provider custom)
  --api-key <key>     API key override (falls back to env vars)
  --dry-run           Print resolved config + files found; do not call LLM
  --help              Show this help

CI example (Anthropic):
  ANTHROPIC_API_KEY=${{ secrets.ANTHROPIC_API_KEY }} node bin/docs.js --stage 5 --src src/

CI example (Google):
  GOOGLE_API_KEY=${{ secrets.GOOGLE_API_KEY }} node bin/docs.js --provider google --src src/
```

---

## Output Artifacts (Stage 5)

When `--patch` is **not** set (CI default), all output goes to `--out`:

```
docs/generated/
  commands/
    +gold.help.md          ← 5a: in-game help text
    +gold.jsdoc.md         ← 5b: JSDoc block
  plugins/
    notes/
      README.md            ← 5c: plugin README
      routes.md            ← 5d: REST route contracts
```

When `--patch` is set (local dev), docs are written/merged back into source files.

---

## Tasks

- [ ] **1. Add `openai` dependency**
  `npm install openai` → verify `package.json` has `"openai": "^4.x"`

- [ ] **2. Create `lib/llm.js`**
  Provider resolver: reads `--provider` flag (or auto-detects from which `*_API_KEY`
  env var is set), maps to `{ baseURL, apiKey, defaultModel }`, returns a configured
  `new OpenAI({ baseURL, apiKey })` instance.
  Verify: `node -e "import('./lib/llm.js').then(m => console.log(m.resolve('anthropic')))"` prints client config.

- [ ] **3. Create `lib/prompts.js`**
  Reads `skill/SKILL.md`, extracts the `## Stage N —` section (everything between
  that heading and the next `## Stage`) as a trimmed string.
  Verify: `node -e "import('./lib/prompts.js').then(m => m.extract(5).then(console.log))"` prints Stage 5 text.

- [ ] **4. Create `lib/scanner.js`**
  Globs `--src` dir for:
  - `commands/*.ts` → type `command`
  - `plugins/<name>/` → type `plugin` (reads all `.ts` files + existing README)
  Returns `[{ path, content, type, name }]`.
  Verify: `node -e "import('./lib/scanner.js').then(m => m.scan('./src').then(console.log))"` returns array.

- [ ] **5. Create `lib/writer.js`**
  Parses LLM response text for labeled sections (`### 5a`, `### 5b`, etc.),
  maps each to an output path under `--out` (or patches source if `--patch`),
  writes files, returns list of written paths.
  Verify: given mock response text, correct files appear under a temp `--out` dir.

- [ ] **6. Create `bin/docs.js`**
  Wire up: parse args → `llm.js` → `prompts.js` → `scanner.js` → for each source
  unit, call LLM with `[system: stage prompt, user: file content]` → `writer.js`.
  Exits 0 on success, 1 on any error. Prints summary of written paths.
  Verify: `node bin/docs.js --dry-run --src src/` completes without API call.

- [ ] **7. Add package.json script + `bin` entry**
  Add `"docs": "node bin/docs.js"` to `scripts`.
  Add `"ursamu-docs": "bin/docs.js"` to `bin`.
  Verify: `npm run docs -- --help` prints help text.

- [ ] **8. Write unit tests in `__tests__/docs/`**
  - `llm.test.js`: all four provider paths resolve correctly; missing key throws.
  - `scanner.test.js`: fixture dir → correct `{ path, type, name }` objects.
  - `writer.test.js`: mock LLM response → correct files written to temp dir.
  Verify: `node --test __tests__/docs/` passes with no failures.

- [ ] **9. Update README.md**
  Add a "Docs Generation (CI)" section below "Installation" with:
  - provider table (copied from this plan)
  - GitHub Actions example step for each provider
  - `--dry-run` usage note

---

## Done When

- [ ] `node bin/docs.js --dry-run --all` exits 0
- [ ] `node bin/docs.js --provider anthropic --src src/ --out /tmp/test-docs` writes at least one file when `ANTHROPIC_API_KEY` is valid
- [ ] Same command works with `--provider google` and `--provider openai`
- [ ] `node --test __tests__/docs/` passes
- [ ] GitHub Actions snippet in README works end-to-end

---

## Open Questions (decide before Task 6)

1. **Per-file or per-stage call?** — One LLM call per source file (parallelizable,
   simpler prompts) vs. one call with all files batched (fewer API calls, bigger
   context). Recommendation: per-file for Stage 5 since each command/plugin is
   self-contained.

2. **Stage 0–4 in CI?** — Stages 0–3 require design confirmation; Stage 4 runs
   Deno tests. These stages make more sense as local/interactive steps. Only Stage 5
   is a clean fit for fully unattended CI. Scope this CLI to Stage 5 first; other
   stages can be added behind a `--stage` flag later with appropriate warnings.

3. **Token budget** — Stage 5 on a large plugin could exceed context. Add a
   `--max-tokens` flag (default 4096) to cap output size per call.
