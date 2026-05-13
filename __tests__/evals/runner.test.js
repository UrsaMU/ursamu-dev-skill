/**
 * Tests for skill/evals/run-programmatic.js
 *
 * The real runner hits the Anthropic API. These tests exercise the pure
 * comparator + eval-loading logic without touching the network.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  comparePrediction,
  loadEvals,
  buildSystemPrompt,
  readUrsamuDevDescription,
  SIBLING_CATALOG,
} from "../../skill/evals/run-programmatic.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVALS_PATH = resolve(__dirname, "..", "..", "skill", "evals", "evals.json");

describe("comparePrediction — should_trigger", () => {
  const item = { id: "st-01", expect_skill: "ursamu-dev" };
  it("passes when predicted matches expected", () => {
    const r = comparePrediction(item, "should_trigger", "ursamu-dev");
    assert.equal(r.pass, true);
  });
  it("fails when predicted is a different skill", () => {
    const r = comparePrediction(item, "should_trigger", "mush-architect");
    assert.equal(r.pass, false);
  });
  it("fails when predicted is null", () => {
    const r = comparePrediction(item, "should_trigger", null);
    assert.equal(r.pass, false);
  });
});

describe("comparePrediction — should_not_trigger", () => {
  it("fails when predicted is ursamu-dev", () => {
    const item = { id: "snt-01", expect_skill_in: ["mush-architect"] };
    const r = comparePrediction(item, "should_not_trigger", "ursamu-dev");
    assert.equal(r.pass, false);
  });
  it("passes when predicted ∈ expect_skill_in", () => {
    const item = { id: "snt-01", expect_skill_in: ["mush-architect", "mush-natural"] };
    const r = comparePrediction(item, "should_not_trigger", "mush-natural");
    assert.equal(r.pass, true);
  });
  it("fails when predicted is outside expect_skill_in", () => {
    const item = { id: "snt-01", expect_skill_in: ["mush-architect"] };
    const r = comparePrediction(item, "should_not_trigger", "code-reviewer");
    assert.equal(r.pass, false);
  });
  it("passes on any non-ursamu-dev when expect_skill_in is empty", () => {
    const item = { id: "snt-08", expect_skill_in: [] };
    const r1 = comparePrediction(item, "should_not_trigger", "code-reviewer");
    const r2 = comparePrediction(item, "should_not_trigger", null);
    const r3 = comparePrediction(item, "should_not_trigger", "anything-else");
    assert.equal(r1.pass, true);
    assert.equal(r2.pass, true);
    assert.equal(r3.pass, true);
  });
  it("fails on ursamu-dev even with empty expect_skill_in", () => {
    const item = { id: "snt-08", expect_skill_in: [] };
    const r = comparePrediction(item, "should_not_trigger", "ursamu-dev");
    assert.equal(r.pass, false);
  });
});

describe("loadEvals", () => {
  it("loads and validates evals.json", () => {
    const data = loadEvals(EVALS_PATH);
    assert.equal(data.skill, "ursamu-dev");
    assert.ok(data.should_trigger.length >= 5);
    assert.ok(data.should_not_trigger.length >= 5);
  });
});

describe("buildSystemPrompt", () => {
  it("includes ursamu-dev description and all siblings", () => {
    const prompt = buildSystemPrompt("UrsaMU test description", SIBLING_CATALOG);
    assert.match(prompt, /UrsaMU test description/);
    assert.match(prompt, /mush-architect/);
    assert.match(prompt, /tdd-audit/);
    assert.match(prompt, /JSON object/);
  });
});

describe("readUrsamuDevDescription", () => {
  it("extracts description from SKILL.md frontmatter", () => {
    const desc = readUrsamuDevDescription();
    assert.match(desc, /UrsaMU/);
    assert.match(desc, /TypeScript MUSH engine/);
  });
});

// ── End-to-end harness with stubbed Anthropic client ─────────────────────────

/**
 * Re-implements the runner's batch loop against a fake client so we can verify
 * pass/fail counting + exit-code logic without hitting the API.
 */
function runBatchWithFakeClient(evals, fakePredict) {
  const tasks = [
    ...evals.should_trigger.map((e) => ({ kind: "should_trigger", entry: e })),
    ...evals.should_not_trigger.map((e) => ({ kind: "should_not_trigger", entry: e })),
  ];
  const results = tasks.map(({ kind, entry }) => {
    const pred = fakePredict(entry, kind);
    const cmp = comparePrediction(entry, kind, pred.predicted);
    return { id: entry.id, kind, prediction: pred, comparison: cmp };
  });
  const failures = results.filter((r) => !r.comparison.pass);
  const exitCode = failures.length === 0 ? 0 : 1;
  return { results, failures, exitCode };
}

describe("batch runner (stubbed client) — exit-code + counting", () => {
  it("exit code 0 when every prediction matches expectation", () => {
    const evals = loadEvals(EVALS_PATH);
    const fake = (entry, kind) => {
      if (kind === "should_trigger") return { predicted: "ursamu-dev", confidence: 0.9, reasoning: "stub" };
      const allowed = entry.expect_skill_in ?? [];
      return { predicted: allowed[0] ?? "some-other-skill", confidence: 0.9, reasoning: "stub" };
    };
    const { exitCode, failures, results } = runBatchWithFakeClient(evals, fake);
    assert.equal(exitCode, 0);
    assert.equal(failures.length, 0);
    assert.equal(results.length, evals.should_trigger.length + evals.should_not_trigger.length);
  });

  it("exit code 1 when any should_trigger is misrouted", () => {
    const evals = loadEvals(EVALS_PATH);
    const fake = (entry, kind) => {
      if (entry.id === "st-01-plugin-scaffold") return { predicted: "mush-architect", confidence: 0.6, reasoning: "stub-fail" };
      if (kind === "should_trigger") return { predicted: "ursamu-dev", confidence: 0.9, reasoning: "stub" };
      const allowed = entry.expect_skill_in ?? [];
      return { predicted: allowed[0] ?? "other", confidence: 0.9, reasoning: "stub" };
    };
    const { exitCode, failures } = runBatchWithFakeClient(evals, fake);
    assert.equal(exitCode, 1);
    assert.equal(failures.length, 1);
    assert.equal(failures[0].id, "st-01-plugin-scaffold");
  });

  it("empty expect_skill_in entry (snt-08) passes on any non-ursamu-dev prediction", () => {
    const evals = loadEvals(EVALS_PATH);
    const fake = (entry, kind) => {
      if (kind === "should_trigger") return { predicted: "ursamu-dev", confidence: 0.9, reasoning: "stub" };
      // For snt entries, always predict "code-reviewer" (not in any expect_skill_in but that's OK for snt-08).
      if (entry.id === "snt-08-discord-bot") return { predicted: "code-reviewer", confidence: 0.5, reasoning: "stub" };
      const allowed = entry.expect_skill_in ?? [];
      return { predicted: allowed[0] ?? "other", confidence: 0.9, reasoning: "stub" };
    };
    const { results } = runBatchWithFakeClient(evals, fake);
    const snt08 = results.find((r) => r.id === "snt-08-discord-bot");
    assert.equal(snt08.comparison.pass, true);
  });

  it("empty expect_skill_in still fails if prediction is ursamu-dev", () => {
    const evals = loadEvals(EVALS_PATH);
    const fake = (entry, kind) => {
      if (entry.id === "snt-08-discord-bot") return { predicted: "ursamu-dev", confidence: 0.9, reasoning: "stub" };
      if (kind === "should_trigger") return { predicted: "ursamu-dev", confidence: 0.9, reasoning: "stub" };
      const allowed = entry.expect_skill_in ?? [];
      return { predicted: allowed[0] ?? "other", confidence: 0.9, reasoning: "stub" };
    };
    const { exitCode, failures } = runBatchWithFakeClient(evals, fake);
    assert.equal(exitCode, 1);
    assert.ok(failures.some((f) => f.id === "snt-08-discord-bot"));
  });
});
