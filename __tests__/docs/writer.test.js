import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { parseSections, write } from "../../lib/writer.js";

// Use a temp dir inside the project root so the out-path guard passes
import { mkdirSync } from "fs";
const CWD_TMP_BASE = join(process.cwd(), ".test-tmp");
mkdirSync(CWD_TMP_BASE, { recursive: true });

// ── parseSections ────────────────────────────────────────────────────────────

describe("parseSections", () => {
  it("parses all five labeled sections", () => {
    const response = `
### 5a — In-game help text
+gold <target>=<amount>  — Give gold.

### 5b — JSDoc
/**
 * Gives gold.
 */

### 5c — Plugin README
# Notes Plugin

### 5d — REST Route Contract
GET /api/v1/notes

### 5e — Inline Comments
// strip first
`.trim();

    const sections = parseSections(response);
    assert.ok(sections.has("help"),     "missing help");
    assert.ok(sections.has("jsdoc"),    "missing jsdoc");
    assert.ok(sections.has("README"),   "missing README");
    assert.ok(sections.has("routes"),   "missing routes");
    assert.ok(sections.has("comments"), "missing comments");
  });

  it("handles alternative headings", () => {
    const response = `
## Help Text
+cmd  — does thing.

## JSDoc
/** @param u */
`.trim();

    const sections = parseSections(response);
    assert.ok(sections.has("help"));
    assert.ok(sections.has("jsdoc"));
  });

  it("returns empty map for unrecognized response", () => {
    const sections = parseSections("Nothing useful here.");
    assert.equal(sections.size, 0);
  });

  it("trims leading/trailing whitespace from section content", () => {
    const response = `### 5a\n\n  +cmd  — thing.  \n\n`;
    const sections = parseSections(response);
    const help = sections.get("help");
    assert.ok(help && help.trim() === help, "content should be trimmed");
  });
});

// ── write (--out mode) ───────────────────────────────────────────────────────

describe("write (out mode)", () => {
  let tmpDir;
  before(() => { tmpDir = mkdtempSync(join(CWD_TMP_BASE, "writer-")); });
  after(()  => { rmSync(tmpDir, { recursive: true, force: true }); });

  const mockCommandUnit = {
    type: "command",
    name: "gold",
    rootPath: "/src/commands/gold.ts",
    files: [{ path: "/src/commands/gold.ts", rel: "gold.ts", content: "addCmd({...})" }],
  };

  const mockPluginUnit = {
    type: "plugin",
    name: "notes",
    rootPath: "/src/plugins/notes",
    files: [
      { path: "/src/plugins/notes/index.ts", rel: "index.ts", content: "" },
      { path: "/src/plugins/notes/commands.ts", rel: "commands.ts", content: "" },
    ],
  };

  const mockResponse = `
### 5a — Help Text
+gold <target>=<amount>  — Gives gold.

### 5b — JSDoc
/**
 * Gives gold to target.
 */

### 5c — Plugin README
# Notes
`.trim();

  it("writes command artifacts to outDir/commands/<name>/", () => {
    const written = write({ unit: mockCommandUnit, response: mockResponse, outDir: tmpDir });
    assert.ok(written.length >= 2, "should write at least help and jsdoc");
    for (const p of written) {
      assert.ok(existsSync(p), `expected file to exist: ${p}`);
      assert.ok(p.includes("gold"), "path should reference unit name");
    }
  });

  it("writes plugin artifacts to outDir/plugins/<name>/", () => {
    const written = write({ unit: mockPluginUnit, response: mockResponse, outDir: tmpDir });
    assert.ok(written.length >= 1);
    assert.ok(written.some(p => p.includes("plugins") && p.includes("notes")));
  });

  it("written files have non-empty content", () => {
    const written = write({ unit: mockCommandUnit, response: mockResponse, outDir: tmpDir });
    for (const p of written) {
      const content = readFileSync(p, "utf8");
      assert.ok(content.trim().length > 0, `file should not be empty: ${p}`);
    }
  });

  it("returns empty array and warns for unrecognized response", () => {
    const written = write({ unit: mockCommandUnit, response: "nothing useful", outDir: tmpDir });
    assert.deepEqual(written, []);
  });
});
