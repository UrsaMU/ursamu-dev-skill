/**
 * Security exploit test — L2: Missing-arg off-by-one
 *
 * Every value-taking flag used as the last argument must produce a clear error,
 * not silently yield undefined/NaN.
 * Tests MUST FAIL before the patch is applied.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../bin/docs.js";

describe("L2 — Missing argument after value-taking flag", () => {
  const FLAGS = ["--stage", "--src", "--out", "--provider", "--model", "--base-url", "--api-key", "--max-tokens"];

  for (const flag of FLAGS) {
    it(`throws a clear error when ${flag} is the last argument`, () => {
      assert.throws(
        () => parseArgs(["node", "docs.js", flag]),
        /missing|requires a value|expected/i
      );
    });
  }
});
