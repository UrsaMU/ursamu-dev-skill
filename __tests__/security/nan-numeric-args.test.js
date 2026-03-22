/**
 * Security exploit test — M2: NaN / invalid values from --stage and --max-tokens
 *
 * The arg parser must reject non-integer, negative, zero, and out-of-range values
 * for --stage and --max-tokens with a clear error message.
 * These tests MUST FAIL before the patch is applied.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateStage, validateMaxTokens } from "../../bin/docs.js";

describe("M2 — NaN / invalid numeric args", () => {
  // ── --stage ────────────────────────────────────────────────────────────────

  it("rejects --stage foo (NaN)", () => {
    assert.throws(() => validateStage("foo"), /integer|valid|stage/i);
  });

  it("rejects --stage '' (empty string → NaN)", () => {
    assert.throws(() => validateStage(""), /integer|valid|stage/i);
  });

  it("rejects --stage -1 (negative)", () => {
    assert.throws(() => validateStage("-1"), /integer|valid|stage/i);
  });

  it("rejects --stage 10 (out of range)", () => {
    assert.throws(() => validateStage("10"), /integer|valid|stage/i);
  });

  it("rejects --stage 1.5 (float)", () => {
    assert.throws(() => validateStage("1.5"), /integer|valid|stage/i);
  });

  it("accepts --stage 0", () => {
    assert.doesNotThrow(() => validateStage("0"));
    assert.equal(validateStage("0"), 0);
  });

  it("accepts --stage 5", () => {
    assert.doesNotThrow(() => validateStage("5"));
    assert.equal(validateStage("5"), 5);
  });

  it("accepts --stage 9 (max valid)", () => {
    assert.doesNotThrow(() => validateStage("9"));
    assert.equal(validateStage("9"), 9);
  });

  // ── --max-tokens ───────────────────────────────────────────────────────────

  it("rejects --max-tokens bar (NaN)", () => {
    assert.throws(() => validateMaxTokens("bar"), /integer|valid|token/i);
  });

  it("rejects --max-tokens 0 (zero)", () => {
    assert.throws(() => validateMaxTokens("0"), /integer|valid|token/i);
  });

  it("rejects --max-tokens -100 (negative)", () => {
    assert.throws(() => validateMaxTokens("-100"), /integer|valid|token/i);
  });

  it("rejects --max-tokens 200000 (above max)", () => {
    assert.throws(() => validateMaxTokens("200000"), /integer|valid|token/i);
  });

  it("accepts --max-tokens 4096", () => {
    assert.doesNotThrow(() => validateMaxTokens("4096"));
    assert.equal(validateMaxTokens("4096"), 4096);
  });

  it("accepts --max-tokens 100000 (upper boundary)", () => {
    assert.doesNotThrow(() => validateMaxTokens("100000"));
    assert.equal(validateMaxTokens("100000"), 100000);
  });
});
