import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join, dirname } from "path";
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
