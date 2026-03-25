/**
 * EXPLOIT TEST — TemplateInjection: denoJsonRelPath in indexTemplate
 *
 * Vulnerability: indexTemplate() embeds opts.denoJsonRelPath directly into a
 * TypeScript import string with no sanitization:
 *
 *   `import denoConfig from "${opts.denoJsonRelPath}" with { type: "json" };`
 *
 * A caller who passes a crafted string containing `"` or a newline can break
 * out of the import literal and inject arbitrary content into the generated
 * index.ts.
 *
 * These tests MUST FAIL before the patch is applied (Red Phase).
 * After the patch they must all PASS (Green Phase).
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { indexTemplate } from "../../lib/scaffold/templates.js";

describe("TemplateInjection — denoJsonRelPath in indexTemplate", () => {
  test("[Red] double-quote in path is rejected", () => {
    assert.throws(
      () => indexTemplate("foo", { denoJsonRelPath: '"../../evil' }),
      /invalid|unsafe|path/i,
      "must throw on denoJsonRelPath containing a double quote"
    );
  });

  test("[Red] newline in path is rejected", () => {
    assert.throws(
      () => indexTemplate("foo", { denoJsonRelPath: "../deno.json\nimport evil from 'evil'" }),
      /invalid|unsafe|path/i,
      "must throw on denoJsonRelPath containing a newline"
    );
  });

  test("[Red] null byte in path is rejected", () => {
    assert.throws(
      () => indexTemplate("foo", { denoJsonRelPath: "../deno.json\x00evil" }),
      /invalid|unsafe|path/i,
      "must throw on denoJsonRelPath containing a null byte"
    );
  });

  test("[Red] backtick in path is rejected", () => {
    assert.throws(
      () => indexTemplate("foo", { denoJsonRelPath: "`../../evil`" }),
      /invalid|unsafe|path/i,
      "must throw on denoJsonRelPath containing a backtick"
    );
  });

  test("[Safe] normal relative path is accepted", () => {
    assert.doesNotThrow(
      () => indexTemplate("foo", { denoJsonRelPath: "../../../deno.json" }),
      "normal relative path must be accepted"
    );
  });

  test("[Safe] nested relative path is accepted", () => {
    assert.doesNotThrow(
      () => indexTemplate("foo", { denoJsonRelPath: "../../deno.json" }),
      "two-level relative path must be accepted"
    );
  });

  test("[Safe] no denoJsonRelPath (undefined) uses fallback version", () => {
    const out = indexTemplate("foo");
    assert.ok(out.includes('"1.0.0"'), "must fall back to string version literal");
    assert.ok(!out.includes("denoConfig"), "must not reference denoConfig");
  });
});
