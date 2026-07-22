/**
 * Official package name reservation — catalog + scaffold validateName/writeScaffold.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join, resolve } from "path";
import {
  getOfficialPackage,
  isOfficialPackageName,
  listOfficialPackageNames,
  assertNotOfficialName,
  formatOfficialNameError,
  OFFICIAL_PACKAGES,
} from "../../lib/official-packages.js";
import { validateName, writeScaffold } from "../../lib/scaffold/writer.js";
import { parseArgs as parseScaffoldArgs } from "../../bin/scaffold.js";

const TMP = resolve("__tests__/scaffold/__tmp_official__");

before(() => { mkdirSync(TMP, { recursive: true }); });
after(() => { rmSync(TMP, { recursive: true, force: true }); });

// ── Catalog ──────────────────────────────────────────────────────────────────

describe("official-packages catalog", () => {
  it("includes core feature packages", () => {
    for (const name of ["mail", "bbs", "combat", "jobs", "help", "channels", "builder", "wiki"]) {
      assert.ok(isOfficialPackageName(name), `expected ${name} reserved`);
      assert.ok(getOfficialPackage(name).jsr.startsWith("@ursamu/"));
    }
  });

  it("includes aliases (channel → channels, map-plugin)", () => {
    assert.equal(getOfficialPackage("channel").jsr, "@ursamu/channels");
    assert.equal(getOfficialPackage("map-plugin").jsr, "@ursamu/map-plugin");
    assert.equal(getOfficialPackage("ai-gm").jsr, "@ursamu/ai-gm");
  });

  it("returns null for custom plugin names", () => {
    assert.equal(getOfficialPackage("greeter"), null);
    assert.equal(getOfficialPackage("faction-board"), null);
    assert.equal(isOfficialPackageName("my-plugin"), false);
  });

  it("listOfficialPackageNames is sorted and non-empty", () => {
    const names = listOfficialPackageNames();
    assert.ok(names.length >= 20);
    assert.deepEqual(names, [...names].sort());
  });

  it("formatOfficialNameError mentions install and --force", () => {
    const msg = formatOfficialNameError("mail", OFFICIAL_PACKAGES.mail);
    assert.match(msg, /@ursamu\/mail/);
    assert.match(msg, /ursamu plugin install/);
    assert.match(msg, /--force/);
  });

  it("assertNotOfficialName throws without force", () => {
    assert.throws(() => assertNotOfficialName("bbs"), /official UrsaMU package/);
  });

  it("assertNotOfficialName allows force", () => {
    assert.doesNotThrow(() => assertNotOfficialName("bbs", { force: true }));
  });

  it("assertNotOfficialName no-ops for free names", () => {
    assert.doesNotThrow(() => assertNotOfficialName("greeter"));
  });
});

// ── validateName ─────────────────────────────────────────────────────────────

describe("validateName official reservation", () => {
  it("rejects mail, bbs, combat", () => {
    assert.throws(() => validateName("mail"), /@ursamu\/mail/);
    assert.throws(() => validateName("bbs"), /@ursamu\/bbs/);
    assert.throws(() => validateName("combat"), /@ursamu\/combat/);
  });

  it("still rejects invalid syntax before official check", () => {
    assert.throws(() => validateName("Mail"), /invalid plugin name/i);
  });

  it("allows official names with force: true", () => {
    assert.doesNotThrow(() => validateName("mail", { force: true }));
    assert.doesNotThrow(() => validateName("jobs", { force: true }));
  });

  it("still accepts greeter", () => {
    assert.doesNotThrow(() => validateName("greeter"));
  });
});

// ── writeScaffold ────────────────────────────────────────────────────────────

describe("writeScaffold refuses official names", () => {
  it("does not create files for mail without force", () => {
    const out = join(TMP, "mail-blocked");
    assert.throws(() => writeScaffold("mail", { out }), /@ursamu\/mail/);
    assert.ok(!existsSync(join(out, "index.ts")));
  });

  it("creates files for mail with force", () => {
    const out = join(TMP, "mail-forced");
    const written = writeScaffold("mail", { out, force: true });
    assert.ok(written.length >= 4);
    assert.ok(existsSync(join(out, "index.ts")));
  });
});

// ── parseArgs --force ────────────────────────────────────────────────────────

describe("scaffold parseArgs --force", () => {
  it("defaults force to false", () => {
    const opts = parseScaffoldArgs(["node", "scaffold.js", "greeter"]);
    assert.equal(opts.force, false);
    assert.equal(opts.name, "greeter");
  });

  it("sets force true", () => {
    const opts = parseScaffoldArgs(["node", "scaffold.js", "mail", "--force"]);
    assert.equal(opts.force, true);
    assert.equal(opts.name, "mail");
  });
});
