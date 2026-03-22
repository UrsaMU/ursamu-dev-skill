/**
 * EXPLOIT TEST — CODEX_HOME Path Traversal
 *
 * Vulnerability: bin/cli.js:23-25 reads process.env.CODEX_HOME without
 * validation and passes it directly to path.join(), allowing an attacker
 * who controls the environment to redirect file writes outside $HOME.
 *
 * This test proves the fix is in place by verifying that resolveCodexHome()
 * rejects any CODEX_HOME value that resolves outside $HOME.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { join, resolve } from "node:path";
import { resolveCodexHome } from "../../bin/cli.js";

const FAKE_HOME = "/Users/testuser";

// ── exploit cases ────────────────────────────────────────────────────────────

test("[PathTraversal] CODEX_HOME set to /etc is rejected", () => {
  const result = resolveCodexHome("/etc", FAKE_HOME);
  assert.ok(
    result.startsWith(FAKE_HOME),
    `UNSAFE: resolved to ${result} which is outside ${FAKE_HOME}`
  );
});

test("[PathTraversal] CODEX_HOME with traversal sequence is rejected", () => {
  const malicious = "/Users/testuser/../../../../etc";
  const result = resolveCodexHome(malicious, FAKE_HOME);
  const resolved = resolve(result);
  assert.ok(
    resolved.startsWith(FAKE_HOME),
    `UNSAFE: traversal escaped HOME — resolved to ${resolved}`
  );
});

test("[PathTraversal] CODEX_HOME set to /tmp/evil is rejected", () => {
  const result = resolveCodexHome("/tmp/evil", FAKE_HOME);
  assert.ok(
    result.startsWith(FAKE_HOME),
    `UNSAFE: resolved to ${result} which is outside ${FAKE_HOME}`
  );
});

test("[PathTraversal] empty CODEX_HOME falls back to default", () => {
  const result = resolveCodexHome("", FAKE_HOME);
  assert.strictEqual(result, join(FAKE_HOME, ".codex", "skills"));
});

test("[PathTraversal] undefined CODEX_HOME falls back to default", () => {
  const result = resolveCodexHome(undefined, FAKE_HOME);
  assert.strictEqual(result, join(FAKE_HOME, ".codex", "skills"));
});

// ── safe cases ────────────────────────────────────────────────────────────────

test("[Safe] CODEX_HOME inside HOME is accepted", () => {
  const valid = "/Users/testuser/custom-codex";
  const result = resolveCodexHome(valid, FAKE_HOME);
  assert.strictEqual(result, join(valid, "skills"));
});

test("[Safe] CODEX_HOME deep inside HOME is accepted", () => {
  const valid = "/Users/testuser/.config/codex";
  const result = resolveCodexHome(valid, FAKE_HOME);
  assert.strictEqual(result, join(valid, "skills"));
});
