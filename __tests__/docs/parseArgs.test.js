/**
 * Branch-coverage tests for bin/docs.js parseArgs(), validateStage(),
 * validateMaxTokens().
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs, validateStage, validateMaxTokens } from "../../bin/docs.js";

// ── validateStage ─────────────────────────────────────────────────────────────

describe("validateStage", () => {
  it("accepts 0", () => { assert.equal(validateStage(0), 0); });
  it("accepts 9", () => { assert.equal(validateStage(9), 9); });
  it("accepts string '5'", () => { assert.equal(validateStage("5"), 5); });

  it("rejects empty string", () => {
    assert.throws(() => validateStage(""), /0 and 9/i);
  });

  it("rejects negative number", () => {
    assert.throws(() => validateStage(-1), /0 and 9/i);
  });

  it("rejects 10", () => {
    assert.throws(() => validateStage(10), /0 and 9/i);
  });

  it("rejects non-integer float", () => {
    assert.throws(() => validateStage(3.5), /0 and 9/i);
  });
});

// ── validateMaxTokens ─────────────────────────────────────────────────────────

describe("validateMaxTokens", () => {
  it("accepts 1", () => { assert.equal(validateMaxTokens(1), 1); });
  it("accepts 4096", () => { assert.equal(validateMaxTokens(4096), 4096); });
  it("accepts 100000", () => { assert.equal(validateMaxTokens(100_000), 100_000); });

  it("rejects 0", () => {
    assert.throws(() => validateMaxTokens(0), /100,000/i);
  });

  it("rejects negative", () => {
    assert.throws(() => validateMaxTokens(-1), /100,000/i);
  });

  it("rejects over 100_000", () => {
    assert.throws(() => validateMaxTokens(100_001), /100,000/i);
  });

  it("rejects float", () => {
    assert.throws(() => validateMaxTokens(1.5), /100,000/i);
  });
});

// ── parseArgs — all flag branches ─────────────────────────────────────────────

describe("parseArgs flag branches", () => {
  it("parses --out", () => {
    const opts = parseArgs(["node", "docs.js", "--out", "./my-docs"]);
    assert.equal(opts.out, "./my-docs");
  });

  it("parses --patch", () => {
    const opts = parseArgs(["node", "docs.js", "--patch"]);
    assert.equal(opts.patch, true);
  });

  it("parses --provider", () => {
    const opts = parseArgs(["node", "docs.js", "--provider", "openai"]);
    assert.equal(opts.provider, "openai");
  });

  it("parses --model", () => {
    const opts = parseArgs(["node", "docs.js", "--model", "gpt-4o"]);
    assert.equal(opts.model, "gpt-4o");
  });

  it("parses --base-url", () => {
    const opts = parseArgs(["node", "docs.js", "--base-url", "https://api.example.com/v1"]);
    assert.equal(opts.baseURL, "https://api.example.com/v1");
  });

  it("parses --max-tokens", () => {
    const opts = parseArgs(["node", "docs.js", "--max-tokens", "2048"]);
    assert.equal(opts.maxTokens, 2048);
  });

  it("parses --dry-run", () => {
    const opts = parseArgs(["node", "docs.js", "--dry-run"]);
    assert.equal(opts.dryRun, true);
  });

  it("parses --help", () => {
    const opts = parseArgs(["node", "docs.js", "--help"]);
    assert.equal(opts.help, true);
  });

  it("parses -h", () => {
    const opts = parseArgs(["node", "docs.js", "-h"]);
    assert.equal(opts.help, true);
  });

  it("throws when value-requiring flag has no following argument", () => {
    assert.throws(
      () => parseArgs(["node", "docs.js", "--stage"]),
      /requires a value|last argument/i
    );
  });
});
