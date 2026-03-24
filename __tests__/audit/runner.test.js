/**
 * Integration tests for lib/audit/runner.js
 * Tests against fixture files in __fixtures__/passing/ and __fixtures__/failing/.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runAudit } from "../../lib/audit/runner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES  = join(__dirname, "__fixtures__");

describe("runAudit", () => {
  it("returns zero violations for the passing/ fixtures", () => {
    const { violations, fileCount } = runAudit(join(FIXTURES, "passing"));
    // Clean fixture should have no errors or warnings (hints are allowed)
    const blocking = violations.filter(v => v.level === "error" || v.level === "warn");
    assert.equal(blocking.length, 0, `Expected no errors/warnings but got: ${JSON.stringify(blocking, null, 2)}`);
    assert.ok(fileCount > 0, "Should scan at least one file");
  });

  it("detects violations in the failing/ fixtures", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    const errors = violations.filter(v => v.level === "error");
    assert.ok(errors.length > 0, "Expected at least one error in failing fixtures");
  });

  it("reports check-03 from check-03-bad-op.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-03"),
      "Expected check-03 violation"
    );
  });

  it("reports check-10 from check-10-no-help.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-10"),
      "Expected check-10 violation"
    );
  });

  it("reports check-11 from check-11-addcmd-in-init.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-11"),
      "Expected check-11 violation"
    );
  });

  it("reports check-12 from check-12-no-off.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-12"),
      "Expected check-12 violation"
    );
  });

  it("reports check-13 from check-13-no-namespace.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-13"),
      "Expected check-13 violation"
    );
  });

  it("reports check-14 from check-14-no-auth-guard.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-14"),
      "Expected check-14 violation"
    );
  });

  it("reports check-15 from check-15-no-return.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-15"),
      "Expected check-15 violation"
    );
  });

  it("reports check-02 from check-02-no-canedit.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-02"),
      "Expected check-02 violation"
    );
  });

  it("reports check-07 from check-07-no-reset.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-07"),
      "Expected check-07 violation"
    );
  });

  it("reports check-08 from check-08-bad-op.ts", () => {
    const { violations } = runAudit(join(FIXTURES, "failing"));
    assert.ok(
      violations.some(v => v.check === "check-08"),
      "Expected check-08 violation"
    );
  });

  it("throws for a path outside cwd", () => {
    assert.throws(
      () => runAudit("/tmp/__ursamu_test__"),
      /outside|traversal|permitted/i
    );
  });

  it("throws for a non-directory path", () => {
    const singleFile = join(FIXTURES, "passing", "clean-plugin.ts");
    assert.throws(() => runAudit(singleFile), /not a directory/i);
  });
});
