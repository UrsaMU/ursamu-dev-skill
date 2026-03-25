#!/usr/bin/env node

/**
 * bin/scaffold.js — UrsaMU plugin scaffold generator
 *
 * Creates a correctly-structured UrsaMU plugin with all required boilerplate.
 *
 * Usage:
 *   ursamu-scaffold <name> [options]
 *
 * Arguments:
 *   name              Plugin name (lowercase letters, digits, hyphens). Required.
 *
 * Options:
 *   --with-routes     Include routes.ts template
 *   --with-tests      Include tests/ directory with mockU helper
 *   --out <dir>       Override output root (default: ./src/plugins/<name>)
 *   --dry-run         Preview files that would be created; write nothing
 *   --help            Show this help
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

import { validateName, describeFiles, writeScaffold, addCommandToPlugin, isUrsamuProject } from "../lib/scaffold/writer.js";

// ── Arg parsing ──────────────────────────────────────────────────────────────

/**
 * @param {string[]} argv
 * @returns {{ name: string|null, withRoutes: boolean, withTests: boolean, out: string|null, dryRun: boolean, help: boolean }}
 */
export function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    name:       null,
    withRoutes: false,
    withTests:  false,
    out:        null,
    dryRun:     false,
    addCommand: null,
    help:       false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    const next = () => {
      if (i + 1 >= args.length) {
        throw new Error(`${a} requires a value but was the last argument.`);
      }
      return args[++i];
    };

    switch (a) {
      case "--with-routes":  opts.withRoutes  = true;        break;
      case "--with-tests":   opts.withTests   = true;        break;
      case "--out":          opts.out         = next();      break;
      case "--dry-run":      opts.dryRun      = true;        break;
      case "--add-command":  opts.addCommand  = next();      break;
      case "--help":
      case "-h":             opts.help        = true;        break;
      default:
        if (a.startsWith("--")) {
          process.stderr.write(`Unknown option: ${a}\n`);
          process.exit(1);
        }
        if (opts.name !== null) {
          process.stderr.write(`Unexpected argument: ${a}\n`);
          process.exit(1);
        }
        opts.name = a;
    }
  }

  return opts;
}

// ── Help text ────────────────────────────────────────────────────────────────

const HELP = `
@lhi/ursamu-dev scaffold — UrsaMU plugin scaffold generator

  ursamu-scaffold <name> [options]

Arguments:
  name              Plugin name: lowercase letters, digits, and hyphens only.
                    Must start with a letter. (e.g. "bbs", "mail", "my-plugin")

Options:
  --with-routes          Include routes.ts REST handler template
  --with-tests           Include tests/<name>.test.ts + tests/helpers/mockU.ts
  --out <dir>            Override output root (default: ./src/plugins/<name>)
  --add-command <name>   Append a new addCmd() skeleton to an existing plugin's
                         commands.ts. Requires the plugin <name> positional arg.
  --dry-run              Show files that would be created/modified without writing
  --help                 Show this help

Files created (always):
  index.ts          IPlugin export with init/remove lifecycle hooks + registerHelpDir
  commands.ts       addCmd() skeleton with correct imports and help text
  README.md         Plugin documentation template
  help/<name>.md    In-game help file registered via registerHelpDir()

Files created with --with-routes:
  routes.ts         REST handler with userId auth guard

Files created with --with-tests:
  tests/<name>.test.ts       Deno test file with mandatory test cases
  tests/helpers/mockU.ts     Full mockU() / mockPlayer() helper

Examples:
  ursamu-scaffold bbs
  ursamu-scaffold mail --with-routes --with-tests
  ursamu-scaffold bbs --add-command "+bbs-post"
  ursamu-scaffold my-plugin --out ./plugins/my-plugin --dry-run
`;

// ── Main ─────────────────────────────────────────────────────────────────────

if (isMain) {
  let opts;
  try {
    opts = parseArgs(process.argv);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }

  if (opts.help) {
    process.stdout.write(HELP + "\n", () => process.exit(0));
  }

  if (!opts.name) {
    process.stderr.write("Error: plugin name is required.\n\nRun with --help for usage.\n");
    process.exit(1);
  }

  try {
    validateName(opts.name);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }

  // --add-command mode: append a new command skeleton to an existing commands.ts
  if (opts.addCommand !== null) {
    const cmdName = opts.addCommand;
    const pluginOut = opts.out ?? (isUrsamuProject() ? `./src/plugins/${opts.name}` : `./${opts.name}`);
    console.log(`\n@lhi/ursamu-dev scaffold — adding command "${cmdName}" to plugin "${opts.name}"\n`);
    if (opts.dryRun) {
      console.log(`Would append addCmd("${cmdName}") skeleton to ${pluginOut}/commands.ts`);
      console.log("\nDry run — no files written.\n");
      process.exit(0);
    }
    try {
      const written = addCommandToPlugin(opts.name, cmdName, pluginOut);
      let display;
      try { display = relative(process.cwd(), written); } catch { display = written; }
      console.log(`  updated  ${display}`);
      console.log(`\nDone. Command "${cmdName}" skeleton appended.\n`);
    } catch (e) {
      process.stderr.write(`Error: ${e.message}\n`);
      process.exit(1);
    }
    process.exit(0);
  }

  console.log(`\n@lhi/ursamu-dev scaffold — creating plugin "${opts.name}"\n`);

  if (opts.dryRun) {
    const files = describeFiles(opts.name, opts);
    console.log("Would create:");
    for (const f of files) {
      let display;
      try { display = relative(process.cwd(), f); }
      catch { display = f; }
      console.log(`  ${display}`);
    }
    console.log("\nDry run — no files written.\n");
    process.exit(0);
  }

  let written;
  try {
    written = writeScaffold(opts.name, opts);
  } catch (e) {
    process.stderr.write(`Error: ${e.message}\n`);
    process.exit(1);
  }

  for (const f of written) {
    let display;
    try { display = relative(process.cwd(), f); }
    catch { display = f; }
    console.log(`  created  ${display}`);
  }

  console.log(`\nDone. ${written.length} file(s) created.\n`);
  console.log(
    `Next steps:\n` +
    `  1. Fill in your plugin description in index.ts and README.md\n` +
    `  2. Implement the exec() body in commands.ts\n` +
    `  3. Run Stage 0 design with the ursamu-dev skill\n`
  );
}
