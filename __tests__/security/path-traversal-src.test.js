/**
 * Security exploit test — H2: Path traversal via --src
 *
 * scan() (and the path-validation helper it delegates to) must reject any
 * --src value that escapes the project root (process.cwd()).
 *
 * These tests MUST FAIL before the patch is applied.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "path";
import { assertSafePath } from "../../lib/scanner.js";

describe("H2 — Path traversal: --src validation", () => {
  // ── Absolute paths outside cwd ─────────────────────────────────────────────

  it("rejects /etc", () => {
    assert.throws(() => assertSafePath("/etc"), /outside|traversal|permitted/i);
  });

  it("rejects /", () => {
    assert.throws(() => assertSafePath("/"), /outside|traversal|permitted/i);
  });

  it("rejects /home (another user's home)", () => {
    assert.throws(() => assertSafePath("/home"), /outside|traversal|permitted/i);
  });

  it("rejects /tmp (outside cwd even if writeable)", () => {
    assert.throws(() => assertSafePath("/tmp"), /outside|traversal|permitted/i);
  });

  // ── Traversal sequences that resolve outside cwd ───────────────────────────

  it("rejects ../../etc via relative traversal", () => {
    assert.throws(() => assertSafePath("../../etc"), /outside|traversal|permitted/i);
  });

  it("rejects ../.. (parent of project root)", () => {
    assert.throws(() => assertSafePath("../.."), /outside|traversal|permitted/i);
  });

  // ── Valid sub-paths should still work ─────────────────────────────────────

  it("accepts src/ (relative, inside cwd)", () => {
    assert.doesNotThrow(() => assertSafePath("src"));
  });

  it("accepts __tests__/ (relative, inside cwd)", () => {
    assert.doesNotThrow(() => assertSafePath("__tests__"));
  });

  it("accepts an absolute path that is a subdir of cwd", () => {
    const inside = resolve(process.cwd(), "src");
    assert.doesNotThrow(() => assertSafePath(inside));
  });
});
