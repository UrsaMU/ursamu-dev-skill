import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { resolve, detectProvider } from "../../lib/llm.js";

// ── detectProvider ───────────────────────────────────────────────────────────

describe("detectProvider", () => {
  let saved;
  before(() => {
    saved = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY:    process.env.GOOGLE_API_KEY,
      OPENAI_API_KEY:    process.env.OPENAI_API_KEY,
    };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });
  after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v !== undefined) process.env[k] = v;
      else delete process.env[k];
    }
  });

  it("returns null when no env vars are set", () => {
    assert.equal(detectProvider(), null);
  });

  it("prefers anthropic over google and openai", () => {
    process.env.ANTHROPIC_API_KEY = "ant-key";
    process.env.GOOGLE_API_KEY    = "goog-key";
    process.env.OPENAI_API_KEY    = "oai-key";
    assert.equal(detectProvider(), "anthropic");
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("falls back to google when only GOOGLE_API_KEY set", () => {
    process.env.GOOGLE_API_KEY = "goog-key";
    assert.equal(detectProvider(), "google");
    delete process.env.GOOGLE_API_KEY;
  });

  it("falls back to openai when only OPENAI_API_KEY set", () => {
    process.env.OPENAI_API_KEY = "oai-key";
    assert.equal(detectProvider(), "openai");
    delete process.env.OPENAI_API_KEY;
  });
});

// ── resolve ──────────────────────────────────────────────────────────────────

describe("resolve", () => {
  it("throws when no provider can be determined", () => {
    const saved = {
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY:    process.env.GOOGLE_API_KEY,
      OPENAI_API_KEY:    process.env.OPENAI_API_KEY,
    };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.OPENAI_API_KEY;

    assert.throws(() => resolve(), /No LLM provider detected/);

    for (const [k, v] of Object.entries(saved)) {
      if (v !== undefined) process.env[k] = v;
    }
  });

  it("resolves anthropic with correct baseURL and default model", () => {
    const result = resolve({ provider: "anthropic", apiKey: "test-key" });
    assert.equal(result.provider, "anthropic");
    assert.equal(result.model, "claude-sonnet-4-6");
    assert.ok(result.client);
  });

  it("resolves google with correct baseURL and default model", () => {
    const result = resolve({ provider: "google", apiKey: "test-key" });
    assert.equal(result.provider, "google");
    assert.equal(result.model, "gemini-2.0-flash");
    assert.ok(result.client);
  });

  it("resolves openai with default model", () => {
    const result = resolve({ provider: "openai", apiKey: "test-key" });
    assert.equal(result.provider, "openai");
    assert.equal(result.model, "gpt-4o");
    assert.ok(result.client);
  });

  it("respects --model override", () => {
    const result = resolve({ provider: "anthropic", apiKey: "test-key", model: "claude-opus-4-6" });
    assert.equal(result.model, "claude-opus-4-6");
  });

  it("resolves custom provider with all required opts", () => {
    const result = resolve({
      provider: "custom",
      apiKey: "test-key",
      baseURL: "https://my.llm/v1",
      model: "my-model",
    });
    assert.equal(result.provider, "custom");
    assert.equal(result.model, "my-model");
  });

  it("throws for custom provider without baseURL", () => {
    assert.throws(
      () => resolve({ provider: "custom", apiKey: "k", model: "m" }),
      /--provider custom requires --base-url/
    );
  });

  it("throws for custom provider without model", () => {
    assert.throws(
      () => resolve({ provider: "custom", apiKey: "k", baseURL: "https://x.com" }),
      /--provider custom requires --model/
    );
  });

  it("throws for unknown provider name", () => {
    assert.throws(
      () => resolve({ provider: "bogus", apiKey: "k" }),
      /Unknown provider/
    );
  });

  it("throws when api key is missing for a known provider", () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    assert.throws(() => resolve({ provider: "anthropic" }), /ANTHROPIC_API_KEY/);
    if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
  });
});
