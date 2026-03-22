/**
 * Security exploit test — M1: Arbitrary file write via --out
 *
 * write() must refuse to write to any outDir that escapes process.cwd().
 * These tests MUST FAIL before the patch is applied.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { write } from "../../lib/writer.js";

const MOCK_UNIT = {
  type: "command",
  name: "gold",
  rootPath: "/src/commands/gold.ts",
  files: [{ path: "/src/commands/gold.ts", rel: "gold.ts", content: "addCmd({...})" }],
};

const MOCK_RESPONSE = `### 5a — Help Text\n+gold <target>=<amount>  — Give gold.\n`;

describe("M1 — Arbitrary write: --out validation", () => {
  it("rejects --out /etc", () => {
    assert.throws(
      () => write({ unit: MOCK_UNIT, response: MOCK_RESPONSE, outDir: "/etc" }),
      /outside|traversal|permitted/i
    );
  });

  it("rejects --out /tmp", () => {
    assert.throws(
      () => write({ unit: MOCK_UNIT, response: MOCK_RESPONSE, outDir: "/tmp" }),
      /outside|traversal|permitted/i
    );
  });

  it("rejects --out ~/.ssh", () => {
    const sshDir = `${process.env.HOME}/.ssh`;
    assert.throws(
      () => write({ unit: MOCK_UNIT, response: MOCK_RESPONSE, outDir: sshDir }),
      /outside|traversal|permitted/i
    );
  });

  it("rejects --out with traversal sequence ../../etc", () => {
    assert.throws(
      () => write({ unit: MOCK_UNIT, response: MOCK_RESPONSE, outDir: "../../etc" }),
      /outside|traversal|permitted/i
    );
  });
});
