/**
 * Unit tests for lib/prompts.js
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { extract, systemPrompt } from "../../lib/prompts.js";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_SKILL = `---
name: test
---

## Stage 0 — Design

Design content here.

## Stage 1 — Generate

Generate content here.

## Stage 5 — Docs

Docs content here.
Some extra lines.
`;

let tmpDir;
let skillPath;

// Create a temp SKILL.md for tests that need isolation
function makeTmpSkill(content) {
  tmpDir = mkdtempSync(join(tmpdir(), "prompts-test-"));
  skillPath = join(tmpDir, "SKILL.md");
  writeFileSync(skillPath, content, "utf8");
  return skillPath;
}

function cleanTmp() {
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  tmpDir = null;
  skillPath = null;
}

// ── extract() ─────────────────────────────────────────────────────────────────

describe("extract", () => {
  it("returns the correct stage section text", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = extract(0, path);
      assert.ok(result.includes("Design content here."), "should include stage 0 content");
      assert.ok(result.startsWith("## Stage 0"), "should start with the stage heading");
    } finally { cleanTmp(); }
  });

  it("stops at the next stage heading", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = extract(0, path);
      assert.ok(!result.includes("Generate content here."), "should not bleed into stage 1");
    } finally { cleanTmp(); }
  });

  it("extracts a middle stage", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = extract(1, path);
      assert.ok(result.includes("Generate content here."));
      assert.ok(!result.includes("Design content here."));
    } finally { cleanTmp(); }
  });

  it("extracts the last stage (no following ## Stage)", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = extract(5, path);
      assert.ok(result.includes("Docs content here."));
      assert.ok(result.includes("Some extra lines."));
    } finally { cleanTmp(); }
  });

  it("trims the extracted section", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = extract(0, path);
      assert.equal(result, result.trim(), "result should be trimmed");
    } finally { cleanTmp(); }
  });

  it("throws when the requested stage does not exist", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      assert.throws(
        () => extract(99, path),
        /stage 99 not found/i
      );
    } finally { cleanTmp(); }
  });

  it("works against the real SKILL.md (stage 5 exists)", () => {
    // Uses default SKILL_PATH — no override
    assert.doesNotThrow(() => {
      const result = extract(5);
      assert.ok(result.length > 0, "stage 5 should have content");
    });
  });
});

// ── systemPrompt() ────────────────────────────────────────────────────────────

describe("systemPrompt", () => {
  it("prepends the LLM role preamble before the stage text", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = systemPrompt(0, path);
      assert.ok(result.includes("You are an expert UrsaMU developer"), "must include role line");
      assert.ok(result.includes("Design content here."), "must include stage content");
    } finally { cleanTmp(); }
  });

  it("includes the no-commentary instruction", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      const result = systemPrompt(0, path);
      assert.ok(result.includes("no additional commentary"), "must instruct no commentary");
    } finally { cleanTmp(); }
  });

  it("throws when the stage does not exist", () => {
    const path = makeTmpSkill(MOCK_SKILL);
    try {
      assert.throws(() => systemPrompt(99, path), /stage 99 not found/i);
    } finally { cleanTmp(); }
  });
});
