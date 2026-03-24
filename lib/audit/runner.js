/**
 * lib/audit/runner.js
 *
 * Scans a directory tree for TypeScript/JavaScript source files and runs
 * all audit checks against each file. Returns an aggregated list of
 * Violation objects.
 */

import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";
import { assertSafePath } from "../scanner.js";
import { runAllChecks } from "./checks.js";

const MAX_DEPTH = 8;
const MAX_FILES = 500;

/**
 * Recursively collect .ts and .js files under a directory.
 * Respects MAX_DEPTH and MAX_FILES limits to prevent DoS.
 *
 * @param {string} dir
 * @param {number} depth
 * @param {{ count: number }} counter
 * @returns {string[]} - absolute file paths
 */
function collectFiles(dir, depth = 0, counter = { count: 0 }) {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `Directory "${dir}" exceeds the maximum nesting depth of ${MAX_DEPTH}. ` +
      "Scan aborted."
    );
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];

  for (const e of entries) {
    // Never follow symlinks — they can escape the scan root
    if (e.isSymbolicLink()) continue;

    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...collectFiles(abs, depth + 1, counter));
    } else if (e.isFile()) {
      const ext = extname(e.name);
      if (ext === ".ts" || ext === ".js") {
        counter.count++;
        if (counter.count > MAX_FILES) {
          throw new Error(
            `Scan found more than ${MAX_FILES} source files. ` +
            "Narrow the scan path or increase the limit."
          );
        }
        results.push(abs);
      }
    }
  }

  return results;
}

/**
 * Run the full audit against all source files under scanPath.
 *
 * @param {string} scanPath - directory to scan (must be inside cwd)
 * @returns {{ violations: import("./checks.js").Violation[], fileCount: number }}
 */
export function runAudit(scanPath) {
  assertSafePath(scanPath);

  const stat = statSync(scanPath);
  if (!stat.isDirectory()) {
    throw new Error(`"${scanPath}" is not a directory.`);
  }

  const files = collectFiles(scanPath);
  const violations = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    const lines   = content.split("\n");
    violations.push(...runAllChecks(lines, filePath));
  }

  return { violations, fileCount: files.length };
}
