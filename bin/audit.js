#!/usr/bin/env node

/**
 * bin/audit.js — UrsaMU static audit CLI
 *
 * Scans TypeScript/JavaScript source files for violations of the 15 UrsaMU
 * Stage 2 audit invariants. No LLM required — pure static analysis.
 *
 * Usage:
 *   ursamu-audit [path] [options]
 *
 * Arguments:
 *   path          Directory to scan (default: ./src)
 *
 * Options:
 *   --fix         Auto-repair fixable violations (check-09, check-15)
 *   --watch       Watch for file changes and re-run on save
 *   --json        Output machine-readable JSON (incompatible with --fix/--watch)
 *   --no-hints    Suppress HINT-level findings
 *   --help        Show this help
 *
 * Exit codes:
 *   0   No errors or warnings
 *   1   One or more errors or warnings found
 *   2   Fatal error (bad path, not a directory, etc.)
 */

import { realpathSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, relative } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const isMain = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(__filename); }
  catch { return false; }
})();

import { runAudit } from "../lib/audit/runner.js";
import { formatReport, exitCode } from "../lib/audit/reporter.js";
import { fixFile, classifyViolations } from "../lib/audit/fixer.js";
import { startWatch } from "../lib/audit/watcher.js";

// ── Arg parsing ──────────────────────────────────────────────────────────────

/**
 * @param {string[]} argv
 * @returns {{ path: string, json: boolean, noHints: boolean, fix: boolean, watch: boolean, help: boolean }}
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    path:    "./src",
    json:    false,
    noHints: false,
    fix:     false,
    watch:   false,
    help:    false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case "--json":       opts.json    = true;  break;
      case "--no-hints":   opts.noHints = true;  break;
      case "--fix":        opts.fix     = true;  break;
      case "--watch":      opts.watch   = true;  break;
      case "--help":
      case "-h":           opts.help    = true;  break;
      default:
        if (a.startsWith("--")) {
          process.stderr.write(`Unknown option: ${a}\n`);
          process.exit(2);
        }
        opts.path = a;
    }
  }

  return opts;
}

// ── Help text ────────────────────────────────────────────────────────────────

const HELP = `
@lhi/ursamu-dev audit — UrsaMU static audit

  ursamu-audit [path] [options]

Arguments:
  path          Directory to scan for .ts/.js files (default: ./src)

Options:
  --fix         Auto-repair fixable violations in-place:
                  check-09  adds missing jsr: import prefix
                  check-15  inserts return true; into init()
                Structural violations still require manual fixes.
  --watch       Watch src directory and re-run audit on every save.
                Prints a compact diff of added/resolved violations.
  --json        Output machine-readable JSON
  --no-hints    Suppress HINT-level findings (hints do not affect exit code)
  --help        Show this help

Checks performed (no LLM required):
  check-01  Input sanitization   — stripSubs() before DB writes [warn]
  check-03  Atomic DB writes     — only $set/$inc/$unset as op   [error]
  check-04  Null guard           — util.target() result guarded  [hint]
  check-06  Sandbox safety       — no Deno/fetch in scripts/     [error]
  check-09  Import path          — jsr: prefix on @ursamu pkg    [warn]  ✓ fixable
  check-10  Help text            — every addCmd has help+Examples [error/warn]
  check-11  Phase discipline     — no addCmd() inside init()     [error]
  check-12  gameHooks pairing    — every on() has off() in remove [error]
  check-13  DBO namespace        — collection names prefixed     [error]
  check-14  REST auth guard      — if (!userId) → 401 first      [error]
  check-15  init() return        — init() returns true           [error]  ✓ fixable

Exit codes:
  0   Clean (no errors or warnings)
  1   Violations found
  2   Fatal error

Examples:
  ursamu-audit                   Scan ./src
  ursamu-audit src/plugins/bbs   Scan one plugin
  ursamu-audit --fix             Auto-repair check-09 and check-15
  ursamu-audit --watch           Re-run on every file save
  ursamu-audit --json            Machine-readable output for CI
`;

// ── Fix mode ──────────────────────────────────────────────────────────────────

function runFixMode(scanPath, opts) {
  let result;
  try {
    result = runAudit(scanPath);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(2);
  }

  const { violations, fileCount } = result;

  // Group violations by file
  const byFile = new Map();
  for (const v of violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file).push(v);
  }

  // Check if anything is fixable
  const allFixable = violations.filter(v => ["check-09", "check-15"].includes(v.check));
  if (allFixable.length === 0) {
    process.stdout.write("\nUrsaMU Audit — nothing to auto-fix.\n");
    process.stdout.write(formatReport(violations, fileCount, { noHints: opts.noHints }));
    process.exit(exitCode(violations));
  }

  process.stdout.write(`\nUrsaMU Audit — auto-fixing ${fileCount} file(s)\n\n`);

  let totalFixed = 0;
  const skippedChecks = new Set();

  for (const [filePath, fileViolations] of byFile) {
    const summary = fixFile(filePath, fileViolations);
    if (summary.fixed > 0) {
      const rel = (() => { try { return relative(process.cwd(), filePath); } catch { return filePath; } })();
      process.stdout.write(`  fixed  ${rel}  (${summary.fixed} change(s))\n`);
      totalFixed += summary.fixed;
    }
    for (const c of summary.skippedChecks) skippedChecks.add(c);
  }

  if (totalFixed === 0) {
    process.stdout.write("  Nothing applied.\n");
  }

  if (skippedChecks.size > 0) {
    process.stdout.write(`\n  Skipped (require manual review): ${[...skippedChecks].join(", ")}\n`);
  }

  // Re-run and show updated results
  let updated;
  try {
    updated = runAudit(scanPath);
  } catch (e) {
    process.stderr.write(`Error on re-scan: ${e.message}\n`);
    process.exit(2);
  }

  process.stdout.write("\nAfter auto-fix:\n");
  process.stdout.write(formatReport(updated.violations, updated.fileCount, { noHints: opts.noHints }));
  process.exit(exitCode(updated.violations));
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (isMain) {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    process.stdout.write(HELP + "\n", () => process.exit(0));
  }

  // --fix and --watch are incompatible with --json
  if ((opts.fix || opts.watch) && opts.json) {
    process.stderr.write("--json cannot be combined with --fix or --watch\n");
    process.exit(2);
  }

  // --fix and --watch are mutually exclusive
  if (opts.fix && opts.watch) {
    process.stderr.write("--fix and --watch cannot be used together\n");
    process.exit(2);
  }

  if (opts.watch) {
    startWatch(opts.path, runAudit, { noHints: opts.noHints });
    return; // startWatch keeps the process alive
  }

  if (opts.fix) {
    runFixMode(opts.path, opts);
    return;
  }

  console.log("\n@lhi/ursamu-dev audit — UrsaMU static audit\n");

  let result;
  try {
    result = runAudit(opts.path);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(2);
  }

  const { violations, fileCount } = result;

  if (opts.json) {
    const visible = opts.noHints ? violations.filter(v => v.level !== "hint") : violations;
    process.stdout.write(JSON.stringify({ fileCount, violations: visible }, null, 2) + "\n");
    process.exit(exitCode(violations));
  }

  const report = formatReport(violations, fileCount, { noHints: opts.noHints });
  process.stdout.write(report, () => process.exit(exitCode(violations)));
}
