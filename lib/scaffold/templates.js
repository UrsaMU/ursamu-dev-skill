/**
 * lib/scaffold/templates.js
 *
 * Template strings for all scaffold-generated files.
 * Each template function takes a name string and returns the file content.
 *
 * Substitution variables:
 *   <name>  - lowercase plugin name (e.g. "greeter")
 *   <Name>  - capitalized plugin name (e.g. "Greeter")
 */

/** Capitalize first letter only */
function cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── index.ts ─────────────────────────────────────────────────────────────────

/**
 * @param {string} name
 * @param {object} opts
 * @param {boolean} [opts.withRoutes]
 * @param {string}  [opts.denoJsonRelPath]  - relative path from plugin dir to deno.json
 * @returns {string}
 */
export function indexTemplate(name, opts = {}) {
  const routeImport = opts.withRoutes
    ? `import { routeHandler } from "./routes.ts";\n`
    : "";
  const routeRegister = opts.withRoutes
    ? `\n    registerPluginRoute("/api/v1/${name}", routeHandler);`
    : "";
  const routeNote = opts.withRoutes
    ? "\n    // Note: REST routes persist until server restart and cannot be hot-unloaded."
    : "";
  const routeValueImport = opts.withRoutes
    ? `import { registerPluginRoute } from "jsr:@ursamu/ursamu";\n`
    : "";

  if (opts.denoJsonRelPath !== undefined && opts.denoJsonRelPath !== null) {
    // Guard against template injection: only allow characters that are valid in
    // relative filesystem paths and safe to embed inside a double-quoted string.
    // Reject anything that could break out of the import literal (", `, \n, \0).
    if (!/^[a-zA-Z0-9_.\/\-]+$/.test(opts.denoJsonRelPath)) {
      throw new Error(
        `Invalid denoJsonRelPath "${opts.denoJsonRelPath}": ` +
        "path must contain only letters, digits, '.', '/', '-', or '_'."
      );
    }
  }

  const denoImport = opts.denoJsonRelPath
    ? `import denoConfig from "${opts.denoJsonRelPath}" with { type: "json" };\n`
    : "";
  const versionValue = opts.denoJsonRelPath
    ? `denoConfig.version`
    : `"1.0.0"`;

  return `import "./commands.ts";
import type { IPlugin } from "jsr:@ursamu/ursamu";
// import type { SessionEvent } from "jsr:@ursamu/ursamu"; // needed for event handler types
// import { gameHooks } from "jsr:@ursamu/ursamu";          // uncomment to use event hooks
${routeValueImport}import { registerHelpDir } from "jsr:@ursamu/help-plugin";
${denoImport}${routeImport}
// Named handler reference — required so remove() can call gameHooks.off()
// with the exact same function reference used in init().
// const on${cap(name)}Login = ({ actorId, actorName }: SessionEvent) => {
//   /* ... */
// };

export const plugin: IPlugin = {
  name: "${name}",
  version: ${versionValue},
  description: "TODO: one-sentence description of ${name}.",

  init: () => {
    registerHelpDir(new URL("./help", import.meta.url).pathname, "${name}");
    // gameHooks.on("player:login", on${cap(name)}Login);${routeRegister}${routeNote}
    return true;
  },

  remove: () => {
    // gameHooks.off("player:login", on${cap(name)}Login);
  },
};
`;
}

// ── commands.ts ──────────────────────────────────────────────────────────────

/**
 * @param {string} name
 * @returns {string}
 */
export function commandsTemplate(name) {
  return `import { addCmd } from "jsr:@ursamu/ursamu";
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

addCmd({
  name: "+${name}",
  pattern: /^\\+${name}(?:\\/(\\S+))?\\s*(.*)/i,
  lock: "connected",
  category: "${cap(name)}",
  help: \`+${name}[/switch] <arg>  — TODO: description.

Switches:
  /switch   TODO: describe this switch.

Examples:
  +${name} example          Does the thing.
  +${name}/switch example   Does the other thing.\`,
  // deno-lint-ignore require-await
  exec: async (u: IUrsamuSDK) => {
    const _sw = (u.cmd.args[0] ?? "").toLowerCase().trim();
    const arg = u.util.stripSubs(u.cmd.args[1] ?? "").trim();
    if (!arg) { u.send(\`Usage: +${name} <arg>\`); return; }
    // TODO: implement ${name} logic
    u.send(\`${cap(name)}: \${arg}\`);
  },
});
`;
}

// ── addCmd block (for --add-command) ─────────────────────────────────────────

/**
 * Generate a single addCmd() block skeleton for appending to an existing commands.ts.
 *
 * @param {string} commandName - e.g. "+bbs-post" or "bbs-post"
 * @returns {string}
 */
export function commandBlockTemplate(commandName) {
  // Whitelist: optional leading "+", then a lowercase letter, then
  // lowercase letters / digits / hyphens only.  Reject anything else
  // before it reaches the template string — defence-in-depth so this
  // function is safe even when called programmatically outside the CLI.
  if (typeof commandName !== "string" || !/^\+?[a-z][a-z0-9-]*$/.test(commandName)) {
    throw new Error(
      `Invalid command name "${commandName}": must be lowercase letters, digits, ` +
      `and hyphens, optionally prefixed with "+" (e.g. "+bbs-post").`
    );
  }

  // Derive a safe identifier from the command name for use in pattern/exec
  const safeId = commandName.replace(/[^a-zA-Z0-9]/g, "");
  const escapedName = commandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `addCmd({
  name: "${commandName}",
  pattern: /^${escapedName}(?:\\/(\\S+))?\\s*(.*)/i,
  lock: "connected",
  category: "TODO",
  help: \`${commandName}[/switch] <arg>  — TODO: description.

Switches:
  /switch   TODO: describe this switch.

Examples:
  ${commandName} example          Does the thing.
  ${commandName}/switch example   Does the other thing.\`,
  exec: async (u: IUrsamuSDK) => {
    const _sw = (u.cmd.args[0] ?? "").toLowerCase().trim();
    const arg = u.util.stripSubs(u.cmd.args[1] ?? "").trim();
    if (!arg) { u.send(\`Usage: ${commandName} <arg>\`); return; }
    // TODO: implement ${safeId} logic
    u.send(\`${commandName}: \${arg}\`);
  },
});`;
}

// ── routes.ts ────────────────────────────────────────────────────────────────

/**
 * @param {string} name
 * @returns {string}
 */
export function routesTemplate(name) {
  return `/**
 * Handler for all /api/v1/${name} routes.
 * Registered in init() via registerPluginRoute().
 *
 * Note: this route persists until server restart and cannot be hot-unloaded.
 */
// deno-lint-ignore require-await
export async function routeHandler(req: Request, userId: string | null): Promise<Response> {
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const _url   = new URL(req.url);
  const method = req.method;

  if (method === "GET") {
    return Response.json({ ok: true, plugin: "${name}" });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}
`;
}

// ── tests/<name>.test.ts ──────────────────────────────────────────────────────

/**
 * @param {string} name
 * @returns {string}
 */
export function testTemplate(name) {
  return `// deno-lint-ignore-file require-await
// Uncomment assertions and add imports once exec is implemented:
// import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { mockU } from "./helpers/mockU.ts";

// TODO: Export the exec function from ../commands.ts and import it here.
// Example:
//   export let ${name}Exec: (u: IUrsamuSDK) => Promise<void>;
//   addCmd({ ..., exec: async (u) => { ${name}Exec = ...; await ${name}Exec(u); } });
// Or refactor exec into a named export:
//   export async function ${name}Exec(u: IUrsamuSDK) { ... }

describe("+${name} command", () => {
  it("happy path — produces correct output", async () => {
    const _u = mockU({ args: ["", "example"] });
    // TODO: await ${name}Exec(_u);
    // assertEquals(_u._sent[0], "${cap(name)}: example");
  });

  it("empty arg — sends usage hint", async () => {
    const _u = mockU({ args: ["", ""] });
    // TODO: await ${name}Exec(_u);
    // assertStringIncludes(_u._sent[0], "Usage:");
  });

  it("null target — graceful not-found message", async () => {
    const _u = mockU({ args: ["", "unknown"], targetResult: null });
    // TODO: await ${name}Exec(_u);
    // assertStringIncludes(_u._sent[0], "not found");
  });

  it("permission denied — canEdit false → no DB write", async () => {
    const _u = mockU({ args: ["", "example"], canEditResult: false });
    // TODO: await ${name}Exec(_u);
    // assertStringIncludes(_u._sent[0], "denied");
    // assertEquals(_u._dbCalls.length, 0);
  });
});
`;
}

// ── tests/helpers/mockU.ts ────────────────────────────────────────────────────
// Verbatim mockU/mockPlayer helper from SKILL.md Stage 4.

/**
 * @returns {string}
 */
export function mockUTemplate() {
  return `// deno-lint-ignore-file require-await
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

// IDBObj mirrors the internal shape from @ursamu/ursamu — not yet in public exports.
type IDBObj = {
  id: string;
  name?: string;
  flags: Set<string>;
  location?: string;
  state: Record<string, unknown>;
  contents: IDBObj[];
};

export function mockPlayer(overrides: Partial<IDBObj> = {}): IDBObj {
  return {
    id: "1", name: "TestPlayer",
    flags: new Set(["player", "connected"]),
    state: {}, location: "2", contents: [],
    ...overrides,
  };
}

export function mockU(opts: {
  me?: Partial<IDBObj>;
  args?: string[];
  targetResult?: IDBObj | null;
  canEditResult?: boolean;
  dbModify?: (...a: unknown[]) => Promise<void>;
} = {}) {
  const sent: string[] = [];
  const dbCalls: unknown[][] = [];
  return Object.assign({
    me: mockPlayer(opts.me ?? {}),
    here: { ...mockPlayer({ id: "2", name: "Room", flags: new Set(["room"]) }),
            broadcast: () => {} },
    cmd: { name: "", original: "", args: opts.args ?? [], switches: [] },
    send: (m: string) => sent.push(m),
    broadcast: () => {},
    canEdit: async () => opts.canEditResult ?? true,
    db: {
      modify: async (...a: unknown[]) => { dbCalls.push(a); await opts.dbModify?.(...a); },
      search: async () => [],
      create: async (d: unknown) => ({ ...(d as object), id: "99", flags: new Set(), contents: [] }),
      destroy: async () => {},
    },
    util: {
      target: async () => opts.targetResult ?? null,
      displayName: (o: IDBObj) => o.name ?? "Unknown",
      stripSubs: (s: string) => s.replace(/%c[a-z]/gi, "").replace(/%[rntb]/gi, ""),
      center: (s: string) => s,
      ljust: (s: string, w: number) => s.padEnd(w),
      rjust: (s: string, w: number) => s.padStart(w),
      sprintf: (f: string) => f,
    },
  } as unknown as IUrsamuSDK, { _sent: sent, _dbCalls: dbCalls });
}
`;
}

// ── help/<name>.md ────────────────────────────────────────────────────────────

/**
 * Markdown help file registered via registerHelpDir().
 * Mirrors the inline help: field in commands.ts at higher priority.
 *
 * @param {string} name
 * @returns {string}
 */
export function helpFileTemplate(name) {
  return `# +${name}

> TODO: one-sentence description of what +${name} does.

## Syntax

    +${name}[/switch] <arg>

## Switches

| Switch | Description |
|--------|-------------|
| \`/switch\` | TODO: describe this switch. |

## Examples

    +${name} example
    +${name}/switch example

## See Also

- \`help ${name}\` — this section overview
`;
}

// ── README.md ─────────────────────────────────────────────────────────────────

/**
 * @param {string} name
 * @param {object} opts
 * @param {boolean} [opts.withRoutes]
 * @returns {string}
 */
export function readmeTemplate(name, opts = {}) {
  const routesSection = opts.withRoutes
    ? `
## REST Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | \`/api/v1/${name}\` | required | TODO: describe |

> Note: REST routes registered in \`init()\` persist until server restart and cannot be hot-unloaded.
`
    : `
## REST Routes

_(none)_
`;

  return `# ${cap(name)} Plugin

> TODO: one-sentence description of what this plugin does.

## Commands

| Command | Syntax | Lock | Description |
|---------|--------|------|-------------|
| \`+${name}\` | \`+${name}[/switch] <arg>\` | connected | TODO |

## Events

| Event | Handler | Action |
|-------|---------|--------|
| _(none)_ | — | — |

## Storage

| Collection | Schema | Purpose |
|------------|--------|---------|
| _(none yet)_ | — | — |
${routesSection}
## Notes

- Commands registered via \`addCmd()\` are not unregistered when the plugin is removed.
`;
}
