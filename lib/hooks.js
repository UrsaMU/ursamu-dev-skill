/**
 * lib/hooks.js
 *
 * Installs (or patches) a git pre-commit hook that runs ursamu-audit
 * before every commit.
 *
 * Safe rules:
 *  - Never removes existing hook content; only appends when not already present.
 *  - Idempotent: calling installHook twice produces the same result as once.
 *  - Never writes outside the detected git root.
 */

import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync } from "fs";
import { join, resolve } from "path";

// Marker string used to detect whether the audit hook is already installed.
const HOOK_MARKER = "# ursamu-audit (added by @lhi/ursamu-dev)";

const HOOK_SNIPPET = `
${HOOK_MARKER}
npx ursamu-audit --no-hints
`;

const SHEBANG = "#!/bin/sh\n";

// ── Git root discovery ────────────────────────────────────────────────────────

/**
 * Walk upward from startDir looking for a directory that contains .git/.
 * Stops at the filesystem root.
 *
 * @param {string} startDir - absolute path to start searching from
 * @returns {string|null} - absolute path of the git root, or null if not found
 */
export function findGitRoot(startDir) {
  let dir = resolve(startDir);
  let prev = null;
  while (dir !== prev) {
    if (existsSync(join(dir, ".git"))) return dir;
    prev = dir;
    dir = resolve(join(dir, ".."));
  }
  return null;
}

// ── Hook installer ────────────────────────────────────────────────────────────

/**
 * @typedef {"created"|"patched"|"already-installed"|"no-git"} HookAction
 */

/**
 * Install or update the pre-commit hook.
 *
 * @param {object} [opts]
 * @param {string}  [opts.cwd]    - directory to search upward from (default: process.cwd())
 * @param {boolean} [opts.dryRun] - preview without writing (default: false)
 * @returns {{ action: HookAction, hookPath: string|null }}
 */
export function installHook(opts = {}) {
  const cwd    = opts.cwd    ?? process.cwd();
  const dryRun = opts.dryRun ?? false;

  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) {
    return { action: "no-git", hookPath: null };
  }

  const hooksDir = join(gitRoot, ".git", "hooks");
  const hookPath = join(hooksDir, "pre-commit");

  if (existsSync(hookPath)) {
    const existing = readFileSync(hookPath, "utf8");
    if (existing.includes(HOOK_MARKER)) {
      return { action: "already-installed", hookPath };
    }
    // Patch: append our snippet after the existing content
    if (!dryRun) {
      writeFileSync(hookPath, existing.trimEnd() + "\n" + HOOK_SNIPPET, "utf8");
      chmodSync(hookPath, 0o755);
    }
    return { action: "patched", hookPath };
  }

  // Create a fresh hook
  if (!dryRun) {
    mkdirSync(hooksDir, { recursive: true });
    writeFileSync(hookPath, SHEBANG + HOOK_SNIPPET, "utf8");
    chmodSync(hookPath, 0o755);
  }
  return { action: "created", hookPath };
}
