#!/usr/bin/env node

/**
 * bin/docs.js — UrsaMU standalone docs generator
 *
 * Runs any SKILL.md stage (default: Stage 5 — Docs) against UrsaMU source
 * files using any OpenAI-compatible LLM provider.
 *
 * Usage:
 *   node bin/docs.js [options]
 *
 * Options:
 *   --stage <n>         Stage number to run (default: 5)
 *   --src <dir>         Source directory to scan (default: ./src)
 *   --out <dir>         Output directory for generated docs (default: ./docs/generated)
 *   --patch             Write JSDoc/help text back into source files
 *   --provider <name>   anthropic | google | openai | custom
 *                       (default: auto-detect from env vars)
 *   --model <id>        Override default model for the selected provider
 *   --base-url <url>    Custom OpenAI-compatible base URL (requires --provider custom)
 *   --api-key <key>     API key override (falls back to env vars)
 *   --max-tokens <n>    Max tokens per LLM call (default: 4096)
 *   --dry-run           Print resolved config + discovered files; no LLM calls
 *   --help              Show this help
 */

import { realpathSync } from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

/**
 * Validate and parse the --stage argument.
 * Must be an integer in the range [0, 9].
 *
 * @param {string|number} raw
 * @returns {number}
 * @throws {Error} on invalid input
 */
export function validateStage(raw) {
  const n = Number(raw);
  if (typeof raw === "string" && raw.trim() === "") {
    throw new Error(`--stage must be an integer between 0 and 9 (got empty string).`);
  }
  if (!Number.isInteger(n) || n < 0 || n > 9) {
    throw new Error(
      `--stage must be an integer between 0 and 9 (got "${raw}").`
    );
  }
  return n;
}

/**
 * Validate and parse the --max-tokens argument.
 * Must be a positive integer no greater than 100,000.
 *
 * @param {string|number} raw
 * @returns {number}
 * @throws {Error} on invalid input
 */
export function validateMaxTokens(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 100_000) {
    throw new Error(
      `--max-tokens must be a positive integer up to 100,000 (got "${raw}").`
    );
  }
  return n;
}
import { resolve as resolveLLM, detectProvider } from "../lib/llm.js";
import { systemPrompt } from "../lib/prompts.js";
import { scan } from "../lib/scanner.js";
import { write } from "../lib/writer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const isMain = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(__filename); }
  catch { return false; }
})();

// ── Arg parsing ──────────────────────────────────────────────────────────────

export function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    stage:     5,
    src:       "./src",
    out:       "./docs/generated",
    patch:     false,
    provider:  null,
    model:     null,
    baseURL:   null,
    apiKey:    null,
    maxTokens: 4096,
    dryRun:    false,
    help:      false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    // Consume the next token, throwing clearly if the flag has no following value.
    const next = () => {
      if (i + 1 >= args.length) {
        throw new Error(`${a} requires a value but was the last argument.`);
      }
      return args[++i];
    };

    switch (a) {
      case "--stage":     opts.stage     = validateStage(next());    break;
      case "--src":       opts.src       = next();                   break;
      case "--out":       opts.out       = next();                   break;
      case "--patch":     opts.patch     = true;                     break;
      case "--provider":  opts.provider  = next();                   break;
      case "--model":     opts.model     = next();                   break;
      case "--base-url":  opts.baseURL   = next();                   break;
      case "--api-key":
        opts.apiKey = next();
        process.stderr.write(
          "Warning: --api-key on the command line may appear in shell history " +
          "and process listings. Prefer the environment variable instead.\n"
        );
        break;
      case "--max-tokens":opts.maxTokens = validateMaxTokens(next()); break;
      case "--dry-run":   opts.dryRun    = true;                     break;
      case "--help": case "-h": opts.help = true;                    break;
      default:
        console.error(`Unknown option: ${a}`);
        process.exit(1);
    }
  }

  return opts;
}

// ── Help text ────────────────────────────────────────────────────────────────

export const HELP = `
@lhi/ursamu-dev docs — UrsaMU standalone docs generator

  node bin/docs.js [options]

Options:
  --stage <n>         Stage number to run (default: 5)
  --src <dir>         Source directory to scan (default: ./src)
  --out <dir>         Output dir for generated docs (default: ./docs/generated)
  --patch             Write JSDoc/help text back into source files (local use)
  --provider <name>   anthropic | google | openai | custom
                      (auto-detected from env vars if omitted)
  --model <id>        Override default model for the selected provider
  --base-url <url>    OpenAI-compatible base URL  (--provider custom only)
  --api-key <key>     API key override (falls back to env vars)
                      WARNING: visible in shell history and process listings.
                      Prefer setting the provider env var instead.
  --max-tokens <n>    Max tokens per LLM call (default: 4096)
  --dry-run           Show resolved config + discovered files; skip LLM calls
  --help              Show this help

Provider auto-detection order (first matching env var wins):
  ANTHROPIC_API_KEY → anthropic (claude-sonnet-4-6)
  GOOGLE_API_KEY    → google    (gemini-2.0-flash)
  OPENAI_API_KEY    → openai    (gpt-4o)

GitHub Actions example (Anthropic):
  - name: Generate UrsaMU docs
    run: node bin/docs.js --stage 5 --src src/ --out docs/generated
    env:
      ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
`;

// ── User message builder ─────────────────────────────────────────────────────

/**
 * Build the user message for a single SourceUnit.
 * Concatenates all files with clear path headers so the LLM has full context.
 *
 * @param {import("../lib/scanner.js").SourceUnit} unit
 * @returns {string}
 */
function buildUserMessage(unit) {
  const header = unit.type === "plugin"
    ? `Plugin: ${unit.name}`
    : `Command file: ${unit.files[0].rel}`;

  const fileBlocks = unit.files.map(f =>
    `### ${f.rel}\n\`\`\`typescript\n${f.content}\n\`\`\``
  ).join("\n\n");

  return `${header}\n\nGenerate complete Stage 5 documentation for the following source:\n\n${fileBlocks}`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (isMain) {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    process.stdout.write(HELP + "\n", () => process.exit(0));
  }

  console.log("\n@lhi/ursamu-dev docs — UrsaMU standalone docs generator\n");

  // Resolve LLM provider (soft-fail in dry-run so config can still be printed)
  let llm;
  try {
    llm = resolveLLM({
      provider: opts.provider,
      model:    opts.model,
      baseURL:  opts.baseURL,
      apiKey:   opts.apiKey,
    });
  } catch (e) {
    if (!opts.dryRun) {
      console.error(`Error: ${e.message}\n`);
      process.exit(1);
    }
    llm = { provider: "(not configured)", model: "(not configured)", client: null };
  }

  // Discover source units
  let units;
  try {
    units = scan(opts.src);
  } catch (e) {
    console.error(`Error scanning ${opts.src}: ${e.message}\n`);
    process.exit(1);
  }

  if (units.length === 0) {
    console.error(`No source units found under "${opts.src}".`);
    console.error(`Expected src/commands/*.ts and/or src/plugins/*/\n`);
    process.exit(1);
  }

  // Build system prompt once (same stage for all units)
  let sysPrompt;
  try {
    sysPrompt = systemPrompt(opts.stage);
  } catch (e) {
    console.error(`Error extracting Stage ${opts.stage}: ${e.message}\n`);
    process.exit(1);
  }

  // Dry-run: print config and exit
  if (opts.dryRun) {
    console.log("Resolved config:");
    console.log(`  provider   : ${llm.provider}`);
    console.log(`  model      : ${llm.model}`);
    console.log(`  stage      : ${opts.stage}`);
    console.log(`  src        : ${opts.src}`);
    console.log(`  out        : ${opts.out}`);
    console.log(`  patch      : ${opts.patch}`);
    console.log(`  max-tokens : ${opts.maxTokens}`);
    console.log(`\nDiscovered ${units.length} source unit(s):`);
    for (const u of units) {
      console.log(`  [${u.type}] ${u.name} (${u.files.length} file(s))`);
    }
    console.log("\nDry run — no LLM calls made.\n");
    process.exit(0);
  }

  // Process each unit
  const allWritten = [];
  let failed = 0;

  for (const unit of units) {
    console.log(`Processing [${unit.type}] ${unit.name}...`);
    const userMessage = buildUserMessage(unit);

    try {
      const response = await llm.client.chat.completions.create({
        model: llm.model,
        max_tokens: opts.maxTokens,
        messages: [
          { role: "system",  content: sysPrompt },
          { role: "user",    content: userMessage },
        ],
      });

      const text = response.choices?.[0]?.message?.content ?? "";
      if (!text) {
        console.error(`  ✗ Empty response from LLM`);
        failed++;
        continue;
      }

      const written = write({
        unit,
        response: text,
        outDir: opts.out,
        patch: opts.patch,
      });

      for (const p of written) console.log(`  ✓ ${p}`);
      allWritten.push(...written);

    } catch (e) {
      console.error(`  ✗ LLM call failed: ${e.message}`);
      failed++;
    }
    console.log();
  }

  // Summary
  const exitCode = failed === 0 ? 0 : 1;
  const summary = failed === 0
    ? `Done. ${allWritten.length} artifact(s) written.\n`
    : `Completed with ${failed} error(s). ${allWritten.length} artifact(s) written.\n`;

  process.stdout.write(summary, () => process.exit(exitCode));
}
