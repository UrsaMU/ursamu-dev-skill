/**
 * Unit tests for lib/audit/checks.js
 * Each check is tested with a known-good input (expect []) and a known-bad
 * input (expect exactly one violation with correct check ID and level).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  checkAtomicDbWrites,
  checkSandboxSafety,
  checkImportPath,
  checkHelpText,
  checkPluginPhaseDiscipline,
  checkGameHooksPairing,
  checkDboNamespace,
  checkRestAuthGuard,
  checkInitReturnsTrue,
  checkInputSanitization,
  checkTargetNullGuard,
} from "../../lib/audit/checks.js";

const FILE = "/fake/project/src/plugins/test/index.ts";
const SCRIPTS_FILE = "/fake/project/system/scripts/test.ts";

function lines(src) { return src.split("\n"); }

// ── check-03 — Atomic DB writes ──────────────────────────────────────────────

describe("check-03 checkAtomicDbWrites", () => {
  it("passes for valid $set op", () => {
    const v = checkAtomicDbWrites(lines(`await u.db.modify(id, "$set", { x: 1 });`), FILE);
    assert.equal(v.length, 0);
  });

  it("passes for valid $inc op", () => {
    const v = checkAtomicDbWrites(lines(`await u.db.modify(id, "$inc", { score: 1 });`), FILE);
    assert.equal(v.length, 0);
  });

  it("fails for $push op", () => {
    const v = checkAtomicDbWrites(lines(`await u.db.modify(id, "$push", { items: x });`), FILE);
    assert.equal(v.length, 1);
    assert.equal(v[0].check, "check-03");
    assert.equal(v[0].level, "error");
  });

  it("fails for $pull op", () => {
    const v = checkAtomicDbWrites(lines(`await u.db.modify(id, "$pull", { items: x });`), FILE);
    assert.equal(v.length, 1);
    assert.equal(v[0].check, "check-03");
  });

  it("does not flag non-db modify calls", () => {
    const v = checkAtomicDbWrites(lines(`someOtherLib.modify("$push", {});`), FILE);
    // "someOtherLib.modify" won't match DB_MODIFY_RE (requires .db.modify)
    assert.equal(v.length, 0);
  });
});

// ── check-06 — Sandbox safety ────────────────────────────────────────────────

describe("check-06 checkSandboxSafety", () => {
  it("ignores non-scripts/ files", () => {
    const v = checkSandboxSafety(lines(`Deno.readFile("x");`), FILE);
    assert.equal(v.length, 0);
  });

  it("passes for clean script", () => {
    const v = checkSandboxSafety(lines(`u.send("hello");`), SCRIPTS_FILE);
    assert.equal(v.length, 0);
  });

  it("fails for Deno. usage in system/scripts/", () => {
    const v = checkSandboxSafety(lines(`Deno.readFile("x");`), SCRIPTS_FILE);
    assert.equal(v.length, 1);
    assert.equal(v[0].check, "check-06");
    assert.equal(v[0].level, "error");
  });

  it("fails for fetch() in system/scripts/", () => {
    const v = checkSandboxSafety(lines(`const r = await fetch("https://example.com");`), SCRIPTS_FILE);
    assert.equal(v.length, 1);
    assert.equal(v[0].check, "check-06");
  });

  it("does not flag commented-out Deno usage", () => {
    const v = checkSandboxSafety(lines(`// Deno.readFile("x");`), SCRIPTS_FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-09 — Import path ───────────────────────────────────────────────────

describe("check-09 checkImportPath", () => {
  it("passes for jsr: prefixed import", () => {
    const v = checkImportPath(lines(`import { addCmd } from "jsr:@ursamu/ursamu";`), FILE);
    assert.equal(v.length, 0);
  });

  it("fails for missing jsr: prefix", () => {
    const v = checkImportPath(lines(`import { addCmd } from "@ursamu/ursamu";`), FILE);
    assert.equal(v.length, 1);
    assert.equal(v[0].check, "check-09");
    assert.equal(v[0].level, "warn");
  });
});

// ── check-10 — Help text ─────────────────────────────────────────────────────

describe("check-10 checkHelpText", () => {
  it("passes for addCmd with help and Examples", () => {
    const src = `addCmd({
  name: "+test",
  pattern: /^\\+test/i,
  lock: "connected",
  category: "Test",
  help: \`+test  — Does thing.

Examples:
  +test foo  Does foo.
  +test bar  Does bar.\`,
  exec: async (u) => {},
});`;
    const v = checkHelpText(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("fails for addCmd missing help:", () => {
    const src = `addCmd({
  name: "+noh",
  pattern: /^\\+noh/i,
  lock: "connected",
  exec: async (u) => {},
});`;
    const v = checkHelpText(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-10" && x.level === "error"));
  });

  it("warns for addCmd with help but no Examples", () => {
    const src = `addCmd({
  name: "+noex",
  pattern: /^\\+noex/i,
  lock: "connected",
  help: \`+noex  — Does thing.\`,
  exec: async (u) => {},
});`;
    const v = checkHelpText(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-10" && x.level === "warn"));
  });

  it("returns empty for files with no addCmd", () => {
    const v = checkHelpText(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-11 — Plugin phase discipline ──────────────────────────────────────

describe("check-11 checkPluginPhaseDiscipline", () => {
  it("passes when addCmd is outside init()", () => {
    const src = `addCmd({ name: "+x" });
export const plugin = {
  init: () => { return true; },
  remove: () => {},
};`;
    const v = checkPluginPhaseDiscipline(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("fails when addCmd is inside init()", () => {
    const src = `export const plugin = {
  init: () => {
    addCmd({ name: "+x" });
    return true;
  },
  remove: () => {},
};`;
    const v = checkPluginPhaseDiscipline(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-11" && x.level === "error"));
  });

  it("returns empty for files with no init:", () => {
    const v = checkPluginPhaseDiscipline(lines(`addCmd({ name: "+x" });`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-12 — gameHooks pairing ─────────────────────────────────────────────

describe("check-12 checkGameHooksPairing", () => {
  it("passes for correctly paired on/off", () => {
    const src = `const onLogin = () => {};
export const plugin = {
  init: () => { gameHooks.on("player:login", onLogin); return true; },
  remove: () => { gameHooks.off("player:login", onLogin); },
};`;
    const v = checkGameHooksPairing(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("fails when on() has no matching off()", () => {
    const src = `const onLogin = () => {};
export const plugin = {
  init: () => { gameHooks.on("player:login", onLogin); return true; },
  remove: () => { },
};`;
    const v = checkGameHooksPairing(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-12" && x.level === "error"));
  });

  it("fails when off() uses different handler name", () => {
    const src = `const onLogin = () => {};
const otherFn = () => {};
export const plugin = {
  init: () => { gameHooks.on("player:login", onLogin); return true; },
  remove: () => { gameHooks.off("player:login", otherFn); },
};`;
    const v = checkGameHooksPairing(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-12"));
  });

  it("returns empty for files with no init:", () => {
    const v = checkGameHooksPairing(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-13 — DBO namespace ─────────────────────────────────────────────────

describe("check-13 checkDboNamespace", () => {
  it("passes for namespaced collection", () => {
    const v = checkDboNamespace(lines(`const r = new DBO<IRecord>("notes.records");`), FILE);
    assert.equal(v.length, 0);
  });

  it("fails for un-namespaced collection", () => {
    const v = checkDboNamespace(lines(`const r = new DBO<IRecord>("records");`), FILE);
    assert.ok(v.some(x => x.check === "check-13" && x.level === "error"));
  });

  it("passes for DBO with generic and namespaced name", () => {
    const v = checkDboNamespace(lines(`const r = new DBO<IPost>("blog.posts");`), FILE);
    assert.equal(v.length, 0);
  });

  it("returns empty when no DBO instantiation", () => {
    const v = checkDboNamespace(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-14 — REST auth guard ───────────────────────────────────────────────

describe("check-14 checkRestAuthGuard", () => {
  it("passes when userId is checked first", () => {
    const src = `registerPluginRoute("/api/v1/test", async (req, userId) => {
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ ok: true });
});`;
    const v = checkRestAuthGuard(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("fails when there is no userId check", () => {
    const src = `registerPluginRoute("/api/v1/test", async (req, userId) => {
  return Response.json({ ok: true });
});`;
    const v = checkRestAuthGuard(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-14" && x.level === "error"));
  });

  it("returns empty when no registerPluginRoute", () => {
    const v = checkRestAuthGuard(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-15 — init() returns true ───────────────────────────────────────────

describe("check-15 checkInitReturnsTrue", () => {
  it("passes when init returns true", () => {
    const src = `export const plugin = {
  init: () => { gameHooks.on("x", fn); return true; },
  remove: () => {},
};`;
    const v = checkInitReturnsTrue(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("fails when init does not return true", () => {
    const src = `export const plugin = {
  init: () => {
    // forgot return
  },
  remove: () => {},
};`;
    const v = checkInitReturnsTrue(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-15" && x.level === "error"));
  });

  it("returns empty when no init:", () => {
    const v = checkInitReturnsTrue(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-01 — Input sanitization ────────────────────────────────────────────

describe("check-01 checkInputSanitization", () => {
  it("passes when stripSubs is called before db.modify", () => {
    const src = `addCmd({ exec: async (u) => {
  const arg = u.util.stripSubs(u.cmd.args[0]);
  await u.db.modify(id, "$set", { x: arg });
} });`;
    const v = checkInputSanitization(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("warns when db.modify present but no stripSubs", () => {
    const src = `addCmd({ exec: async (u) => {
  const arg = u.cmd.args[0];
  await u.db.modify(id, "$set", { x: arg });
} });`;
    const v = checkInputSanitization(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-01" && x.level === "warn"));
  });

  it("returns empty when no exec block", () => {
    const v = checkInputSanitization(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});

// ── check-04 — Null guard on util.target() ───────────────────────────────────

describe("check-04 checkTargetNullGuard", () => {
  it("passes when null guard is present after util.target()", () => {
    const src = `addCmd({ exec: async (u) => {
  const target = await u.util.target(u.me, arg, true);
  if (!target) { u.send("Not found."); return; }
  u.send(target.name);
} });`;
    const v = checkTargetNullGuard(lines(src), FILE);
    assert.equal(v.length, 0);
  });

  it("hints when util.target() is used without null guard", () => {
    const src = `addCmd({ exec: async (u) => {
  const target = await u.util.target(u.me, arg, true);
  u.send(target.name);
} });`;
    const v = checkTargetNullGuard(lines(src), FILE);
    assert.ok(v.some(x => x.check === "check-04" && x.level === "hint"));
  });

  it("returns empty when no exec block", () => {
    const v = checkTargetNullGuard(lines(`const x = 1;`), FILE);
    assert.equal(v.length, 0);
  });
});
