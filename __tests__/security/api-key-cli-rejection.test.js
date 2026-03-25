/**
 * EXPLOIT TEST — L-1: --api-key flag surfaces secret on CLI
 *
 * Vulnerability: bin/docs.js parseArgs() accepts --api-key <value> and only
 * emits a stderr warning.  Any key passed on the command line is visible in:
 *   - shell history  (bash/zsh .history files)
 *   - `ps aux` / /proc/<pid>/cmdline on Linux
 *   - CI log output if the command is echoed
 *
 * Fix: hard-reject --api-key on the command line and require the caller to
 * set the provider environment variable instead.  This eliminates the
 * attack surface entirely.
 *
 * Before the fix: parseArgs(["--api-key", "sk-test"]) returns opts.apiKey
 * After the fix:  parseArgs(["--api-key", "sk-test"]) throws with a message
 *                 directing the user to the env var.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../../bin/docs.js";

describe("[Security] L-1: --api-key is rejected on the command line", () => {
  it("[Red] --api-key with a value throws and directs to env var", () => {
    assert.throws(
      () => parseArgs(["node", "docs.js", "--api-key", "sk-live-secret"]),
      /environment variable|env var|ANTHROPIC_API_KEY|OPENAI_API_KEY/i,
      "--api-key on CLI must be hard-rejected with an env-var hint"
    );
  });

  it("[Red] --api-key with any value is always rejected", () => {
    assert.throws(
      () => parseArgs(["node", "docs.js", "--stage", "5", "--api-key", "anything"]),
      /environment variable|env var/i
    );
  });

  it("[Safe] omitting --api-key entirely is accepted", () => {
    assert.doesNotThrow(
      () => parseArgs(["node", "docs.js", "--stage", "5"])
    );
  });

  it("[Safe] other flags still work normally without --api-key", () => {
    const opts = parseArgs(["node", "docs.js", "--stage", "3", "--src", "./src"]);
    assert.strictEqual(opts.stage, 3);
    assert.strictEqual(opts.src, "./src");
    assert.strictEqual(opts.apiKey, null);
  });
});
