/**
 * Security exploit test — M4: Transitive patch-mode write
 *
 * In --patch mode, write() constructs destination paths from unit.rootPath
 * and unit.files[0].path.  If those paths escape process.cwd(), the write
 * must be rejected even if the outDir check passes (defence-in-depth).
 *
 * These tests MUST FAIL before the patch is applied.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { write } from "../../lib/writer.js";

const MOCK_RESPONSE = `
### 5b — JSDoc
/**
 * Gives gold.
 */

### 5c — Plugin README
# Gold Plugin
`.trim();

describe("M4 — Patch-mode: destination path validation", () => {
  it("rejects patch write when unit.rootPath escapes cwd (plugin)", () => {
    const evilUnit = {
      type: "plugin",
      name: "evil",
      rootPath: "/tmp/evil-plugin",    // outside cwd
      files: [{ path: "/tmp/evil-plugin/index.ts", rel: "index.ts", content: "" }],
    };
    assert.throws(
      () => write({ unit: evilUnit, response: MOCK_RESPONSE, outDir: process.cwd(), patch: true }),
      /outside|traversal|permitted/i
    );
  });

  it("rejects patch write when unit.files[0].path escapes cwd (command)", () => {
    const evilUnit = {
      type: "command",
      name: "evil",
      rootPath: "/tmp/evil-cmd.ts",    // outside cwd
      files: [{ path: "/tmp/evil-cmd.ts", rel: "evil-cmd.ts", content: "" }],
    };
    assert.throws(
      () => write({ unit: evilUnit, response: MOCK_RESPONSE, outDir: process.cwd(), patch: true }),
      /outside|traversal|permitted/i
    );
  });
});
