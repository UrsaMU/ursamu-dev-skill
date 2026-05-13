#!/usr/bin/env node
/**
 * Programmatic eval runner for the ursamu-dev skill.
 *
 * HONEST LIMITATION: The Anthropic SDK does NOT expose a "load these skills and
 * tell me which one activates" API — Claude Code's skill loader is internal to
 * that product. This script uses a *judge-model approximation*: it asks Claude
 * (Haiku) to predict, given a curated catalog of competing sibling skills, which
 * skill would route for each eval prompt. This is a proxy for real loader
 * behavior. Mismatches still indicate that the description is ambiguous to a
 * competent reader — a useful signal, but not ground truth.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node skill/evals/run-programmatic.js
 *
 * Exits 0 if all pass, 1 if any fail.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVALS_DIR = __dirname;
const EVALS_PATH = join(EVALS_DIR, "evals.json");
const SCHEMA_PATH = join(EVALS_DIR, "schema.json");
const SKILL_MD_PATH = resolve(__dirname, "..", "SKILL.md");
const LAST_RUN_PATH = join(EVALS_DIR, "last-run.json");

const MODEL = "claude-haiku-4-5";
const CONCURRENCY = 3;

// ── Sibling skill catalog (hand-curated, one-line descriptions) ──────────────
// These are external skills — descriptions are summaries from public sources.
// Used only by the judge model to score routing predictions.
export const SIBLING_CATALOG = [
  { name: "mush-architect", description: "Master orchestrator for RhostMUSH softcode work — RhostMUSH/PennMUSH/TinyMUX softcode, @functions, builders, wizards, &attributes, MUSH game softcode development." },
  { name: "mush-natural", description: "Translate natural-language feature descriptions into RhostMUSH softcode. Plain English to MUSH softcode." },
  { name: "mush-bboard", description: "Scaffold a RhostMUSH bulletin board system in softcode — post/read/reply, group subscriptions, admin moderation." },
  { name: "mush-chargen", description: "Scaffold a RhostMUSH character generation system in softcode — stat arrays, sheet display, approval workflow." },
  { name: "mush-format", description: "Format and compress RhostMUSH softcode between pretty .mush and minified .txt installers." },
  { name: "tdd-workflows-tdd-cycle", description: "Red-Green-Refactor TDD cycle workflow for general code. Write a failing test, implement minimum code to pass, then refactor." },
  { name: "test-driven-development", description: "General test-driven development workflow — use when implementing any feature or bugfix in any language, before writing implementation code." },
  { name: "tdd-audit", description: "Run a complete TDD Remediation Autonomous Audit — adversarial security review of code for OWASP-class vulnerabilities, language-agnostic." },
  { name: "code-reviewer", description: "Elite code review expert — generic PR / code review feedback, modern AI-powered code review." },
  { name: "security-review", description: "Complete a security review of the pending changes on the current branch — generic security review." },
  { name: "review", description: "Review a pull request — generic PR review skill." },
  { name: "sdd", description: "Spec-Driven Development orchestrator: constitution → research → specify → plan → implement → verify. Use when starting a new feature, refactor, or project that benefits from a spec before code." },
  { name: "writing-plans", description: "Use when you have a spec or requirements for a multi-step task, before touching code — produces an implementation plan." },
  { name: "concise-planning", description: "Generate a clear, actionable, atomic checklist for a coding task." },
  { name: "documentation", description: "General documentation generation workflow — API docs, architecture docs, README files, code comments, technical writing." },
  { name: "api-documentation", description: "API documentation workflow — generating OpenAPI specs, creating developer guides, maintaining comprehensive API documentation." },
  { name: "readme", description: "Write a comprehensive, thorough README.md for an open-source project." },
];

// ── Eval loading + light schema validation ───────────────────────────────────

export function loadEvals(path = EVALS_PATH) {
  const raw = readFileSync(path, "utf8");
  const data = JSON.parse(raw);
  // Light validation — assert required top-level shape.
  if (!data.skill || !Array.isArray(data.should_trigger) || !Array.isArray(data.should_not_trigger)) {
    throw new Error("evals.json missing required fields (skill, should_trigger, should_not_trigger)");
  }
  for (const item of data.should_trigger) {
    if (!item.id || !item.prompt || !item.expect_skill) {
      throw new Error(`should_trigger item missing required fields: ${JSON.stringify(item)}`);
    }
  }
  for (const item of data.should_not_trigger) {
    if (!item.id || !item.prompt) {
      throw new Error(`should_not_trigger item missing required fields: ${JSON.stringify(item)}`);
    }
  }
  return data;
}

// ── Extract ursamu-dev description from SKILL.md frontmatter ─────────────────

export function readUrsamuDevDescription(path = SKILL_MD_PATH) {
  const md = readFileSync(path, "utf8");
  const m = md.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) throw new Error("SKILL.md frontmatter not found");
  const fm = m[1];
  // Multi-line description with quotes.
  const dm = fm.match(/description:\s*"((?:[^"\\]|\\.)*)"/);
  if (!dm) throw new Error("description field not found in frontmatter");
  return dm[1].replace(/\\"/g, '"');
}

// ── Pure prediction comparator ───────────────────────────────────────────────

/**
 * Compare a predicted skill against an eval entry's expectation.
 * @param {object} evalItem - one entry from should_trigger or should_not_trigger
 * @param {string} kind - "should_trigger" | "should_not_trigger"
 * @param {string|null} predicted - the predicted skill name (or null for "no skill")
 * @returns {{pass: boolean, reason: string}}
 */
export function comparePrediction(evalItem, kind, predicted) {
  if (kind === "should_trigger") {
    const expected = evalItem.expect_skill;
    if (predicted === expected) return { pass: true, reason: `predicted=${expected}` };
    return { pass: false, reason: `expected ${expected}, got ${predicted ?? "null"}` };
  }
  // should_not_trigger
  if (predicted === "ursamu-dev") {
    return { pass: false, reason: `predicted ursamu-dev but should NOT trigger it` };
  }
  const allowed = evalItem.expect_skill_in;
  if (!allowed || allowed.length === 0) {
    // Empty list — any non-ursamu-dev answer is acceptable.
    return { pass: true, reason: `predicted=${predicted ?? "null"} (any non-ursamu-dev allowed)` };
  }
  if (predicted && allowed.includes(predicted)) {
    return { pass: true, reason: `predicted=${predicted} ∈ ${JSON.stringify(allowed)}` };
  }
  return { pass: false, reason: `expected ∈ ${JSON.stringify(allowed)}, got ${predicted ?? "null"}` };
}

// ── Build the judge prompt ───────────────────────────────────────────────────

export function buildSystemPrompt(ursamuDevDescription, siblings = SIBLING_CATALOG) {
  const catalog = [
    `- ursamu-dev: ${ursamuDevDescription}`,
    ...siblings.map((s) => `- ${s.name}: ${s.description}`),
  ].join("\n");

  return `You are a skill-routing judge. Given a user prompt and a catalog of available skills, predict which single skill (if any) Claude Code would activate for that prompt.

Skill catalog:
${catalog}

Rules:
- Pick exactly one skill name from the catalog, or "null" if no skill is clearly the best fit.
- Match on the skill's stated trigger conditions (use-when, do-not-use-when, named APIs/keywords).
- Prefer the most specific skill. Domain-specific skills beat generic ones when their keywords match.
- Respond ONLY with a JSON object on a single line: {"predicted": "<skill-name-or-null>", "confidence": 0.0-1.0, "reasoning": "<one short sentence>"}
- No prose outside the JSON. No code fences.`;
}

// ── Anthropic call (lazy import so tests don't need the SDK) ─────────────────

async function callJudge(client, systemPrompt, userPrompt) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
  const usage = resp.usage || { input_tokens: 0, output_tokens: 0 };
  let parsed;
  try {
    // Strip code fences if the model added them anyway.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parsed = { predicted: null, confidence: 0, reasoning: `parse-error: ${text.slice(0, 200)}` };
  }
  if (parsed.predicted === "null" || parsed.predicted === "") parsed.predicted = null;
  return { ...parsed, usage };
}

// ── Concurrency pool (no deps) ───────────────────────────────────────────────

async function runPool(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set. Refusing to run.");
    console.error("Set it and re-run: ANTHROPIC_API_KEY=sk-ant-... node skill/evals/run-programmatic.js");
    process.exit(2);
  }

  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });

  const evals = loadEvals();
  const description = readUrsamuDevDescription();
  const systemPrompt = buildSystemPrompt(description);

  const tasks = [
    ...evals.should_trigger.map((e) => ({ kind: "should_trigger", entry: e })),
    ...evals.should_not_trigger.map((e) => ({ kind: "should_not_trigger", entry: e })),
  ];

  const start = Date.now();
  console.log(`Running ${tasks.length} evals against ${MODEL} (concurrency=${CONCURRENCY})…\n`);

  const results = await runPool(tasks, async ({ kind, entry }) => {
    try {
      const pred = await callJudge(client, systemPrompt, entry.prompt);
      const cmp = comparePrediction(entry, kind, pred.predicted);
      return { id: entry.id, kind, entry, prediction: pred, comparison: cmp };
    } catch (err) {
      return {
        id: entry.id,
        kind,
        entry,
        prediction: { predicted: null, confidence: 0, reasoning: `error: ${err.message}`, usage: { input_tokens: 0, output_tokens: 0 } },
        comparison: { pass: false, reason: `runtime error: ${err.message}` },
      };
    }
  });

  // Print per-prompt lines.
  let stPass = 0, sntPass = 0;
  let totalInput = 0, totalOutput = 0;
  const failures = [];
  for (const r of results) {
    const expected = r.kind === "should_trigger"
      ? r.entry.expect_skill
      : (r.entry.expect_skill_in?.length ? `not-ursamu-dev ∈ ${r.entry.expect_skill_in.join(",")}` : "not-ursamu-dev");
    const status = r.comparison.pass ? "PASS" : "FAIL";
    const conf = (r.prediction.confidence ?? 0).toFixed(2);
    console.log(`[${r.id}] ${status}  expected: ${expected}  predicted: ${r.prediction.predicted ?? "null"}  conf: ${conf}`);
    if (r.comparison.pass) {
      if (r.kind === "should_trigger") stPass++; else sntPass++;
    } else {
      failures.push(r);
    }
    totalInput += r.prediction.usage?.input_tokens ?? 0;
    totalOutput += r.prediction.usage?.output_tokens ?? 0;
  }

  const runtime = ((Date.now() - start) / 1000).toFixed(1);
  const stTotal = evals.should_trigger.length;
  const sntTotal = evals.should_not_trigger.length;
  const totalPass = stPass + sntPass;
  const total = stTotal + sntTotal;

  console.log("\n──────── Summary ────────");
  console.log(`should_trigger:      ${stPass}/${stTotal} pass`);
  console.log(`should_not_trigger:  ${sntPass}/${sntTotal} pass`);
  console.log(`total:               ${totalPass}/${total} (${((totalPass / total) * 100).toFixed(0)}%)`);
  console.log(`runtime:             ${runtime}s`);
  console.log(`tokens:              ${totalInput} in / ${totalOutput} out`);

  if (failures.length) {
    console.log("\n──────── Failures ────────");
    for (const f of failures) {
      console.log(`[${f.id}] ${f.comparison.reason}`);
      console.log(`  prompt:    ${f.entry.prompt}`);
      console.log(`  reasoning: ${f.prediction.reasoning}`);
    }
  }

  const out = {
    skill: evals.skill,
    version: evals.version,
    model: MODEL,
    timestamp: new Date().toISOString(),
    runtime_seconds: Number(runtime),
    tokens: { input: totalInput, output: totalOutput },
    summary: {
      should_trigger: { pass: stPass, total: stTotal },
      should_not_trigger: { pass: sntPass, total: sntTotal },
      total: { pass: totalPass, total },
    },
    results: results.map((r) => ({
      id: r.id,
      kind: r.kind,
      prompt: r.entry.prompt,
      expected: r.kind === "should_trigger" ? r.entry.expect_skill : (r.entry.expect_skill_in ?? []),
      predicted: r.prediction.predicted,
      confidence: r.prediction.confidence,
      reasoning: r.prediction.reasoning,
      pass: r.comparison.pass,
      reason: r.comparison.reason,
      tokens: r.prediction.usage,
    })),
  };
  writeFileSync(LAST_RUN_PATH, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${LAST_RUN_PATH}`);

  process.exit(failures.length === 0 ? 0 : 1);
}

// Only run main when invoked directly (so tests can import without side effects).
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
