/**
 * Validates that scaffold-generated TypeScript files pass `deno lint` and
 * `deno check`. Skips gracefully when Deno is not installed so local Node-only
 * development is unaffected.  In CI, the deno install step ensures Deno is
 * present and both checks must pass.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "child_process";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  indexTemplate,
  commandsTemplate,
  routesTemplate,
  testTemplate,
  mockUTemplate,
} from "../../lib/scaffold/templates.js";

// ── helpers ───────────────────────────────────────────────────────────────────

function denoVersion() {
  const r = spawnSync("deno", ["--version"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.split("\n")[0].trim() : null;
}

const DENO = denoVersion();

/**
 * A minimal deno.json placed in each temp scaffold dir.
 *
 * Lint rules excluded and why:
 *
 *   no-unversioned-import — scaffold files live inside a project whose
 *     deno.json manages version pinning via an import map. Requiring versions
 *     in individual source files would conflict with that pattern.
 *
 *   no-import-prefix — same reason: in a real project you'd add the package
 *     to the deno.json imports map and use a bare specifier.  The inline
 *     jsr: form is intentional here so scaffolded files are self-contained
 *     and work even before the import map is configured.
 *
 * nodeModulesDir "auto" — lets Deno resolve npm deps (e.g. lodash inside
 *   @ursamu/mush) without a pre-existing node_modules directory.
 *
 * The "imports" map stubs @ursamu/help (and a thin mush types stub) locally so
 * deno check can type-check scaffold output without hitting JSR.
 */
const DENO_JSON = JSON.stringify({
  nodeModulesDir: "auto",
  imports: {
    "jsr:@ursamu/help": "./stubs/help.ts",
    "jsr:@ursamu/mush": "./stubs/mush.ts",
  },
  lint: {
    rules: {
      exclude: ["no-unversioned-import", "no-import-prefix"],
    },
  },
}, null, 2);

/** Minimal stub for @ursamu/help — satisfies the import at type-check time. */
const HELP_STUB = `export function registerHelpDir(_dir: string, _plugin: string): void {}\n`;

/** Minimal stub for @ursamu/mush — engine types/APIs used by scaffold templates. */
const MUSH_STUB = `export type IPlugin = {
  name: string;
  version: string;
  description?: string;
  init?: () => boolean | Promise<boolean>;
  remove?: () => void | Promise<void>;
};
export type IUrsamuSDK = {
  cmd: { args: string[] };
  send: (m: string) => void;
  util: { stripSubs: (s: string) => string };
};
export function addCmd(_cmd: unknown): void {}
export function registerPluginRoute(_path: string, _handler: unknown): void {}
export function gameHooks(): void {}
`;

function writeFiles(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(dir, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, content, "utf8");
  }
}

/** All .ts files generated for a full scaffold (with routes + tests). */
function scaffoldFiles(dir) {
  return [
    join(dir, "index.ts"),
    join(dir, "commands.ts"),
    join(dir, "routes.ts"),
    join(dir, "tests", "greeter.test.ts"),
    join(dir, "tests", "helpers", "mockU.ts"),
  ];
}

function run(cmd, args, opts) {
  return spawnSync(cmd, args, { encoding: "utf8", ...opts });
}

function buildTmpDir() {
  const dir = mkdtempSync(join(tmpdir(), "ursamu-scaffold-"));
  writeFiles(dir, {
    "deno.json":                     DENO_JSON,
    "stubs/help.ts":                 HELP_STUB,
    "stubs/mush.ts":                 MUSH_STUB,
    "index.ts":                      indexTemplate("greeter"),
    "commands.ts":                   commandsTemplate("greeter"),
    "routes.ts":                     routesTemplate("greeter"),
    "tests/greeter.test.ts":         testTemplate("greeter"),
    "tests/helpers/mockU.ts":        mockUTemplate(),
  });
  return dir;
}

// ── deno lint ─────────────────────────────────────────────────────────────────

describe("scaffold: deno lint", () => {
  let tmpDir;
  before(() => { tmpDir = buildTmpDir(); });
  after(() => rmSync(tmpDir, { recursive: true, force: true }));

  it("generated .ts files pass deno lint", (t) => {
    if (!DENO) { t.skip("deno not installed — skipping lint check"); return; }
    const r = run("deno", ["lint", ...scaffoldFiles(tmpDir)], { cwd: tmpDir });
    assert.strictEqual(
      r.status, 0,
      `deno lint failed:\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
  });
});

// ── deno check ────────────────────────────────────────────────────────────────

describe("scaffold: deno check", () => {
  let tmpDir;

  before(() => {
    tmpDir = buildTmpDir();
    // Pre-resolve JSR + npm deps so deno check can type-check offline/fast
    run("deno", ["install"], { cwd: tmpDir, timeout: 120_000 });
  });

  after(() => rmSync(tmpDir, { recursive: true, force: true }));

  it("generated .ts files pass deno check", (t) => {
    if (!DENO) { t.skip("deno not installed — skipping type check"); return; }
    const r = run(
      "deno", ["check", ...scaffoldFiles(tmpDir)],
      { cwd: tmpDir, timeout: 120_000 }
    );
    assert.strictEqual(
      r.status, 0,
      `deno check failed:\nstdout: ${r.stdout}\nstderr: ${r.stderr}`
    );
  });
});
