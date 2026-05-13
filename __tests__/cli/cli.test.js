/**
 * Unit tests for bin/cli.js installer functions.
 * Uses dry-run mode so no actual files are written to real agent dirs.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  mkdirSync, rmSync, existsSync, writeFileSync, readdirSync, cpSync, readFileSync, chmodSync,
} from "fs";
import { join, resolve } from "path";
import { tmpdir } from "os";

import {
  resolveCodexHome,
  installSkillsDir,
  installCompanions,
  installOpenCode,
} from "../../bin/cli.js";

// ── resolveCodexHome ──────────────────────────────────────────────────────────

describe("resolveCodexHome", () => {
  const HOME = "/home/testuser";

  it("returns fallback when envValue is empty", () => {
    assert.equal(resolveCodexHome("", HOME), join(HOME, ".codex", "skills"));
  });

  it("returns fallback when envValue is undefined", () => {
    assert.equal(resolveCodexHome(undefined, HOME), join(HOME, ".codex", "skills"));
  });

  it("returns fallback when envValue is whitespace", () => {
    assert.equal(resolveCodexHome("   ", HOME), join(HOME, ".codex", "skills"));
  });

  it("resolves a valid path inside HOME", () => {
    const result = resolveCodexHome(join(HOME, "my-codex"), HOME);
    assert.equal(result, join(HOME, "my-codex", "skills"));
  });

  it("returns fallback when path escapes HOME", () => {
    assert.equal(resolveCodexHome("/etc/passwd", HOME), join(HOME, ".codex", "skills"));
  });

  it("returns fallback when path traverses out of HOME", () => {
    assert.equal(resolveCodexHome(join(HOME, "..", "..", "etc"), HOME), join(HOME, ".codex", "skills"));
  });
});

// ── installSkillsDir ──────────────────────────────────────────────────────────

describe("installSkillsDir", () => {
  let tmpBase;

  before(() => {
    tmpBase = join(process.cwd(), ".test-tmp", "cli-skill-");
    mkdirSync(tmpBase, { recursive: true });
  });

  after(() => rmSync(tmpBase, { recursive: true, force: true }));

  it("returns true in dry-run mode without writing files", () => {
    const destBase = join(tmpBase, "dry-dest");
    const result = installSkillsDir("claude", destBase, /* dryRun */ true);
    assert.equal(result, true);
    // Dry-run must NOT create the destination directory
    assert.ok(!existsSync(join(destBase, "ursamu-dev")), "dry-run must not write files");
  });

  it("creates destination and returns true when skill dir exists", () => {
    const destBase = join(tmpBase, "real-dest");
    const result = installSkillsDir("claude", destBase, /* dryRun */ false);
    assert.equal(result, true);
    assert.ok(existsSync(join(destBase, "ursamu-dev")), "should create ursamu-dev subdir");
  });

  it("returns false and does not throw on EACCES-like errors", () => {
    // We simulate a write failure by using a path we cannot create.
    // On macOS/Linux the root filesystem is not writable without sudo.
    // Use a deeply nested path that cpSync can't create after mkdir:
    // — Actually use a file path as destBase to trigger ENOENT.
    const notADir = join(tmpBase, "a-file.txt");
    writeFileSync(notADir, "block", "utf8");
    // join(notADir, "ursamu-dev") can't be created because notADir is a file
    const result = installSkillsDir("claude", notADir, false);
    assert.equal(result, false);
  });

  it("hits EACCES branch when destination is read-only", () => {
    // Create a read-only directory — cpSync into it triggers EACCES
    const readOnlyBase = join(tmpBase, "readonly-dest");
    mkdirSync(readOnlyBase, { recursive: true });
    chmodSync(readOnlyBase, 0o555); // no write
    let result;
    try {
      result = installSkillsDir("claude", readOnlyBase, false);
    } finally {
      chmodSync(readOnlyBase, 0o755); // restore so after() can rmSync it
    }
    assert.equal(result, false, "should return false for read-only destination");
  });
});

// ── installCompanions ─────────────────────────────────────────────────────────

describe("installCompanions", () => {
  let tmpBase;

  before(() => {
    tmpBase = join(process.cwd(), ".test-tmp", "cli-companions-");
    mkdirSync(tmpBase, { recursive: true });
  });

  after(() => rmSync(tmpBase, { recursive: true, force: true }));

  it("skips gracefully in dry-run mode", () => {
    const destBase = join(tmpBase, "dry-companions");
    // Should not throw
    assert.doesNotThrow(() => installCompanions(destBase, /* dryRun */ true));
    // No companion dirs should be written
    assert.ok(!existsSync(destBase) || readdirSync(destBase).length === 0,
      "dry-run should not create companion directories");
  });

  it("installs companion skills when not dry-run", () => {
    const destBase = join(tmpBase, "real-companions");
    mkdirSync(destBase, { recursive: true });
    installCompanions(destBase, /* dryRun */ false);
    // At least one companion skill directory should exist
    const dirs = existsSync(destBase) ? readdirSync(destBase) : [];
    assert.ok(dirs.length > 0, "should install at least one companion skill");
  });

  it("hits EACCES branch when companion destination is read-only", () => {
    const readOnlyBase = join(tmpBase, "readonly-companions");
    mkdirSync(readOnlyBase, { recursive: true });
    chmodSync(readOnlyBase, 0o555);
    try {
      // Should not throw — errors are caught and logged
      assert.doesNotThrow(() => installCompanions(readOnlyBase, false));
    } finally {
      chmodSync(readOnlyBase, 0o755);
    }
  });

  it("hits else branch when companion install fails with non-EACCES error", () => {
    // Using a file path as destBase causes mkdirSync(join(file, skill)) → ENOTDIR (not EACCES)
    const fileAsBase = join(tmpBase, "not-a-dir-companions.txt");
    writeFileSync(fileAsBase, "block", "utf8");
    // Should not throw — the else branch logs the error and continues
    assert.doesNotThrow(() => installCompanions(fileAsBase, false));
  });
});

// ── installOpenCode ───────────────────────────────────────────────────────────

describe("installOpenCode", () => {
  let tmpBase;

  before(() => {
    tmpBase = join(process.cwd(), ".test-tmp", "cli-opencode-");
    mkdirSync(tmpBase, { recursive: true });
  });

  after(() => rmSync(tmpBase, { recursive: true, force: true }));

  it("returns true in dry-run mode without writing files", () => {
    const destDir = join(tmpBase, "dry-oc");
    const result = installOpenCode(destDir, /* dryRun */ true);
    assert.equal(result, true);
    assert.ok(!existsSync(join(destDir, "ursamu-dev.md")), "dry-run must not write file");
  });

  it("creates ursamu-dev.md with OpenCode frontmatter when not dry-run", () => {
    const destDir = join(tmpBase, "real-oc");
    const result = installOpenCode(destDir, /* dryRun */ false);
    assert.equal(result, true);
    const mdPath = join(destDir, "ursamu-dev.md");
    assert.ok(existsSync(mdPath));

    const content = readFileSync(mdPath, "utf8");
    assert.ok(content.includes("name: ursamu-dev"), "should have OpenCode frontmatter");
    assert.ok(content.includes("description:"), "should have description field");
  });

  it("returns false and does not throw on write failure", () => {
    // Use an impossible path (parent is a file)
    const notADir = join(tmpBase, "file.txt");
    writeFileSync(notADir, "block", "utf8");
    const result = installOpenCode(notADir, false);
    assert.equal(result, false);
  });

  it("hits EACCES branch when OpenCode destination dir is read-only", () => {
    const readOnlyDir = join(tmpBase, "readonly-oc");
    mkdirSync(readOnlyDir, { recursive: true });
    chmodSync(readOnlyDir, 0o555);
    let result;
    try {
      result = installOpenCode(readOnlyDir, false);
    } finally {
      chmodSync(readOnlyDir, 0o755);
    }
    assert.equal(result, false, "should return false for read-only OpenCode destination");
  });
});
