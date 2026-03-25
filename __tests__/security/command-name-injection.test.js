/**
 * EXPLOIT TEST — M-1: commandBlockTemplate command-name injection
 *
 * Vulnerability: lib/scaffold/templates.js commandBlockTemplate() embeds
 * `commandName` directly into the generated TypeScript string literal:
 *
 *   name: "${commandName}",
 *
 * Without an input whitelist, a crafted name like  +foo"bar  breaks out of
 * the string literal and can inject arbitrary TypeScript into the scaffold.
 *
 * Attack vector: programmatic call or future API consumer bypasses the CLI
 * layer (bin/scaffold.js) where upstream validation currently lives.
 *
 * Fix: add a whitelist regex guard inside commandBlockTemplate() itself so
 * the function is safe regardless of how it is invoked.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { commandBlockTemplate } from "../../lib/scaffold/templates.js";

// ── exploit cases ─────────────────────────────────────────────────────────────

describe("[Security] M-1: commandBlockTemplate rejects injected command names", () => {
  it("[Red] double-quote breakout  +foo\"bar  is rejected", () => {
    assert.throws(
      () => commandBlockTemplate('+foo"bar'),
      /invalid.*command|command.*invalid/i,
      "double-quote inside name must be rejected"
    );
  });

  it("[Red] backtick injection  +foo`bar  is rejected", () => {
    assert.throws(
      () => commandBlockTemplate("+foo`bar"),
      /invalid.*command|command.*invalid/i,
      "backtick inside name must be rejected"
    );
  });

  it("[Red] newline injection is rejected", () => {
    assert.throws(
      () => commandBlockTemplate("+foo\nbar"),
      /invalid.*command|command.*invalid/i,
      "newline inside name must be rejected"
    );
  });

  it("[Red] semicolon injection  +foo;evil  is rejected", () => {
    assert.throws(
      () => commandBlockTemplate("+foo;evil"),
      /invalid.*command|command.*invalid/i,
      "semicolon inside name must be rejected"
    );
  });

  it("[Red] uppercase is rejected (would silently differ from validated CLI path)", () => {
    assert.throws(
      () => commandBlockTemplate("+BBS"),
      /invalid.*command|command.*invalid/i,
      "uppercase letters must be rejected"
    );
  });

  // ── safe inputs ─────────────────────────────────────────────────────────────

  it("[Safe] plain lowercase name is accepted", () => {
    assert.doesNotThrow(() => commandBlockTemplate("bbs"));
  });

  it("[Safe] +prefixed name is accepted", () => {
    assert.doesNotThrow(() => commandBlockTemplate("+bbs-post"));
  });

  it("[Safe] hyphenated name is accepted", () => {
    assert.doesNotThrow(() => commandBlockTemplate("+my-long-command-name"));
  });

  it("[Safe] name with digits is accepted", () => {
    assert.doesNotThrow(() => commandBlockTemplate("cmd2"));
  });
});
