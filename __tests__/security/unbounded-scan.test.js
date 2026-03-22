/**
 * Security exploit test — M3: Unbounded recursive scan (DoS)
 *
 * collectFiles() must throw when a plugin directory exceeds MAX_DEPTH or
 * MAX_FILES.  Tests MUST FAIL before the patch is applied.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { scan } from "../../lib/scanner.js";

// Build a deeply-nested fixture directory inside the project root
const DEEP_BASE = join(process.cwd(), ".test-tmp", "deep-plugin-fixture");

function buildDeepTree(base, depth) {
  mkdirSync(base, { recursive: true });
  // Create a .ts file at every level to ensure collectFiles recurses
  writeFileSync(join(base, "index.ts"), "// depth marker\n");
  if (depth > 0) {
    buildDeepTree(join(base, "nested"), depth - 1);
  }
}

function buildWideTree(base, fileCount) {
  mkdirSync(base, { recursive: true });
  for (let i = 0; i < fileCount; i++) {
    writeFileSync(join(base, `cmd${i}.ts`), `// file ${i}\n`);
  }
}

describe("M3 — Unbounded scan: depth and file-count limits", () => {
  before(() => mkdirSync(DEEP_BASE, { recursive: true }));
  after(() => rmSync(DEEP_BASE, { recursive: true, force: true }));

  it("throws when plugin directory nesting exceeds MAX_DEPTH", () => {
    const pluginDir = join(DEEP_BASE, "src", "plugins", "toodeep");
    buildDeepTree(pluginDir, 12); // 13 levels deep — well over any sane limit

    assert.throws(
      () => scan(join(DEEP_BASE, "src")),
      /depth|too deep|limit/i
    );
  });

  it("throws when plugin directory contains too many files (MAX_FILES)", () => {
    const pluginDir = join(DEEP_BASE, "src2", "plugins", "toomany");
    buildWideTree(pluginDir, 600); // 600 files — well over any sane limit

    assert.throws(
      () => scan(join(DEEP_BASE, "src2")),
      /file|limit|too many/i
    );
  });
});
