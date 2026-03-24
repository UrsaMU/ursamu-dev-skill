/**
 * lib/llm.js
 *
 * Resolves a provider name (or auto-detects from env) to a configured OpenAI
 * client instance + default model string.  All providers speak the OpenAI
 * chat-completions wire format — only the baseURL and key env var differ.
 */

import OpenAI from "openai";

/** @typedef {{ client: OpenAI, model: string, provider: string }} ResolvedProvider */

/**
 * Validate a custom base URL against SSRF risks.
 *
 * Rules (enforced regardless of NODE_ENV):
 *   1. Must parse as a valid URL.
 *   2. Scheme must be "https:".
 *   3. Hostname must not resolve to loopback, link-local, or RFC-1918 ranges.
 *      We check the literal hostname string; DNS rebinding is out of scope for
 *      a CLI tool, but blocking well-known literals covers the common cases.
 *
 * @param {string} raw - The raw base URL string from --base-url
 * @throws {Error} if the URL is unsafe
 */
export function validateBaseURL(raw) {
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`--base-url "${raw}" is not a valid URL.`);
  }

  if (parsed.protocol !== "https:") {
    throw new Error(
      `--base-url must use https:// — got "${parsed.protocol}". ` +
      "Plaintext or non-HTTP schemes risk exposing your API key."
    );
  }

  const host = parsed.hostname.toLowerCase();

  // Loopback / localhost names
  if (host === "localhost" || host === "ip6-localhost") {
    throw new Error(`--base-url hostname "${host}" is a reserved loopback address.`);
  }

  // Parse dotted-decimal IPv4 for range checks
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    const isPrivate =
      a === 127 ||                                // 127.x.x.x  loopback
      a === 10 ||                                 // 10.x.x.x   RFC-1918
      (a === 172 && b >= 16 && b <= 31) ||        // 172.16-31  RFC-1918
      (a === 192 && b === 168) ||                 // 192.168.x  RFC-1918
      (a === 169 && b === 254);                   // 169.254.x  link-local / metadata

    if (isPrivate) {
      throw new Error(
        `--base-url hostname "${host}" is a private, loopback, or reserved address. ` +
        "SSRF to internal networks is not permitted."
      );
    }
  }

  // IPv6 addresses — the WHATWG URL parser wraps them in brackets: [::1]
  // Strip brackets to get the raw address for prefix checks.
  const ipv6raw = host.replace(/^\[|\]$/g, "");

  // ::1 — loopback
  if (ipv6raw === "::1") {
    throw new Error(`--base-url hostname "${ipv6raw}" is a reserved loopback address.`);
  }

  // fc00::/7 — Unique Local (covers fc__ and fd__ first-group prefixes)
  if (ipv6raw.startsWith("fc") || ipv6raw.startsWith("fd")) {
    throw new Error(
      `--base-url hostname "${ipv6raw}" is a private IPv6 address (Unique Local fc00::/7). ` +
      "SSRF to internal networks is not permitted."
    );
  }

  // fe80::/10 — Link-Local (fe80:: through febf::)
  if (ipv6raw.startsWith("fe")) {
    const secondByte = parseInt(ipv6raw.slice(2, 4), 16);
    if (!isNaN(secondByte) && secondByte >= 0x80 && secondByte <= 0xbf) {
      throw new Error(
        `--base-url hostname "${ipv6raw}" is a reserved IPv6 address (Link-Local fe80::/10). ` +
        "SSRF to internal networks is not permitted."
      );
    }
  }
}

const PROVIDERS = {
  openai: {
    baseURL: undefined, // OpenAI SDK default
    keyEnv: "OPENAI_API_KEY",
    defaultModel: "gpt-4o",
  },
  anthropic: {
    baseURL: "https://api.anthropic.com/v1",
    keyEnv: "ANTHROPIC_API_KEY",
    defaultModel: "claude-sonnet-4-6",
  },
  google: {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    keyEnv: "GOOGLE_API_KEY",
    defaultModel: "gemini-2.0-flash",
  },
};

/**
 * Auto-detect provider from which API key env var is set.
 * Preference order: anthropic → google → openai.
 * Returns null if none found.
 *
 * @returns {string|null}
 */
export function detectProvider() {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GOOGLE_API_KEY)     return "google";
  if (process.env.OPENAI_API_KEY)     return "openai";
  return null;
}

/**
 * Resolve a provider configuration and return a ready-to-use OpenAI client.
 *
 * @param {object} opts
 * @param {string} [opts.provider]   - "anthropic" | "google" | "openai" | "custom"
 * @param {string} [opts.model]      - Override default model
 * @param {string} [opts.baseURL]    - Required when provider === "custom"
 * @param {string} [opts.apiKey]     - Override API key (falls back to env var)
 * @returns {ResolvedProvider}
 */
export function resolve({ provider, model, baseURL, apiKey } = {}) {
  const name = provider ?? detectProvider();

  if (!name) {
    throw new Error(
      "No LLM provider detected. Set ANTHROPIC_API_KEY, GOOGLE_API_KEY, or " +
      "OPENAI_API_KEY, or pass --provider with --api-key."
    );
  }

  if (name === "custom") {
    if (!baseURL) throw new Error("--provider custom requires --base-url <url>");
    validateBaseURL(baseURL);
    const key = apiKey ?? process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY;
    if (!key) throw new Error("--provider custom requires --api-key or LLM_API_KEY env var");
    if (!model) throw new Error("--provider custom requires --model <id>");
    return {
      provider: "custom",
      model,
      client: new OpenAI({ baseURL, apiKey: key }),
    };
  }

  const def = PROVIDERS[name];
  if (!def) {
    throw new Error(
      `Unknown provider "${name}". Valid values: ${Object.keys(PROVIDERS).join(", ")}, custom`
    );
  }

  const key = apiKey ?? process.env[def.keyEnv];
  if (!key) {
    throw new Error(
      `Provider "${name}" requires ${def.keyEnv} env var (or pass --api-key).`
    );
  }

  return {
    provider: name,
    model: model ?? def.defaultModel,
    client: new OpenAI({
      ...(def.baseURL ? { baseURL: def.baseURL } : {}),
      apiKey: key,
    }),
  };
}
