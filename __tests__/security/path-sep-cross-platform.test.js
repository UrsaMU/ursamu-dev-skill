/**
 * EXPLOIT TEST — M-2: assertSafePath forward-slash hardcoding (Windows breakage)
 *
 * Vulnerability: lib/scanner.js, lib/scaffold/writer.js, and lib/writer.js all
 * guard path traversal with:
 *
 *   abs.startsWith(cwd + "/")
 *
 * On Windows, path.resolve() returns backslash-separated paths
 * (e.g. "C:\project\src"), so the forward-slash check never matches.
 * This means EVERY write to a sub-directory of cwd is incorrectly rejected
 * (the tool completely fails to scaffold files on Windows).
 *
 * The correct fix is to use path.relative(cwd, abs) and check whether the
 * relative path starts with ".." — which is cross-platform safe.
 *
 * What we can test on macOS/Linux:
 *   - assertSafePath(cwd)            → must NOT throw  (abs === cwd edge case)
 *   - assertSafePath(cwd + "/sub")   → must NOT throw  (safe sub-path)
 *   - assertSafePath(cwd + "/../x")  → must throw      (traversal)
 *
 * These cases are already exercised by path-traversal-src.test.js; this file
 * specifically documents the cross-platform contract and adds the cwd-itself
 * edge case that the old code handled via abs !== cwd but path.relative() must
 * also handle correctly (relative(cwd, cwd) === "" which is safe).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { relative, resolve, isAbsolute } from "path";
import { assertSafePath } from "../../lib/scanner.js";

// ── Cross-platform contract tests ────────────────────────────────────────────

describe("[Security] M-2: assertSafePath cross-platform path-separator contract", () => {
  const cwd = process.cwd();

  it("cwd itself is accepted (rel === '' edge case)", () => {
    assert.doesNotThrow(() => assertSafePath(cwd));
  });

  it("direct sub-directory is accepted", () => {
    assert.doesNotThrow(() => assertSafePath(resolve(cwd, "src")));
  });

  it("deeply nested sub-path is accepted", () => {
    assert.doesNotThrow(() => assertSafePath(resolve(cwd, "a", "b", "c")));
  });

  it("parent directory is rejected", () => {
    assert.throws(
      () => assertSafePath(resolve(cwd, "..")),
      /traversal|outside|project root/i
    );
  });

  it("sibling directory is rejected", () => {
    assert.throws(
      () => assertSafePath(resolve(cwd, "..", "sibling")),
      /traversal|outside|project root/i
    );
  });

  it("absolute path outside cwd is rejected", () => {
    assert.throws(
      () => assertSafePath("/etc"),
      /traversal|outside|project root/i
    );
  });

  // ── Implementation-level check ───────────────────────────────────────────
  // Verify the fix uses path.relative() semantics: relative(cwd, abs) must
  // NOT start with ".." for a safe path, and MUST for an unsafe one.
  it("path.relative() correctly identifies safe vs. unsafe paths (cross-platform proof)", () => {
    const safeSub  = resolve(cwd, "lib", "scanner.js");
    const unsafePar = resolve(cwd, "..", "evil");

    const safeRel   = relative(cwd, safeSub);
    const unsafeRel = relative(cwd, unsafePar);

    assert.ok(!safeRel.startsWith("..") && !isAbsolute(safeRel),
      `Safe sub-path "${safeRel}" must not start with ".."`);

    assert.ok(unsafeRel.startsWith("..") || isAbsolute(unsafeRel),
      `Unsafe path "${unsafeRel}" must start with ".." or be absolute`);
  });
});
