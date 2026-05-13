/**
 * Tests for lib/claude-hooks.js — install/uninstall the Claude Code
 * PreToolUse stage-gate hook entry in settings.json.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  installClaudeStageGate,
  uninstallClaudeStageGate,
  STAGE_GATE_MARKER,
} from "../../lib/claude-hooks.js";

function freshTmp() {
  const dir = mkdtempSync(join(tmpdir(), "ursamu-claude-hooks-"));
  return {
    dir,
    settingsPath: join(dir, ".claude", "settings.json"),
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}

function readJSON(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function writeJSON(p, obj) {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}

test("case 1: no settings.json — creates one with the entry", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    const r = installClaudeStageGate({ settingsPath });
    assert.equal(r.status, "installed");
    assert.ok(existsSync(settingsPath));
    const j = readJSON(settingsPath);
    assert.equal(j.hooks.PreToolUse.length, 1);
    assert.match(j.hooks.PreToolUse[0].hooks[0].command, /pretool-stage-gate\.sh/);
  } finally { cleanup(); }
});

test("case 2: empty {} — adds hooks.PreToolUse with our entry", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    writeJSON(settingsPath, {});
    const r = installClaudeStageGate({ settingsPath });
    assert.equal(r.status, "installed");
    const j = readJSON(settingsPath);
    assert.ok(Array.isArray(j.hooks.PreToolUse));
    assert.equal(j.hooks.PreToolUse.length, 1);
  } finally { cleanup(); }
});

test("case 3: preserves unrelated keys (theme, model)", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    writeJSON(settingsPath, { theme: "dark", model: "opus" });
    installClaudeStageGate({ settingsPath });
    const j = readJSON(settingsPath);
    assert.equal(j.theme, "dark");
    assert.equal(j.model, "opus");
    assert.equal(j.hooks.PreToolUse.length, 1);
  } finally { cleanup(); }
});

test("case 4: hooks.PreToolUse: [] — appends our entry", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    writeJSON(settingsPath, { hooks: { PreToolUse: [] } });
    installClaudeStageGate({ settingsPath });
    const j = readJSON(settingsPath);
    assert.equal(j.hooks.PreToolUse.length, 1);
    assert.ok(j.hooks.PreToolUse[0].hooks[0].command.includes(STAGE_GATE_MARKER));
  } finally { cleanup(); }
});

test("case 5: existing other PreToolUse matcher — leaves it, adds ours", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    const other = {
      matcher: "Bash",
      hooks: [{ type: "command", command: "echo hi", timeout: 2 }],
    };
    writeJSON(settingsPath, { hooks: { PreToolUse: [other] } });
    installClaudeStageGate({ settingsPath });
    const j = readJSON(settingsPath);
    assert.equal(j.hooks.PreToolUse.length, 2);
    assert.equal(j.hooks.PreToolUse[0].matcher, "Bash");
    assert.equal(j.hooks.PreToolUse[0].hooks[0].command, "echo hi");
    assert.ok(j.hooks.PreToolUse[1].hooks[0].command.includes(STAGE_GATE_MARKER));
  } finally { cleanup(); }
});

test("case 6: idempotent — second call returns already-present, settings unchanged", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    installClaudeStageGate({ settingsPath });
    const before = readFileSync(settingsPath, "utf8");
    const r = installClaudeStageGate({ settingsPath });
    assert.equal(r.status, "already-present");
    const after = readFileSync(settingsPath, "utf8");
    assert.equal(before, after);
  } finally { cleanup(); }
});

test("case 7: --dry-run does not touch disk", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    const r = installClaudeStageGate({ settingsPath, dryRun: true });
    assert.equal(r.status, "dry-run");
    assert.equal(existsSync(settingsPath), false);
  } finally { cleanup(); }
});

test("case 8: uninstall removes only our entry", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    const other = {
      matcher: "Bash",
      hooks: [{ type: "command", command: "echo hi", timeout: 2 }],
    };
    writeJSON(settingsPath, { hooks: { PreToolUse: [other] } });
    installClaudeStageGate({ settingsPath });
    const r = uninstallClaudeStageGate({ settingsPath });
    assert.equal(r.status, "uninstalled");
    const j = readJSON(settingsPath);
    assert.equal(j.hooks.PreToolUse.length, 1);
    assert.equal(j.hooks.PreToolUse[0].matcher, "Bash");
    // Second uninstall is a no-op.
    const r2 = uninstallClaudeStageGate({ settingsPath });
    assert.equal(r2.status, "not-present");
  } finally { cleanup(); }
});

test("case 9: corrupted settings.json — throws clear error, original untouched", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    mkdirSync(join(settingsPath, ".."), { recursive: true });
    const garbage = "{ this is :: not json";
    writeFileSync(settingsPath, garbage, "utf8");
    assert.throws(
      () => installClaudeStageGate({ settingsPath }),
      /Corrupted settings file/
    );
    assert.equal(readFileSync(settingsPath, "utf8"), garbage);
  } finally { cleanup(); }
});

test("case 10: .bak is created on first modify of an existing file", () => {
  const { settingsPath, cleanup } = freshTmp();
  try {
    writeJSON(settingsPath, { theme: "dark" });
    installClaudeStageGate({ settingsPath });
    assert.ok(existsSync(settingsPath + ".bak"), ".bak file should exist");
    const bakContents = readFileSync(settingsPath + ".bak", "utf8");
    assert.match(bakContents, /"theme"\s*:\s*"dark"/);
  } finally { cleanup(); }
});
