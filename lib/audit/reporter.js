/**
 * lib/audit/reporter.js
 *
 * Formats audit violations for console output or JSON.
 */

import { relative } from "path";

const LEVEL_LABEL = {
  error: "ERROR",
  warn:  "WARN ",
  hint:  "HINT ",
};

/**
 * Format violations as a human-readable string.
 *
 * @param {import("./checks.js").Violation[]} violations
 * @param {number} fileCount
 * @param {object} [opts]
 * @param {boolean} [opts.noHints] - suppress hint-level findings
 * @returns {string}
 */
export function formatReport(violations, fileCount, opts = {}) {
  const visible = opts.noHints
    ? violations.filter(v => v.level !== "hint")
    : violations;

  if (visible.length === 0) {
    return `\nUrsaMU Audit — ${fileCount} file(s) scanned\n\nNo violations found.\n`;
  }

  // Group by file
  const byFile = new Map();
  for (const v of visible) {
    const key = v.file;
    if (!byFile.has(key)) byFile.set(key, []);
    byFile.get(key).push(v);
  }

  const lines = [`\nUrsaMU Audit — ${fileCount} file(s) scanned\n`];

  for (const [filePath, fileViolations] of byFile) {
    // Show path relative to cwd for readability
    let display;
    try { display = relative(process.cwd(), filePath); }
    catch { display = filePath; }

    lines.push(`  ${display}`);
    for (const v of fileViolations) {
      lines.push(`    ${LEVEL_LABEL[v.level]} line ${String(v.line).padStart(4)}  [${v.check}]  ${v.message}`);
    }
    lines.push("");
  }

  const errors = visible.filter(v => v.level === "error").length;
  const warns  = visible.filter(v => v.level === "warn").length;
  const hints  = visible.filter(v => v.level === "hint").length;

  const parts = [];
  if (errors > 0) parts.push(`${errors} error(s)`);
  if (warns  > 0) parts.push(`${warns} warning(s)`);
  if (hints  > 0) parts.push(`${hints} hint(s)`);

  lines.push(`Summary: ${parts.join(", ")} across ${byFile.size} file(s).`);
  if (opts.noHints && violations.some(v => v.level === "hint")) {
    lines.push("(hints suppressed — remove --no-hints to show them)");
  }
  lines.push("");

  return lines.join("\n");
}

/**
 * Determine the process exit code from a list of violations.
 * exit 0 — no errors or warnings
 * exit 1 — at least one error or warning
 * (hints alone do not cause a non-zero exit)
 *
 * @param {import("./checks.js").Violation[]} violations
 * @returns {number}
 */
export function exitCode(violations) {
  return violations.some(v => v.level === "error" || v.level === "warn") ? 1 : 0;
}
