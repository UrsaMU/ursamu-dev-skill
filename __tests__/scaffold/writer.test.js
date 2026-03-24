/**
 * Unit tests for lib/scaffold/writer.js
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync, readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { validateName, describeFiles, writeScaffold } from "../../lib/scaffold/writer.js";

// Use a temp dir under the project so assertSafeOutPath passes
const TMP = resolve("__tests__/scaffold/__tmp__");

before(() => { mkdirSync(TMP, { recursive: true }); });
after(() => { rmSync(TMP, { recursive: true, force: true }); });

function tmpOut(suffix) { return join(TMP, suffix); }

// ── validateName ─────────────────────────────────────────────────────────────

describe("validateName", () => {
  it("accepts valid lowercase name", () => {
    assert.doesNotThrow(() => validateName("greeter"));
  });

  it("accepts name with digits and hyphens", () => {
    assert.doesNotThrow(() => validateName("my-plugin-2"));
  });

  it("rejects uppercase", () => {
    assert.throws(() => validateName("Greeter"), /invalid plugin name/i);
  });

  it("rejects name starting with digit", () => {
    assert.throws(() => validateName("2cool"), /invalid plugin name/i);
  });

  it("rejects name with path separator", () => {
    assert.throws(() => validateName("../evil"), /invalid plugin name/i);
  });

  it("rejects empty string", () => {
    assert.throws(() => validateName(""), /required/i);
  });

  it("rejects spaces", () => {
    assert.throws(() => validateName("my plugin"), /invalid plugin name/i);
  });
});

// ── describeFiles ─────────────────────────────────────────────────────────────

describe("describeFiles", () => {
  it("returns 3 files by default", () => {
    const files = describeFiles("foo");
    assert.equal(files.length, 3);
  });

  it("returns 4 files with --with-routes", () => {
    const files = describeFiles("foo", { withRoutes: true });
    assert.equal(files.length, 4);
    assert.ok(files.some(f => f.endsWith("routes.ts")));
  });

  it("returns 5 files with --with-tests", () => {
    const files = describeFiles("foo", { withTests: true });
    assert.equal(files.length, 5);
    assert.ok(files.some(f => f.endsWith("foo.test.ts")));
    assert.ok(files.some(f => f.endsWith("mockU.ts")));
  });

  it("uses --out path when provided", () => {
    const files = describeFiles("foo", { out: "./custom/path" });
    // path.join normalises "./custom/path" → "custom/path"
    assert.ok(files.every(f => f.includes("custom/path")));
  });
});

// ── writeScaffold — default (3 files) ────────────────────────────────────────

describe("writeScaffold default", () => {
  it("creates index.ts, commands.ts, README.md", () => {
    const out = tmpOut("default");
    writeScaffold("greeter", { out });
    assert.ok(existsSync(join(out, "index.ts")));
    assert.ok(existsSync(join(out, "commands.ts")));
    assert.ok(existsSync(join(out, "README.md")));
  });

  it("does not create routes.ts without --with-routes", () => {
    const out = tmpOut("default");
    assert.ok(!existsSync(join(out, "routes.ts")));
  });

  it("does not create tests/ without --with-tests", () => {
    const out = tmpOut("default");
    assert.ok(!existsSync(join(out, "tests")));
  });
});

// ── writeScaffold — with routes ───────────────────────────────────────────────

describe("writeScaffold --with-routes", () => {
  it("creates routes.ts", () => {
    const out = tmpOut("with-routes");
    writeScaffold("routetest", { out, withRoutes: true });
    assert.ok(existsSync(join(out, "routes.ts")));
  });

  it("routes.ts contains auth guard", () => {
    const out = tmpOut("with-routes");
    const content = readFileSync(join(out, "routes.ts"), "utf8");
    assert.ok(content.includes("if (!userId)"), "routes.ts must contain if (!userId)");
  });

  it("index.ts references registerPluginRoute", () => {
    const out = tmpOut("with-routes");
    const content = readFileSync(join(out, "index.ts"), "utf8");
    assert.ok(content.includes("registerPluginRoute"), "index.ts must reference registerPluginRoute");
  });
});

// ── writeScaffold — with tests ────────────────────────────────────────────────

describe("writeScaffold --with-tests", () => {
  it("creates test file and mockU helper", () => {
    const out = tmpOut("with-tests");
    writeScaffold("notetest", { out, withTests: true });
    assert.ok(existsSync(join(out, "tests", "notetest.test.ts")));
    assert.ok(existsSync(join(out, "tests", "helpers", "mockU.ts")));
  });

  it("test file mentions the plugin name", () => {
    const out = tmpOut("with-tests");
    const content = readFileSync(join(out, "tests", "notetest.test.ts"), "utf8");
    assert.ok(content.includes("notetest"), "test file should reference plugin name");
  });

  it("mockU.ts contains _sent and _dbCalls fields", () => {
    const out = tmpOut("with-tests");
    const content = readFileSync(join(out, "tests", "helpers", "mockU.ts"), "utf8");
    assert.ok(content.includes("_sent"), "mockU.ts must have _sent");
    assert.ok(content.includes("_dbCalls"), "mockU.ts must have _dbCalls");
  });
});

// ── writeScaffold — content checks ───────────────────────────────────────────

describe("writeScaffold content", () => {
  it("index.ts exports plugin with init returning true", () => {
    const out = tmpOut("content");
    writeScaffold("content", { out });
    const content = readFileSync(join(out, "index.ts"), "utf8");
    assert.ok(content.includes("export const plugin"), "must export plugin");
    assert.ok(content.includes("return true"), "init must return true");
  });

  it("commands.ts contains addCmd with help: and Examples", () => {
    const out = tmpOut("content");
    const content = readFileSync(join(out, "commands.ts"), "utf8");
    assert.ok(content.includes("addCmd("), "must call addCmd");
    assert.ok(content.includes("help:"), "must have help field");
    assert.ok(content.includes("Examples"), "help must contain Examples");
  });

  it("commands.ts uses jsr:@ursamu/ursamu import", () => {
    const out = tmpOut("content");
    const content = readFileSync(join(out, "commands.ts"), "utf8");
    assert.ok(content.includes("jsr:@ursamu/ursamu"), "must use jsr: import");
  });

  it("README.md has required section headers", () => {
    const out = tmpOut("content");
    const content = readFileSync(join(out, "README.md"), "utf8");
    assert.ok(content.includes("## Commands"), "README must have Commands section");
    assert.ok(content.includes("## Events"), "README must have Events section");
    assert.ok(content.includes("## Storage"), "README must have Storage section");
  });

  it("substitutes plugin name throughout", () => {
    const out = tmpOut("content");
    const idx = readFileSync(join(out, "index.ts"), "utf8");
    assert.ok(idx.includes('"content"'), "index.ts must contain the plugin name string");
  });
});

// ── writeScaffold — safety ────────────────────────────────────────────────────

describe("writeScaffold safety", () => {
  it("throws for --out outside cwd", () => {
    assert.throws(
      () => writeScaffold("evil", { out: "/tmp/__ursamu_scaffold_test__" }),
      /outside|traversal|permitted/i
    );
  });

  it("throws when output directory is non-empty", () => {
    const out = tmpOut("nonempty");
    mkdirSync(out, { recursive: true });
    // Write a file first
    writeScaffold("filler", { out });
    // Now try to scaffold into the same non-empty dir
    assert.throws(
      () => writeScaffold("filler", { out }),
      /not empty/i
    );
  });
});
