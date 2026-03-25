/**
 * Security exploit test — L2: Missing-arg off-by-one
 *
 * Every value-taking flag used as the last argument must produce a clear error,
 * not silently yield undefined/NaN.
 * Tests MUST FAIL before the patch is applied.
 *
 * Also covers LOW-02: --api-key shell-history warning must appear in --help text.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../bin/docs.js";

// ── LOW-02: --api-key shell-history risk must be visible in --help ────────────

// We export HELP from bin/docs.js so we can test its content directly.
// If HELP is not exported we import the module and check process.stdout output.
// The test below checks the exported HELP string contains the warning.

import { HELP } from "../../bin/docs.js";

describe("LOW-02 — --api-key warning visible in --help text", () => {
  it("HELP text mentions shell history risk for --api-key", () => {
    assert.ok(
      /shell.?history|history|process.?list/i.test(HELP),
      "--help must warn that --api-key is visible in shell history"
    );
  });

  it("HELP text contains --api-key option description", () => {
    assert.ok(
      HELP.includes("--api-key"),
      "--help must document the --api-key flag"
    );
  });
});

// ── L2: Missing-arg off-by-one ────────────────────────────────────────────────

describe("L2 — Missing argument after value-taking flag", () => {
  // --api-key is excluded: it is now hard-rejected before consuming a value
  // (see api-key-cli-rejection.test.js for that coverage).
  const FLAGS = ["--stage", "--src", "--out", "--provider", "--model", "--base-url", "--max-tokens"];

  for (const flag of FLAGS) {
    it(`throws a clear error when ${flag} is the last argument`, () => {
      assert.throws(
        () => parseArgs(["node", "docs.js", flag]),
        /missing|requires a value|expected/i
      );
    });
  }
});
