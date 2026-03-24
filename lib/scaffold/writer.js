/**
 * lib/scaffold/writer.js
 *
 * Writes scaffold files to disk.
 * Validates the output path against process.cwd() before any writes.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import {
  indexTemplate,
  commandsTemplate,
  commandBlockTemplate,
  routesTemplate,
  testTemplate,
  mockUTemplate,
  readmeTemplate,
} from "./templates.js";

/**
 * Assert that a write destination is safely within process.cwd().
 *
 * @param {string} rawPath
 * @throws {Error} if the path escapes process.cwd()
 */
function assertSafeOutPath(rawPath) {
  const cwd = process.cwd();
  const abs = resolve(rawPath);
  if (abs !== cwd && !abs.startsWith(cwd + "/")) {
    throw new Error(
      `Output path "${rawPath}" resolves to "${abs}" which is outside the project root ` +
      `"${cwd}". Directory traversal is not permitted.`
    );
  }
}

/**
 * Validate the plugin name.
 * Must be lowercase, start with a letter, and contain only letters, digits, and hyphens.
 *
 * @param {string} name
 * @throws {Error} if the name is invalid
 */
export function validateName(name) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("Plugin name is required.");
  }
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error(
      `Invalid plugin name "${name}". ` +
      "Names must be lowercase, start with a letter, and contain only letters, digits, and hyphens."
    );
  }
}

/**
 * Describe the files that would be created without writing anything.
 *
 * @param {string} name
 * @param {object} opts
 * @param {boolean} [opts.withRoutes]
 * @param {boolean} [opts.withTests]
 * @param {string}  [opts.out]
 * @returns {string[]} - list of relative paths
 */
export function describeFiles(name, opts = {}) {
  const outRoot = opts.out ?? `./src/plugins/${name}`;
  const files = [
    join(outRoot, "index.ts"),
    join(outRoot, "commands.ts"),
    join(outRoot, "README.md"),
  ];
  if (opts.withRoutes) files.push(join(outRoot, "routes.ts"));
  if (opts.withTests) {
    files.push(join(outRoot, "tests", `${name}.test.ts`));
    files.push(join(outRoot, "tests", "helpers", "mockU.ts"));
  }
  return files;
}

/**
 * Write all scaffold files for a plugin.
 *
 * @param {string} name  - validated plugin name
 * @param {object} opts
 * @param {boolean} [opts.withRoutes]  - include routes.ts
 * @param {boolean} [opts.withTests]   - include tests/ and mockU helper
 * @param {string}  [opts.out]         - override output root
 * @returns {string[]} - list of written absolute paths
 */
export function writeScaffold(name, opts = {}) {
  const outRoot = resolve(opts.out ?? `./src/plugins/${name}`);
  assertSafeOutPath(outRoot);

  // Refuse to overwrite a non-empty directory
  if (existsSync(outRoot)) {
    const entries = readdirSync(outRoot);
    if (entries.length > 0) {
      throw new Error(
        `Output directory "${outRoot}" already exists and is not empty. ` +
        "Remove it first or choose a different --out path."
      );
    }
  }

  mkdirSync(outRoot, { recursive: true });
  const written = [];

  const write = (relPath, content) => {
    const abs = join(outRoot, relPath);
    mkdirSync(join(outRoot, relPath, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
    written.push(abs);
  };

  write("index.ts",    indexTemplate(name, opts));
  write("commands.ts", commandsTemplate(name));
  write("README.md",   readmeTemplate(name, opts));

  if (opts.withRoutes) {
    write("routes.ts", routesTemplate(name));
  }

  if (opts.withTests) {
    write(`tests/${name}.test.ts`,      testTemplate(name));
    write("tests/helpers/mockU.ts",     mockUTemplate());
  }

  return written;
}

/**
 * Append a new addCmd() skeleton to an existing plugin's commands.ts.
 *
 * @param {string} pluginName   - validated plugin name (for context)
 * @param {string} commandName  - command name, e.g. "+bbs-post" or "bbs-post"
 * @param {string} outRoot      - plugin directory path (default: ./src/plugins/<name>)
 * @returns {string} - absolute path to the updated commands.ts
 * @throws {Error} if commands.ts does not exist or path is unsafe
 */
export function addCommandToPlugin(pluginName, commandName, outRoot) {
  const absRoot = resolve(outRoot);
  assertSafeOutPath(absRoot);

  const commandsPath = join(absRoot, "commands.ts");
  if (!existsSync(commandsPath)) {
    throw new Error(
      `commands.ts not found at "${commandsPath}". ` +
      `Run ursamu-scaffold ${pluginName} first to create the plugin.`
    );
  }

  const existing = readFileSync(commandsPath, "utf8");
  const block = commandBlockTemplate(commandName);
  const updated = existing.trimEnd() + "\n\n" + block + "\n";
  writeFileSync(commandsPath, updated, "utf8");
  return commandsPath;
}
