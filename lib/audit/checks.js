/**
 * lib/audit/checks.js
 *
 * Pure static-analysis check functions for UrsaMU source files.
 * Each function takes (lines, filePath) and returns Violation[].
 *
 * No I/O — entirely pure so every check is trivially unit-testable.
 *
 * Confidence levels:
 *   error — high confidence, deterministic, safe to fail CI on
 *   warn  — high confidence on common patterns; may miss edge cases
 *   hint  — heuristic; informational only, does not affect exit code
 *
 * Known limitation: brace tracking ignores string literals. Braces
 * embedded in template literals or multi-line strings may cause block
 * extraction to produce a slightly wrong range. This is a deliberate
 * trade-off to avoid a full TypeScript AST dependency.
 */

/**
 * @typedef {Object} Violation
 * @property {string} file     - absolute path
 * @property {number} line     - 1-based line number
 * @property {string} check    - check ID: "check-01" through "check-15"
 * @property {"error"|"warn"|"hint"} level
 * @property {string} message  - human-readable description
 */

// ── Block extraction helper ──────────────────────────────────────────────────

/**
 * Find the first occurrence of startPattern and extract the lines of the
 * brace-delimited block that follows it. Returns the body lines (including
 * the header line) with 1-based line numbers, or null if not found.
 *
 * Exported so lib/audit/fixer.js can re-use block boundaries.
 *
 * @param {string[]}  lines        - file content split by '\n'
 * @param {RegExp}    startPattern - regex to match the block header
 * @returns {{ headerLine: number, bodyLines: Array<{text:string,lineNo:number}> } | null}
 */
export function extractBlock(lines, startPattern) {
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (startPattern.test(lines[i])) { startIdx = i; break; }
  }
  if (startIdx === -1) return null;

  let depth = 0;
  let opened = false;
  const bodyLines = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i];
    for (const ch of line) {
      if (ch === "{") { depth++; opened = true; }
      else if (ch === "}") { depth--; }
    }
    if (opened) bodyLines.push({ text: line, lineNo: i + 1 });
    if (opened && depth === 0) break;
  }

  return opened ? { headerLine: startIdx + 1, bodyLines } : null;
}

/**
 * Extract ALL occurrences of a block matching startPattern.
 * Returns an array of block results (same shape as extractBlock).
 *
 * @param {string[]} lines
 * @param {RegExp}   startPattern
 * @returns {Array<{ headerLine: number, bodyLines: Array<{text:string,lineNo:number}> }>}
 */
function extractAllBlocks(lines, startPattern) {
  const blocks = [];
  let searchFrom = 0;

  while (searchFrom < lines.length) {
    let startIdx = -1;
    for (let i = searchFrom; i < lines.length; i++) {
      if (startPattern.test(lines[i])) { startIdx = i; break; }
    }
    if (startIdx === -1) break;

    let depth = 0;
    let opened = false;
    const bodyLines = [];

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i];
      for (const ch of line) {
        if (ch === "{") { depth++; opened = true; }
        else if (ch === "}") { depth--; }
      }
      if (opened) bodyLines.push({ text: line, lineNo: i + 1 });
      if (opened && depth === 0) { searchFrom = i + 1; break; }
    }
    if (!opened) break;

    blocks.push({ headerLine: startIdx + 1, bodyLines });
  }

  return blocks;
}

// ── Check 03 / 08 — Atomic DB writes ────────────────────────────────────────
// Detects .db.modify() calls using known-bad MongoDB ops ($push, $pull, etc.)
// Confidence: HIGH for literal op strings.

const INVALID_OPS_RE = /"\$push"|\$pull\b|\$addToSet\b|\$rename\b|\$pop\b|\$each\b|\$slice\b/;
const DB_MODIFY_RE   = /\.db\.modify\s*\(/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkAtomicDbWrites(lines, filePath) {
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    if (!DB_MODIFY_RE.test(lines[i])) continue;
    // Check this line + next 4 lines for the op argument
    const window = lines.slice(i, Math.min(i + 5, lines.length)).join(" ");
    if (INVALID_OPS_RE.test(window)) {
      violations.push({
        file: filePath, line: i + 1, check: "check-03", level: "error",
        message:
          "u.db.modify called with a disallowed MongoDB op. " +
          'Use "$set", "$inc", or "$unset" only.',
      });
    }
  }
  return violations;
}

// ── Check 06 — Sandbox safety (system/scripts/ only) ────────────────────────
// Confidence: HIGH for the specific banned globals listed in SKILL.md.

const BANNED_GLOBALS = [
  { re: /\bDeno\s*\./, label: "Deno" },
  { re: /\bfetch\s*\(/, label: "fetch" },
  { re: /\brequire\s*\(/, label: "require" },
  { re: /\bprocess\s*\./, label: "process" },
];

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkSandboxSafety(lines, filePath) {
  // Only applies to system/scripts/ files
  if (!filePath.includes("system/scripts") && !filePath.includes("system\\scripts")) {
    return [];
  }
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    // Skip comment lines
    if (/^\s*(\/\/|\/\*|\*)/.test(lines[i])) continue;
    for (const { re, label } of BANNED_GLOBALS) {
      if (re.test(lines[i])) {
        violations.push({
          file: filePath, line: i + 1, check: "check-06", level: "error",
          message:
            `system/scripts/ file references banned global "${label}". ` +
            "System scripts may only use the u.* SDK — no Deno, fetch, or Node APIs.",
        });
      }
    }
  }
  return violations;
}

// ── Check 09 — Import path correctness ───────────────────────────────────────
// Flags `from "@ursamu/ursamu"` (missing jsr: prefix in Deno context).
// Confidence: MEDIUM — some build environments may not require jsr: prefix.

const BAD_IMPORT_RE = /from\s+["']@ursamu\/ursamu["']/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkImportPath(lines, filePath) {
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    if (BAD_IMPORT_RE.test(lines[i])) {
      violations.push({
        file: filePath, line: i + 1, check: "check-09", level: "warn",
        message:
          'Import uses "@ursamu/ursamu" without the "jsr:" prefix. ' +
          'Deno requires: import ... from "jsr:@ursamu/ursamu"',
      });
    }
  }
  return violations;
}

// ── Check 10 — Help text on every addCmd ────────────────────────────────────
// Confidence: HIGH for presence/absence; MEDIUM for Examples content.

const ADDCMD_RE  = /\baddCmd\s*\(\s*\{/;
const EXAMPLES_RE = /examples/i;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkHelpText(lines, filePath) {
  const blocks = extractAllBlocks(lines, ADDCMD_RE);
  const violations = [];

  for (const block of blocks) {
    const combined = block.bodyLines.map(l => l.text).join("\n");
    const headerLine = block.headerLine;

    if (!/\bhelp\s*:/.test(combined)) {
      violations.push({
        file: filePath, line: headerLine, check: "check-10", level: "error",
        message: "addCmd() is missing a help: field. Every command must document its syntax and examples.",
      });
      continue;
    }

    if (!EXAMPLES_RE.test(combined)) {
      violations.push({
        file: filePath, line: headerLine, check: "check-10", level: "warn",
        message:
          'addCmd() help: field is missing an "Examples" section. ' +
          "Include at least two usage examples.",
      });
    }
  }
  return violations;
}

// ── Check 11 — Plugin phase discipline: no addCmd inside init() ──────────────
// Confidence: HIGH for the init: () => { pattern used in SKILL.md.

export const INIT_BLOCK_RE = /\binit\s*:\s*(async\s+)?\(\s*\)\s*=>/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkPluginPhaseDiscipline(lines, filePath) {
  const block = extractBlock(lines, INIT_BLOCK_RE);
  if (!block) return [];

  const violations = [];
  for (const { text, lineNo } of block.bodyLines) {
    if (/\baddCmd\s*\(/.test(text)) {
      violations.push({
        file: filePath, line: lineNo, check: "check-11", level: "error",
        message:
          "addCmd() called inside init(). Command registration is a module-load " +
          "side effect — move addCmd() calls to commands.ts at the top level.",
      });
    }
  }
  return violations;
}

// ── Check 12 — gameHooks pairing ─────────────────────────────────────────────
// Confidence: HIGH for named handler references (the correct pattern).

const HOOKS_ON_RE  = /gameHooks\.on\s*\(\s*(['"`])([^'"` \n]+)\1\s*,\s*(\w+)/;
const HOOKS_OFF_RE = /gameHooks\.off\s*\(\s*(['"`])([^'"` \n]+)\1\s*,\s*(\w+)/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkGameHooksPairing(lines, filePath) {
  const violations = [];

  const initBlock   = extractBlock(lines, INIT_BLOCK_RE);
  const removeBlock = extractBlock(lines, /\bremove\s*:\s*(async\s+)?\(\s*\)\s*=>/);

  if (!initBlock) return [];

  // Helper: is a line a comment?
  const isComment = (text) => /^\s*(\/\/|\/\*)/.test(text);

  // Collect all .on() calls in init() (skip comment lines)
  const onPairs = [];
  for (const { text, lineNo } of initBlock.bodyLines) {
    if (isComment(text)) continue;
    const m = HOOKS_ON_RE.exec(text);
    if (m) onPairs.push({ event: m[2], handler: m[3], lineNo });
  }

  if (onPairs.length === 0) return [];

  // Collect all .off() calls in remove() (skip comment lines)
  const offPairs = new Set();
  if (removeBlock) {
    for (const { text } of removeBlock.bodyLines) {
      if (isComment(text)) continue;
      const m = HOOKS_OFF_RE.exec(text);
      if (m) offPairs.add(`${m[2]}:${m[3]}`);
    }
  }

  for (const { event, handler, lineNo } of onPairs) {
    if (!offPairs.has(`${event}:${handler}`)) {
      violations.push({
        file: filePath, line: lineNo, check: "check-12", level: "error",
        message:
          `gameHooks.on("${event}", ${handler}) in init() has no matching ` +
          `gameHooks.off("${event}", ${handler}) in remove(). ` +
          "Every hook wired in init() must be unwired in remove() with the same reference.",
      });
    }
  }
  return violations;
}

// ── Check 13 — DBO namespace ──────────────────────────────────────────────────
// Confidence: HIGH — presence/absence of dot in collection name is unambiguous.

const DBO_NEW_RE = /new\s+DBO\s*(?:<[^>]*>)?\s*\(\s*(['"`])([^'"` \n]+)\1/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkDboNamespace(lines, filePath) {
  const violations = [];
  for (let i = 0; i < lines.length; i++) {
    const m = DBO_NEW_RE.exec(lines[i]);
    if (!m) continue;
    const collectionName = m[2];
    if (!collectionName.includes(".")) {
      violations.push({
        file: filePath, line: i + 1, check: "check-13", level: "error",
        message:
          `new DBO("${collectionName}") is missing a plugin namespace prefix. ` +
          'Use "<pluginName>.<collectionName>" (e.g. "myplugin.records").',
      });
    }
  }
  return violations;
}

// ── Check 14 — REST auth guard ───────────────────────────────────────────────
// Confidence: HIGH for inline handlers; MEDIUM for named function references.

const REGISTER_ROUTE_RE = /registerPluginRoute\s*\(/;
const AUTH_GUARD_RE     = /if\s*\(\s*!userId\s*\)/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkRestAuthGuard(lines, filePath) {
  const violations = [];

  for (let i = 0; i < lines.length; i++) {
    if (!REGISTER_ROUTE_RE.test(lines[i])) continue;

    // Extract the handler body — scan up to 30 lines for the auth guard
    const window = lines.slice(i, Math.min(i + 30, lines.length)).join("\n");
    if (!AUTH_GUARD_RE.test(window)) {
      violations.push({
        file: filePath, line: i + 1, check: "check-14", level: "error",
        message:
          "registerPluginRoute() handler does not check if (!userId) before executing logic. " +
          "Every REST route must return 401 immediately when userId is null.",
      });
    }
  }
  return violations;
}

// ── Check 15 — init() returns true ───────────────────────────────────────────
// Confidence: HIGH for single-file plugins.

const RETURN_TRUE_RE = /\breturn\s+true\b/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkInitReturnsTrue(lines, filePath) {
  const block = extractBlock(lines, INIT_BLOCK_RE);
  if (!block) return [];

  // Exclude comment-only lines before testing so that a comment like
  // "// forgot return true" does not produce a false negative.
  const combined = block.bodyLines
    .filter(l => !/^\s*(\/\/|\/\*)/.test(l.text))
    .map(l => l.text)
    .join("\n");
  if (!RETURN_TRUE_RE.test(combined)) {
    return [{
      file: filePath, line: block.headerLine, check: "check-15", level: "error",
      message:
        "init() does not return true. The plugin loader requires init() to " +
        "return true (or Promise<true>) to confirm successful initialisation.",
    }];
  }
  return [];
}

// ── Check 01 — Input sanitization (heuristic WARN) ────────────────────────────
// Checks exec() bodies that write to the DB but don't call stripSubs().
// Confidence: MEDIUM — may miss cases where stripSubs() is in a helper.

const EXEC_BLOCK_RE = /\bexec\s*:\s*async\s*\(/;
const DB_WRITE_RE   = /\.db\.(modify|create)\s*\(/;
const STRIP_SUBS_RE = /\bstripSubs\s*\(/;

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkInputSanitization(lines, filePath) {
  const blocks = extractAllBlocks(lines, EXEC_BLOCK_RE);
  const violations = [];

  for (const block of blocks) {
    const combined = block.bodyLines.map(l => l.text).join("\n");
    if (DB_WRITE_RE.test(combined) && !STRIP_SUBS_RE.test(combined)) {
      violations.push({
        file: filePath, line: block.headerLine, check: "check-01", level: "warn",
        message:
          "exec() writes to the DB but no u.util.stripSubs() call was found in the body. " +
          "Strip MUSH codes from user input before storing or measuring strings.",
      });
    }
  }
  return violations;
}

// ── Check 04 — Null guard on util.target() result (heuristic HINT) ───────────
// Finds exec() bodies that call util.target() and checks for a null guard.
// Confidence: MEDIUM — variable renaming defeats the check.

const TARGET_CALL_RE  = /\butil\.target\s*\(/;
const NULL_GUARD_RE   = /if\s*\(\s*!/;  // if (!target) or if (!result)

/**
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function checkTargetNullGuard(lines, filePath) {
  const blocks = extractAllBlocks(lines, EXEC_BLOCK_RE);
  const violations = [];

  for (const block of blocks) {
    const combined = block.bodyLines.map(l => l.text).join("\n");
    if (!TARGET_CALL_RE.test(combined)) continue;
    if (!NULL_GUARD_RE.test(combined)) {
      violations.push({
        file: filePath, line: block.headerLine, check: "check-04", level: "hint",
        message:
          "exec() calls util.target() but no null guard (if (!...)) was detected. " +
          "u.util.target() returns null when the target is not found — always guard before use.",
      });
    }
  }
  return violations;
}

// ── All checks export ────────────────────────────────────────────────────────

/**
 * Run all checks against a file's lines.
 *
 * @param {string[]} lines
 * @param {string}   filePath
 * @returns {Violation[]}
 */
export function runAllChecks(lines, filePath) {
  return [
    ...checkInputSanitization(lines, filePath),
    ...checkSandboxSafety(lines, filePath),
    ...checkImportPath(lines, filePath),
    ...checkHelpText(lines, filePath),
    ...checkPluginPhaseDiscipline(lines, filePath),
    ...checkGameHooksPairing(lines, filePath),
    ...checkDboNamespace(lines, filePath),
    ...checkRestAuthGuard(lines, filePath),
    ...checkInitReturnsTrue(lines, filePath),
    ...checkAtomicDbWrites(lines, filePath),
    ...checkTargetNullGuard(lines, filePath),
  ];
}
