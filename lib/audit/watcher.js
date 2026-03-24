/**
 * lib/audit/watcher.js
 *
 * Watch-mode utilities for ursamu-audit --watch.
 *
 * The diff helpers (violationKey, violationsToMap, diffViolations) are pure
 * functions so they can be unit-tested without any filesystem involvement.
 */

import { watch } from "fs";
import { relative } from "path";

// ── Pure diff helpers ─────────────────────────────────────────────────────────

/**
 * Stable string key for a violation — used to detect add/resolve transitions.
 *
 * @param {import("./checks.js").Violation} v
 * @returns {string}
 */
export function violationKey(v) {
  return `${v.file}:${v.line}:${v.check}`;
}

/**
 * Convert a violations array to a Map keyed by violationKey.
 *
 * @param {import("./checks.js").Violation[]} violations
 * @returns {Map<string, import("./checks.js").Violation>}
 */
export function violationsToMap(violations) {
  const m = new Map();
  for (const v of violations) m.set(violationKey(v), v);
  return m;
}

/**
 * Compute which violations were added or resolved between two scan results.
 *
 * @param {Map<string, import("./checks.js").Violation>} prev
 * @param {Map<string, import("./checks.js").Violation>} next
 * @returns {{ added: import("./checks.js").Violation[], resolved: import("./checks.js").Violation[] }}
 */
export function diffViolations(prev, next) {
  const added = [];
  const resolved = [];
  for (const [key, v] of next) {
    if (!prev.has(key)) added.push(v);
  }
  for (const [key, v] of prev) {
    if (!next.has(key)) resolved.push(v);
  }
  return { added, resolved };
}

// ── Watch loop ────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300;

/**
 * Start watch mode.  Runs an initial audit, then watches scanPath for changes
 * and re-runs on every .ts/.js modification.  Prints a compact diff each time.
 *
 * @param {string} scanPath - directory to watch (same as the audit scan path)
 * @param {(path: string) => { violations: import("./checks.js").Violation[], fileCount: number }} auditFn
 * @param {object} [opts]
 * @param {boolean} [opts.noHints]
 * @param {(msg: string) => void} [opts.out] - output function (default: process.stdout.write)
 * @param {(msg: string) => void} [opts.err] - error function (default: process.stderr.write)
 */
export function startWatch(scanPath, auditFn, opts = {}) {
  const out = opts.out ?? (msg => process.stdout.write(msg));
  const err = opts.err ?? (msg => process.stderr.write(msg));

  // Initial run
  let result;
  try {
    result = auditFn(scanPath);
  } catch (e) {
    err(`Error: ${e.message}\n`);
    process.exit(2);
  }

  let prevMap = violationsToMap(result.violations);

  // Print initial summary
  const initialCount = [...prevMap.values()].filter(
    v => v.level === "error" || v.level === "warn"
  ).length;
  out(`\nUrsaMU Audit — ${result.fileCount} file(s) scanned\n`);
  if (initialCount === 0) {
    out("Clean — no errors or warnings.\n");
  } else {
    out(`${initialCount} violation(s) found on startup.\n`);
  }
  out(`\nWatching ${scanPath} for changes… (Ctrl+C to stop)\n`);

  let debounce = null;

  let watcher;
  try {
    watcher = watch(scanPath, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (!filename.endsWith(".ts") && !filename.endsWith(".js")) return;

      clearTimeout(debounce);
      debounce = setTimeout(() => {
        let next;
        try {
          next = auditFn(scanPath);
        } catch (e) {
          err(`\nError during re-scan: ${e.message}\n`);
          return;
        }

        const nextMap  = violationsToMap(next.violations);
        const { added, resolved } = diffViolations(prevMap, nextMap);
        prevMap = nextMap;

        const ts = new Date().toLocaleTimeString();
        out(`\n[${ts}] ${filename} changed — ${next.fileCount} file(s)\n`);

        if (added.length === 0 && resolved.length === 0) {
          out("  No change in violations.\n");
        } else {
          for (const v of added) {
            const rel = relative(process.cwd(), v.file);
            out(`  + ${v.level.toUpperCase().padEnd(5)} [${v.check}] ${rel}:${v.line} — ${v.message}\n`);
          }
          for (const v of resolved) {
            const rel = relative(process.cwd(), v.file);
            out(`  ✓ resolved [${v.check}] ${rel}:${v.line}\n`);
          }
        }

        const remaining = [...nextMap.values()].filter(
          v => v.level === "error" || v.level === "warn"
        ).length;
        if (remaining === 0) {
          out("Clean — no errors or warnings.\n");
        } else {
          out(`${remaining} violation(s) remaining.\n`);
        }
      }, DEBOUNCE_MS);
    });
  } catch (e) {
    err(`Watch mode unavailable: ${e.message}\n`);
    err("Note: recursive watch requires Node 20+ on Linux.\n");
    process.exit(2);
  }

  // Keep process alive
  process.on("SIGINT", () => {
    watcher.close();
    out("\nWatch stopped.\n");
    process.exit(0);
  });
}
