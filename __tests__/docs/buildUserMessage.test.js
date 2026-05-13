/**
 * Unit tests for bin/docs.js buildUserMessage (now exported).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUserMessage, HELP } from "../../bin/docs.js";

describe("buildUserMessage", () => {
  const commandUnit = {
    type: "command",
    name: "gold",
    rootPath: "/src/commands/gold.ts",
    files: [
      { path: "/src/commands/gold.ts", rel: "gold.ts", content: "addCmd({ name: 'gold' })" },
    ],
  };

  const pluginUnit = {
    type: "plugin",
    name: "notes",
    rootPath: "/src/plugins/notes",
    files: [
      { path: "/src/plugins/notes/index.ts",    rel: "index.ts",    content: "export const plugin = ..." },
      { path: "/src/plugins/notes/commands.ts", rel: "commands.ts", content: "addCmd({...})" },
    ],
  };

  it("labels command units as 'Command file:'", () => {
    const msg = buildUserMessage(commandUnit);
    assert.ok(msg.includes("Command file: gold.ts"), "should include command header");
  });

  it("labels plugin units as 'Plugin:'", () => {
    const msg = buildUserMessage(pluginUnit);
    assert.ok(msg.includes("Plugin: notes"), "should include plugin header");
  });

  it("includes file content in fenced code blocks", () => {
    const msg = buildUserMessage(commandUnit);
    assert.ok(msg.includes("```typescript"), "should wrap content in typescript fence");
    assert.ok(msg.includes("addCmd({ name: 'gold' })"), "should include file content");
  });

  it("includes all files for a plugin unit", () => {
    const msg = buildUserMessage(pluginUnit);
    assert.ok(msg.includes("index.ts"),    "should include index.ts");
    assert.ok(msg.includes("commands.ts"), "should include commands.ts");
    assert.ok(msg.includes("export const plugin"), "should include index.ts content");
    assert.ok(msg.includes("addCmd({...})"),        "should include commands.ts content");
  });

  it("includes Stage 5 documentation instruction", () => {
    const msg = buildUserMessage(commandUnit);
    assert.ok(msg.includes("Stage 5 documentation"), "should mention Stage 5");
  });
});

describe("HELP constant", () => {
  it("is a non-empty string", () => {
    assert.ok(typeof HELP === "string" && HELP.trim().length > 0);
  });

  it("mentions --dry-run", () => {
    assert.ok(HELP.includes("--dry-run"));
  });
});
