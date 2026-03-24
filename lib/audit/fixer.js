/**
 * lib/audit/fixer.js
 *
 * Auto-applies mechanical fixes for audit violations where the correct
 * transformation is unambiguous and safe.
 *
 * Fixable checks:
 *   check-09  from "@ursamu/ursamu" → from "jsr:@ursamu/ursamu"
 *   check-15  insert "return true;" before the closing brace of init()
 *
 * Structural checks (check-01, check-03, check-10, check-11, check-12,
 * check-13, check-14) require developer judgment and are intentionally skipped.
 */

import { readFileSync, writeFileSync } from "fs";
import { extractBlock, INIT_BLOCK_RE } from "./checks.js";

export const FIXABLE_CHECKS = new Set(["check-09", "check-15"]);

/**
 * Split violations into fixable (auto-applicable) and manual (need human review).
 *
 * @param {import("./checks.js").Violation[]} violations
 * @returns {{ fixable: import("./checks.js").Violation[], manual: import("./checks.js").Violation[] }}
 */
export function classifyViolations(violations) {
  return {
    fixable: violations.filter(v => FIXABLE_CHECKS.has(v.check)),
    manual:  violations.filter(v => !FIXABLE_CHECKS.has(v.check)),
  };
}

/**
 * Apply all fixable violations to a file's lines in memory.
 * Returns the patched lines and a count of applied fixes.
 * Does NOT write to disk.
 *
 * @param {string[]} lines - file content split by "\n" (not mutated)
 * @param {import("./checks.js").Violation[]} fixableViolations - check-09 and/or check-15 only
 * @returns {{ lines: string[], applied: number }}
 */
export function applyFixesToLines(lines, fixableViolations) {
  let patched = lines.slice();
  let applied = 0;

  // ── check-09: add jsr: prefix ────────────────────────────────────────────
  // Simple in-place replacement — no line count change.
  for (const v of fixableViolations.filter(v2 => v2.check === "check-09")) {
    const idx = v.line - 1;
    if (idx < 0 || idx >= patched.length) continue;
    const original = patched[idx];
    const fixed = original.replace(
      /(from\s+["'])@ursamu\/ursamu(["'])/,
      "$1jsr:@ursamu/ursamu$2"
    );
    if (fixed !== original) {
      patched[idx] = fixed;
      applied++;
    }
  }

  // ── check-15: insert return true; before closing brace of init() ─────────
  // Uses extractBlock to find the exact closing-brace line, then splices.
  const check15 = fixableViolations.filter(v => v.check === "check-15");
  if (check15.length > 0) {
    const block = extractBlock(patched, INIT_BLOCK_RE);
    if (block && block.bodyLines.length > 0) {
      const closingEntry = block.bodyLines[block.bodyLines.length - 1];
      // Derive indentation from the closing brace line, add one level
      const braceIndent = (closingEntry.text.match(/^(\s*)/) ?? ["", ""])[1];
      const returnIndent = braceIndent + "  ";
      // Insert before the closing brace (0-based index = lineNo - 1)
      patched.splice(closingEntry.lineNo - 1, 0, `${returnIndent}return true;`);
      applied++;
    }
  }

  return { lines: patched, applied };
}

/**
 * Read a source file, apply all fixable violations, and write it back.
 *
 * @param {string} filePath
 * @param {import("./checks.js").Violation[]} violations - all violations for this file
 * @returns {{ fixed: number, skipped: number, skippedChecks: string[] }}
 */
export function fixFile(filePath, violations) {
  const { fixable, manual } = classifyViolations(violations);

  if (fixable.length === 0) {
    return {
      fixed: 0,
      skipped: manual.length,
      skippedChecks: [...new Set(manual.map(v => v.check))],
    };
  }

  const source = readFileSync(filePath, "utf8");
  const lines = source.split("\n");
  const { lines: patched, applied } = applyFixesToLines(lines, fixable);

  writeFileSync(filePath, patched.join("\n"), "utf8");

  return {
    fixed: applied,
    skipped: manual.length,
    skippedChecks: [...new Set(manual.map(v => v.check))],
  };
}
