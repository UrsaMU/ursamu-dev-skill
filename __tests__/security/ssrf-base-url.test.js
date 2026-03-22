/**
 * Security exploit test — H1: SSRF via --base-url
 *
 * resolve() must reject any baseURL that:
 *   - uses a non-https scheme (http, ftp, file, etc.)
 *   - targets loopback addresses (127.x, ::1)
 *   - targets link-local / cloud-metadata addresses (169.254.x.x, fd*)
 *   - targets RFC-1918 private ranges (10.x, 172.16-31.x, 192.168.x)
 *
 * These tests MUST FAIL before the patch is applied.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "../../lib/llm.js";

const CUSTOM = (baseURL) => ({ provider: "custom", apiKey: "k", model: "m", baseURL });

describe("H1 — SSRF: --base-url validation", () => {
  // ── Scheme enforcement ─────────────────────────────────────────────────────

  it("rejects http:// scheme", () => {
    assert.throws(
      () => resolve(CUSTOM("http://my-llm.example.com/v1")),
      /https/i
    );
  });

  it("rejects file:// scheme", () => {
    assert.throws(
      () => resolve(CUSTOM("file:///etc/passwd")),
      /https/i
    );
  });

  it("rejects ftp:// scheme", () => {
    assert.throws(
      () => resolve(CUSTOM("ftp://evil.example.com")),
      /https/i
    );
  });

  // ── Loopback ───────────────────────────────────────────────────────────────

  it("rejects 127.0.0.1 (loopback)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://127.0.0.1/v1")),
      /private|loopback|reserved/i
    );
  });

  it("rejects localhost (loopback)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://localhost/v1")),
      /private|loopback|reserved/i
    );
  });

  it("rejects 127.99.0.1 (loopback range)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://127.99.0.1/v1")),
      /private|loopback|reserved/i
    );
  });

  // ── Cloud metadata ─────────────────────────────────────────────────────────

  it("rejects 169.254.169.254 (AWS/GCP metadata)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://169.254.169.254/latest/meta-data")),
      /private|loopback|reserved/i
    );
  });

  it("rejects 169.254.0.1 (link-local range)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://169.254.0.1/v1")),
      /private|loopback|reserved/i
    );
  });

  // ── RFC-1918 private ranges ────────────────────────────────────────────────

  it("rejects 10.0.0.1 (private class A)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://10.0.0.1/v1")),
      /private|loopback|reserved/i
    );
  });

  it("rejects 172.16.0.1 (private class B)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://172.16.0.1/v1")),
      /private|loopback|reserved/i
    );
  });

  it("rejects 172.31.255.255 (private class B boundary)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://172.31.255.255/v1")),
      /private|loopback|reserved/i
    );
  });

  it("rejects 192.168.1.1 (private class C)", () => {
    assert.throws(
      () => resolve(CUSTOM("https://192.168.1.1/v1")),
      /private|loopback|reserved/i
    );
  });

  // ── Valid HTTPS should still work ──────────────────────────────────────────

  it("accepts a legitimate https:// base URL", () => {
    assert.doesNotThrow(() =>
      resolve(CUSTOM("https://my-private-llm.example.com/v1"))
    );
  });

  it("accepts Anthropic base URL (https)", () => {
    assert.doesNotThrow(() =>
      resolve({ provider: "anthropic", apiKey: "test-key" })
    );
  });
});
