/**
 * lib/writer.js
 *
 * Parses the LLM response for a Stage 5 run and writes output artifacts.
 *
 * Two modes:
 *   default  — write all artifacts to <outDir>/<unitType>/<unitName>/<section>.md
 *   --patch  — write JSDoc / help text back into the source files (local use)
 *
 * Section detection
 * -----------------
 * The LLM is instructed to label each output block.  We look for lines that
 * match any of these patterns (case-insensitive):
 *
 *   ### 5a  /  ### Stage 5a  /  ## Help Text  /  ## In-game help
 *   ### 5b  /  ### JSDoc
 *   ### 5c  /  ### Plugin README  /  ## README
 *   ### 5d  /  ### REST Route Contract
 *   ### 5e  /  ### Inline Comments
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname, resolve, relative, isAbsolute } from "path";

/**
 * Assert that a write destination is safely within process.cwd().
 * Reuses the same bounds-check logic as scanner.js assertSafePath.
 *
 * @param {string} rawPath
 * @throws {Error} if the path escapes process.cwd()
 */
function assertSafeOutPath(rawPath) {
  const cwd = process.cwd();
  const abs = resolve(rawPath);
  // path.relative() is path-separator–agnostic (works on Windows backslash too)
  const rel = relative(cwd, abs);
  if (rel !== "" && (rel.startsWith("..") || isAbsolute(rel))) {
    throw new Error(
      `Output path "${rawPath}" resolves to "${abs}" which is outside the project root ` +
      `"${cwd}". Directory traversal is not permitted.`
    );
  }
}

/** @typedef {import("./scanner.js").SourceUnit} SourceUnit */

/**
 * Section label → output filename stem mapping.
 * Order matters: first match wins.
 */
const SECTION_MAP = [
  { re: /^#{1,4}\s+(stage\s+)?5a\b|in[- ]?game help|help text/i, stem: "help" },
  { re: /^#{1,4}\s+(stage\s+)?5b\b|jsdoc/i,                       stem: "jsdoc" },
  { re: /^#{1,4}\s+(stage\s+)?5c\b|plugin readme|^#{1,4}\s+readme/i, stem: "README" },
  { re: /^#{1,4}\s+(stage\s+)?5d\b|rest route/i,                   stem: "routes" },
  { re: /^#{1,4}\s+(stage\s+)?5e\b|inline comment/i,               stem: "comments" },
];

/**
 * Parse the LLM response into named sections.
 *
 * @param {string} response
 * @returns {Map<string, string>}  stem → content
 */
export function parseSections(response) {
  const lines = response.split("\n");
  const sections = new Map();
  let currentStem = null;
  let buffer = [];

  const flush = () => {
    if (currentStem !== null) {
      const text = buffer.join("\n").trim();
      if (text) sections.set(currentStem, text);
    }
    buffer = [];
  };

  for (const line of lines) {
    const match = SECTION_MAP.find(({ re }) => re.test(line));
    if (match) {
      flush();
      currentStem = match.stem;
    } else {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

/**
 * Write Stage 5 output artifacts for one SourceUnit.
 *
 * @param {object}     opts
 * @param {SourceUnit} opts.unit       - The source unit that was processed
 * @param {string}     opts.response   - Raw LLM response text
 * @param {string}     opts.outDir     - Root output directory
 * @param {boolean}    [opts.patch]    - If true, attempt to patch source files
 * @returns {string[]} List of paths written
 */
export function write({ unit, response, outDir, patch = false }) {
  assertSafeOutPath(outDir);

  const sections = parseSections(response);
  const written = [];

  if (sections.size === 0) {
    console.warn(`  ⚠  No recognizable sections in LLM response for "${unit.name}"`);
    return written;
  }

  if (patch) {
    return patchSources({ unit, sections, written });
  }

  // Default: write to outDir
  const unitOutDir = join(outDir, unit.type === "plugin" ? "plugins" : "commands", unit.name);
  mkdirSync(unitOutDir, { recursive: true });

  for (const [stem, content] of sections) {
    const ext = stem === "README" ? ".md" : ".md";
    const filePath = join(unitOutDir, `${stem}${ext}`);
    writeFileSync(filePath, content + "\n", "utf8");
    written.push(filePath);
  }

  return written;
}

/**
 * Patch mode: write JSDoc back into the first .ts source file and plugin README
 * to the plugin's rootPath.  Other sections are still written to files alongside
 * the source.
 *
 * @param {object}          opts
 * @param {SourceUnit}      opts.unit
 * @param {Map<string,string>} opts.sections
 * @param {string[]}        opts.written
 * @returns {string[]}
 */
function patchSources({ unit, sections, written }) {
  // Defence-in-depth: verify all patch destinations are inside cwd,
  // independent of any --src validation performed upstream.
  assertSafeOutPath(unit.rootPath);
  for (const f of unit.files) {
    assertSafeOutPath(f.path);
  }

  // Plugin README → write to rootPath/README.md
  if (unit.type === "plugin" && sections.has("README")) {
    const readmePath = join(unit.rootPath, "README.md");
    writeFileSync(readmePath, sections.get("README") + "\n", "utf8");
    written.push(readmePath);
  }

  // JSDoc → prepend to first .ts file if not already present
  if (sections.has("jsdoc") && unit.files.length > 0) {
    const target = unit.files[0];
    const existing = existsSync(target.path) ? readFileSync(target.path, "utf8") : "";
    if (!existing.includes("/**")) {
      writeFileSync(target.path, sections.get("jsdoc") + "\n" + existing, "utf8");
      written.push(target.path);
    }
  }

  // Everything else: write to files alongside the source
  for (const [stem, content] of sections) {
    if (stem === "README" || stem === "jsdoc") continue; // already handled
    const outPath = unit.type === "plugin"
      ? join(unit.rootPath, `${stem}.md`)
      : join(dirname(unit.rootPath), `${unit.name}.${stem}.md`);
    writeFileSync(outPath, content + "\n", "utf8");
    written.push(outPath);
  }

  return written;
}
