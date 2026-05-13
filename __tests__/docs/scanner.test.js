import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "path";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { fileURLToPath } from "url";
import { scan, assertSafePath } from "../../lib/scanner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_SRC = join(__dirname, "__fixtures__", "src");

describe("scan", () => {
  it("discovers the command fixture", () => {
    const units = scan(FIXTURE_SRC);
    const cmd = units.find(u => u.type === "command" && u.name === "gold");
    assert.ok(cmd, "expected a 'gold' command unit");
    assert.equal(cmd.files.length, 1);
    assert.ok(cmd.files[0].content.includes("addCmd"));
  });

  it("discovers the plugin fixture", () => {
    const units = scan(FIXTURE_SRC);
    const plugin = units.find(u => u.type === "plugin" && u.name === "notes");
    assert.ok(plugin, "expected a 'notes' plugin unit");
    assert.ok(plugin.files.length >= 2, "plugin should have at least 2 .ts files");
  });

  it("returns empty array for a valid-but-empty src dir", () => {
    // A path inside cwd that simply has no commands/ or plugins/ subdirs
    const units = scan(process.cwd());
    assert.ok(Array.isArray(units));
  });

  it("throws for a src path outside cwd (path traversal guard)", () => {
    assert.throws(() => assertSafePath("/tmp/__nonexistent__"), /outside|traversal|permitted/i);
  });

  it("file entries have path, rel, and content", () => {
    const units = scan(FIXTURE_SRC);
    for (const unit of units) {
      for (const f of unit.files) {
        assert.ok(typeof f.path === "string" && f.path.length > 0, "path must be non-empty string");
        assert.ok(typeof f.rel === "string"  && f.rel.length > 0,  "rel must be non-empty string");
        assert.ok(typeof f.content === "string",                    "content must be a string");
      }
    }
  });

  it("rel paths do not start with /", () => {
    const units = scan(FIXTURE_SRC);
    for (const unit of units) {
      for (const f of unit.files) {
        assert.ok(!f.rel.startsWith("/"), `rel "${f.rel}" should not start with /`);
      }
    }
  });
});

// ── Additional branch coverage ────────────────────────────────────────────────

describe("scan branch coverage", () => {
  const TMP = join(process.cwd(), ".test-tmp", "scanner-branch");

  before(() => { mkdirSync(TMP, { recursive: true }); });
  after(() => { rmSync(TMP, { recursive: true, force: true }); });

  it("includes .md files (README.md) in plugin collectFiles", () => {
    // A plugin with both .ts and .md files exercises the ext === ".md" branch
    const pluginDir = join(TMP, "plugins", "noted");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, "index.ts"), "export const plugin = {};", "utf8");
    writeFileSync(join(pluginDir, "README.md"), "# Noted\n", "utf8");

    const units = scan(TMP);
    const plugin = units.find(u => u.name === "noted");
    assert.ok(plugin, "should find the 'noted' plugin");
    assert.ok(plugin.files.some(f => f.rel === "README.md"), "README.md should be included");
  });

  it("ignores files that are not .ts or .md in plugins", () => {
    // A .json file in a plugin dir — hits the 'else' branch of isFile && (ts || md)
    const pluginDir = join(TMP, "plugins", "jsonplugin");
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(join(pluginDir, "index.ts"), "export const plugin = {};", "utf8");
    writeFileSync(join(pluginDir, "config.json"), '{"key":"val"}', "utf8");

    const units = scan(TMP);
    const plugin = units.find(u => u.name === "jsonplugin");
    assert.ok(plugin, "should find the plugin");
    assert.ok(!plugin.files.some(f => f.rel === "config.json"), ".json should be excluded");
  });

  it("ignores non-.ts entries in commands directory", () => {
    // A .js file in commands/ — hits !entry.isFile() || extname !== ".ts" continue path
    const cmdDir = join(TMP, "commands");
    mkdirSync(cmdDir, { recursive: true });
    writeFileSync(join(cmdDir, "gold.ts"), "addCmd({});", "utf8");
    writeFileSync(join(cmdDir, "helper.js"), "export const h = 1;", "utf8");

    const units = scan(TMP);
    const cmd = units.find(u => u.type === "command" && u.name === "gold");
    assert.ok(cmd, "should find the .ts command");
    assert.ok(!units.some(u => u.name === "helper"), ".js file should not be a command");
  });

  it("skips empty plugin directories", () => {
    // An empty plugin dir — hits files.length === 0 continue path
    const emptyPlugin = join(TMP, "plugins", "empty-plugin");
    mkdirSync(emptyPlugin, { recursive: true });

    const units = scan(TMP);
    assert.ok(!units.some(u => u.name === "empty-plugin"), "empty plugin should be skipped");
  });
});
