/**
 * lib/scanner.js
 *
 * Discovers UrsaMU source units under a given root directory.
 *
 * Returns an array of SourceUnit objects:
 *   - type "command" : a single .ts file in <src>/commands/
 *   - type "plugin"  : all .ts files + existing README under <src>/plugins/<name>/
 */

import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, basename, extname, resolve } from "path";

/**
 * Assert that a caller-supplied path is safely contained within process.cwd().
 *
 * Resolves the path to an absolute form (collapsing any `..` sequences) then
 * checks it is a sub-path of the current working directory.  Throws with a
 * clear message if the check fails.
 *
 * @param {string} rawPath - The path supplied by the user (relative or absolute)
 * @throws {Error} if the resolved path escapes process.cwd()
 */
export function assertSafePath(rawPath) {
  const cwd = process.cwd();
  const abs = resolve(rawPath); // collapses all traversal sequences
  if (abs !== cwd && !abs.startsWith(cwd + "/")) {
    throw new Error(
      `Path "${rawPath}" resolves to "${abs}" which is outside the project root ` +
      `"${cwd}". Directory traversal is not permitted.`
    );
  }
}

/**
 * @typedef {Object} SourceUnit
 * @property {"command"|"plugin"} type
 * @property {string}  name       - command filename stem or plugin directory name
 * @property {string}  rootPath   - absolute path to the command file or plugin dir
 * @property {FileEntry[]} files  - all source files belonging to this unit
 */

/**
 * @typedef {Object} FileEntry
 * @property {string} path     - absolute file path
 * @property {string} rel      - path relative to rootPath
 * @property {string} content  - UTF-8 file content
 */

/**
 * Scan a source root and return all discoverable SourceUnits.
 *
 * @param {string} srcDir - Root directory to scan (e.g. "./src")
 * @returns {SourceUnit[]}
 */
export function scan(srcDir) {
  assertSafePath(srcDir);
  const units = [];

  // ── Commands ───────────────────────────────────────────────────────────────
  const commandsDir = join(srcDir, "commands");
  if (existsSync(commandsDir) && statSync(commandsDir).isDirectory()) {
    for (const entry of readdirSync(commandsDir, { withFileTypes: true })) {
      if (!entry.isFile() || extname(entry.name) !== ".ts") continue;
      const filePath = join(commandsDir, entry.name);
      units.push({
        type: "command",
        name: basename(entry.name, ".ts"),
        rootPath: filePath,
        files: [{
          path: filePath,
          rel: entry.name,
          content: readFileSync(filePath, "utf8"),
        }],
      });
    }
  }

  // ── Plugins ────────────────────────────────────────────────────────────────
  const pluginsDir = join(srcDir, "plugins");
  if (existsSync(pluginsDir) && statSync(pluginsDir).isDirectory()) {
    for (const entry of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const pluginDir = join(pluginsDir, entry.name);
      const files = collectFiles(pluginDir, pluginDir);
      if (files.length === 0) continue;
      units.push({
        type: "plugin",
        name: entry.name,
        rootPath: pluginDir,
        files,
      });
    }
  }

  return units;
}

const MAX_DEPTH = 8;   // maximum directory nesting depth inside a plugin
const MAX_FILES = 500; // maximum total files collected from a single plugin

/**
 * Recursively collect .ts and .md files under a directory.
 *
 * @param {string} dir          - Directory to recurse into
 * @param {string} rootDir      - Used to compute relative paths
 * @param {number} [depth=0]    - Current recursion depth
 * @param {{ count: number }}   - Shared file-count accumulator
 * @returns {FileEntry[]}
 */
function collectFiles(dir, rootDir, depth = 0, counter = { count: 0 }) {
  if (depth > MAX_DEPTH) {
    throw new Error(
      `Plugin directory "${rootDir}" exceeds the maximum nesting depth of ${MAX_DEPTH}. ` +
      "Scan aborted to prevent denial of service."
    );
  }

  const entries = readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...collectFiles(abs, rootDir, depth + 1, counter));
    } else if (e.isFile() && (extname(e.name) === ".ts" || extname(e.name) === ".md")) {
      counter.count++;
      if (counter.count > MAX_FILES) {
        throw new Error(
          `Plugin directory "${rootDir}" contains more than ${MAX_FILES} files. ` +
          "Scan aborted to prevent denial of service."
        );
      }
      const rel = abs.slice(rootDir.length + 1); // strip leading rootDir/
      results.push({ path: abs, rel, content: readFileSync(abs, "utf8") });
    }
  }
  return results;
}
