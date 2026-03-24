/**
 * Unit tests for lib/scaffold/templates.js
 * Verifies that each template output contains all required structural elements.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  indexTemplate,
  commandsTemplate,
  routesTemplate,
  testTemplate,
  mockUTemplate,
  readmeTemplate,
} from "../../lib/scaffold/templates.js";

// ── indexTemplate ─────────────────────────────────────────────────────────────

describe("indexTemplate", () => {
  it("exports a plugin object", () => {
    const out = indexTemplate("greeter");
    assert.ok(out.includes("export const plugin"), "must export plugin");
  });

  it("init returns true", () => {
    const out = indexTemplate("greeter");
    assert.ok(out.includes("return true"), "init must return true");
  });

  it("has remove() stub", () => {
    const out = indexTemplate("greeter");
    assert.ok(out.includes("remove:"), "must have remove:");
  });

  it("includes plugin name", () => {
    const out = indexTemplate("greeter");
    assert.ok(out.includes('"greeter"'), "must include plugin name string");
  });

  it("uses jsr:@ursamu/ursamu import", () => {
    const out = indexTemplate("greeter");
    assert.ok(out.includes("jsr:@ursamu/ursamu"), "must use jsr: prefix");
  });

  it("no registerPluginRoute by default", () => {
    const out = indexTemplate("greeter");
    assert.ok(!out.includes("registerPluginRoute"), "should not include routes without flag");
  });

  it("includes registerPluginRoute with --with-routes", () => {
    const out = indexTemplate("greeter", { withRoutes: true });
    assert.ok(out.includes("registerPluginRoute"), "must include route registration");
  });
});

// ── commandsTemplate ──────────────────────────────────────────────────────────

describe("commandsTemplate", () => {
  it("calls addCmd", () => {
    const out = commandsTemplate("mail");
    assert.ok(out.includes("addCmd("), "must call addCmd");
  });

  it("has help: field", () => {
    const out = commandsTemplate("mail");
    assert.ok(out.includes("help:"), "must have help:");
  });

  it("help contains Examples section", () => {
    const out = commandsTemplate("mail");
    assert.ok(out.includes("Examples"), "help must contain Examples");
  });

  it("uses stripSubs in exec", () => {
    const out = commandsTemplate("mail");
    assert.ok(out.includes("stripSubs"), "exec must call stripSubs");
  });

  it("does not call addCmd inside any init block", () => {
    const out = commandsTemplate("mail");
    // No init: should appear in commands.ts at all
    assert.ok(!out.includes("init:"), "commands.ts should not have init:");
  });

  it("uses jsr:@ursamu/ursamu import", () => {
    const out = commandsTemplate("mail");
    assert.ok(out.includes("jsr:@ursamu/ursamu"), "must use jsr: prefix");
  });
});

// ── routesTemplate ────────────────────────────────────────────────────────────

describe("routesTemplate", () => {
  it("exports routeHandler function", () => {
    const out = routesTemplate("bbs");
    assert.ok(out.includes("export async function routeHandler"), "must export routeHandler");
  });

  it("checks if (!userId) before logic", () => {
    const out = routesTemplate("bbs");
    const authIdx  = out.indexOf("if (!userId)");
    const logicIdx = out.indexOf("Response.json({ ok: true");
    assert.ok(authIdx !== -1, "must contain if (!userId)");
    assert.ok(authIdx < logicIdx, "auth check must come before successful response");
  });

  it("returns 401 for missing userId", () => {
    const out = routesTemplate("bbs");
    assert.ok(out.includes("401"), "must return 401 for unauthorized");
  });

  it("includes plugin name in route path comment", () => {
    const out = routesTemplate("bbs");
    assert.ok(out.includes("bbs"), "should reference plugin name");
  });
});

// ── testTemplate ──────────────────────────────────────────────────────────────

describe("testTemplate", () => {
  it("imports mockU", () => {
    const out = testTemplate("notes");
    assert.ok(out.includes("mockU"), "must import mockU");
  });

  it("imports from Deno std assert", () => {
    const out = testTemplate("notes");
    assert.ok(out.includes("jsr:@std/assert"), "must use Deno std assert");
  });

  it("includes describe block for the command", () => {
    const out = testTemplate("notes");
    assert.ok(out.includes("describe("), "must have describe block");
  });

  it("includes happy path test case", () => {
    const out = testTemplate("notes");
    assert.ok(out.includes("happy path"), "must have happy path test");
  });

  it("includes null target test case", () => {
    const out = testTemplate("notes");
    assert.ok(out.includes("null target") || out.includes("targetResult: null"), "must have null target test");
  });

  it("includes permission denied test case", () => {
    const out = testTemplate("notes");
    assert.ok(out.includes("permission denied") || out.includes("canEditResult: false"), "must have permission denied test");
  });
});

// ── mockUTemplate ─────────────────────────────────────────────────────────────

describe("mockUTemplate", () => {
  it("exports mockU function", () => {
    const out = mockUTemplate();
    assert.ok(out.includes("export function mockU"), "must export mockU");
  });

  it("exports mockPlayer function", () => {
    const out = mockUTemplate();
    assert.ok(out.includes("export function mockPlayer"), "must export mockPlayer");
  });

  it("tracks _sent messages", () => {
    const out = mockUTemplate();
    assert.ok(out.includes("_sent"), "must have _sent tracking");
  });

  it("tracks _dbCalls", () => {
    const out = mockUTemplate();
    assert.ok(out.includes("_dbCalls"), "must have _dbCalls tracking");
  });

  it("includes stripSubs implementation", () => {
    const out = mockUTemplate();
    assert.ok(out.includes("stripSubs"), "must include stripSubs mock");
  });

  it("includes canEdit mock", () => {
    const out = mockUTemplate();
    assert.ok(out.includes("canEdit"), "must include canEdit mock");
  });
});

// ── readmeTemplate ────────────────────────────────────────────────────────────

describe("readmeTemplate", () => {
  it("has Commands section", () => {
    const out = readmeTemplate("bbs");
    assert.ok(out.includes("## Commands"), "must have Commands section");
  });

  it("has Events section", () => {
    const out = readmeTemplate("bbs");
    assert.ok(out.includes("## Events"), "must have Events section");
  });

  it("has Storage section", () => {
    const out = readmeTemplate("bbs");
    assert.ok(out.includes("## Storage"), "must have Storage section");
  });

  it("has REST Routes section", () => {
    const out = readmeTemplate("bbs");
    assert.ok(out.includes("## REST Routes"), "must have REST Routes section");
  });

  it("includes plugin name in title", () => {
    const out = readmeTemplate("bbs");
    assert.ok(out.includes("Bbs") || out.includes("bbs"), "must reference plugin name");
  });

  it("includes route details with --with-routes", () => {
    const out = readmeTemplate("bbs", { withRoutes: true });
    assert.ok(out.includes("/api/v1/bbs"), "must include route path with withRoutes");
  });
});
