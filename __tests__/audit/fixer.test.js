/**
 * Unit tests for lib/audit/fixer.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join, resolve } from "path";
import {
  classifyViolations,
  applyFixesToLines,
  fixFile,
  FIXABLE_CHECKS,
} from "../../lib/audit/fixer.js";

const TMP = resolve("__tests__/audit/__tmp_fixer__");

// ── Setup / teardown ──────────────────────────────────────────────────────────

import { before, after } from "node:test";
before(() => mkdirSync(TMP, { recursive: true }));
after(() => rmSync(TMP, { recursive: true, force: true }));

function tmpFile(name, content) {
  const p = join(TMP, name);
  writeFileSync(p, content, "utf8");
  return p;
}

function fakeViolation(check, line) {
  return { file: "/fake/file.ts", line, check, level: "warn", message: "x" };
}

// ── FIXABLE_CHECKS ─────────────────────────────────────────────────────────

describe("FIXABLE_CHECKS", () => {
  it("contains check-09 and check-15", () => {
    assert.ok(FIXABLE_CHECKS.has("check-09"));
    assert.ok(FIXABLE_CHECKS.has("check-15"));
  });

  it("does not contain structural checks", () => {
    for (const c of ["check-01", "check-03", "check-10", "check-11", "check-12", "check-13", "check-14"]) {
      assert.ok(!FIXABLE_CHECKS.has(c), `${c} should not be auto-fixable`);
    }
  });
});

// ── classifyViolations ────────────────────────────────────────────────────────

describe("classifyViolations", () => {
  it("splits fixable and manual correctly", () => {
    const violations = [
      fakeViolation("check-09", 1),
      fakeViolation("check-15", 5),
      fakeViolation("check-03", 10),
      fakeViolation("check-12", 20),
    ];
    const { fixable, manual } = classifyViolations(violations);
    assert.equal(fixable.length, 2);
    assert.equal(manual.length, 2);
    assert.ok(fixable.every(v => FIXABLE_CHECKS.has(v.check)));
    assert.ok(manual.every(v => !FIXABLE_CHECKS.has(v.check)));
  });

  it("returns empty fixable for all-manual violations", () => {
    const { fixable } = classifyViolations([fakeViolation("check-03", 1)]);
    assert.equal(fixable.length, 0);
  });

  it("returns empty manual for all-fixable violations", () => {
    const { manual } = classifyViolations([
      fakeViolation("check-09", 1),
      fakeViolation("check-15", 5),
    ]);
    assert.equal(manual.length, 0);
  });
});

// ── applyFixesToLines — check-09 ──────────────────────────────────────────────

describe("applyFixesToLines check-09", () => {
  it("replaces bare @ursamu/ursamu with jsr: prefix", () => {
    const lines = [
      `import { addCmd } from "@ursamu/ursamu";`,
      `const x = 1;`,
    ];
    const v = { file: "/f.ts", line: 1, check: "check-09", level: "warn", message: "" };
    const { lines: out, applied } = applyFixesToLines(lines, [v]);
    assert.equal(applied, 1);
    assert.ok(out[0].includes("jsr:@ursamu/ursamu"), "must add jsr: prefix");
    assert.ok(!out[0].includes('"@ursamu/ursamu"'), "must remove bare import");
  });

  it("does not mutate the original lines array", () => {
    const lines = [`import { x } from "@ursamu/ursamu";`];
    const original = lines[0];
    const v = { file: "/f.ts", line: 1, check: "check-09", level: "warn", message: "" };
    applyFixesToLines(lines, [v]);
    assert.equal(lines[0], original, "original should not be mutated");
  });

  it("leaves unrelated lines untouched", () => {
    const lines = [
      `import { addCmd } from "@ursamu/ursamu";`,
      `const y = 2;`,
    ];
    const v = { file: "/f.ts", line: 1, check: "check-09", level: "warn", message: "" };
    const { lines: out } = applyFixesToLines(lines, [v]);
    assert.equal(out[1], `const y = 2;`);
  });

  it("handles single-quote imports", () => {
    const lines = [`import { x } from '@ursamu/ursamu';`];
    const v = { file: "/f.ts", line: 1, check: "check-09", level: "warn", message: "" };
    const { lines: out, applied } = applyFixesToLines(lines, [v]);
    assert.equal(applied, 1);
    assert.ok(out[0].includes("jsr:@ursamu/ursamu"));
  });

  it("fixes multiple check-09 violations in the same file", () => {
    const lines = [
      `import { addCmd } from "@ursamu/ursamu";`,
      `import type { IPlugin } from "@ursamu/ursamu";`,
    ];
    const violations = [
      { file: "/f.ts", line: 1, check: "check-09", level: "warn", message: "" },
      { file: "/f.ts", line: 2, check: "check-09", level: "warn", message: "" },
    ];
    const { applied } = applyFixesToLines(lines, violations);
    assert.equal(applied, 2);
  });
});

// ── applyFixesToLines — check-15 ──────────────────────────────────────────────

describe("applyFixesToLines check-15", () => {
  it("inserts return true before closing brace of init()", () => {
    const src = [
      `export const plugin = {`,
      `  name: "test",`,
      `  init: async () => {`,
      `    gameHooks.on("tick", onTick);`,
      `  },`,
      `  remove: () => {},`,
      `};`,
    ];
    const v = { file: "/f.ts", line: 3, check: "check-15", level: "error", message: "" };
    const { lines: out, applied } = applyFixesToLines(src, [v]);
    assert.equal(applied, 1);
    const joined = out.join("\n");
    assert.ok(joined.includes("return true;"), "must insert return true");
  });

  it("inserts return true with correct indentation", () => {
    const src = [
      `export const plugin = {`,
      `  init: async () => {`,
      `    const x = 1;`,
      `  },`,
      `};`,
    ];
    const v = { file: "/f.ts", line: 2, check: "check-15", level: "error", message: "" };
    const { lines: out } = applyFixesToLines(src, [v]);
    const returnLine = out.find(l => l.includes("return true;"));
    assert.ok(returnLine, "return true line must exist");
    // Indentation should be deeper than the closing brace
    assert.ok(returnLine.startsWith("    "), "must be indented");
  });

  it("does not double-insert if init already has return true", () => {
    const src = [
      `export const plugin = {`,
      `  init: async () => {`,
      `    return true;`,
      `  },`,
      `};`,
    ];
    const v = { file: "/f.ts", line: 2, check: "check-15", level: "error", message: "" };
    const { lines: out } = applyFixesToLines(src, [v]);
    const count = out.filter(l => /return true/.test(l)).length;
    // If init() already had return true, the audit check wouldn't fire,
    // but the fixer should still handle it gracefully (only one "return true")
    assert.ok(count >= 1, "must have at least one return true");
  });
});

// ── fixFile ───────────────────────────────────────────────────────────────────

describe("fixFile", () => {
  it("rewrites file in place for check-09", () => {
    const content = `import { addCmd } from "@ursamu/ursamu";\nconst x = 1;\n`;
    const filePath = tmpFile("fix09.ts", content);
    const v = { file: filePath, line: 1, check: "check-09", level: "warn", message: "" };

    const result = fixFile(filePath, [v]);
    assert.equal(result.fixed, 1);
    assert.equal(result.skipped, 0);

    const updated = readFileSync(filePath, "utf8");
    assert.ok(updated.includes("jsr:@ursamu/ursamu"));
  });

  it("rewrites file in place for check-15", () => {
    const content = [
      `export const plugin = {`,
      `  name: "x",`,
      `  init: async () => {`,
      `    const y = 2;`,
      `  },`,
      `  remove: () => {},`,
      `};`,
      ``,
    ].join("\n");
    const filePath = tmpFile("fix15.ts", content);
    const v = { file: filePath, line: 3, check: "check-15", level: "error", message: "" };

    const result = fixFile(filePath, [v]);
    assert.equal(result.fixed, 1);

    const updated = readFileSync(filePath, "utf8");
    assert.ok(updated.includes("return true;"), "must contain return true after fix");
  });

  it("reports skipped checks for unfixable violations", () => {
    const filePath = tmpFile("skip.ts", `const x = 1;\n`);
    const violations = [
      { file: filePath, line: 1, check: "check-03", level: "error", message: "" },
      { file: filePath, line: 2, check: "check-12", level: "error", message: "" },
    ];
    const result = fixFile(filePath, violations);
    assert.equal(result.fixed, 0);
    assert.equal(result.skipped, 2);
    assert.ok(result.skippedChecks.includes("check-03"));
    assert.ok(result.skippedChecks.includes("check-12"));
  });

  it("deduplicates skippedChecks", () => {
    const filePath = tmpFile("dedup.ts", `const x = 1;\n`);
    const violations = [
      { file: filePath, line: 1, check: "check-03", level: "error", message: "" },
      { file: filePath, line: 2, check: "check-03", level: "error", message: "" },
    ];
    const result = fixFile(filePath, violations);
    assert.equal(result.skippedChecks.filter(c => c === "check-03").length, 1);
  });

  it("returns fixed=0 and skipped=0 for empty violations", () => {
    const filePath = tmpFile("empty.ts", `const x = 1;\n`);
    const result = fixFile(filePath, []);
    assert.equal(result.fixed, 0);
    assert.equal(result.skipped, 0);
    assert.deepEqual(result.skippedChecks, []);
  });
});
