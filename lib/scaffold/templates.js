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
  const routeImportDecl = opts.withRoutes
    ? `, registerPluginRoute`
    : "";

  return `import "./commands.ts";
import { gameHooks${routeImportDecl} } from "jsr:@ursamu/ursamu";
import type { IPlugin, SessionEvent } from "jsr:@ursamu/ursamu";
${routeImport}
// Named handler reference — required so remove() can call gameHooks.off()
// with the exact same function reference used in init().
// const on${cap(name)}Login = ({ actorId, actorName }: SessionEvent) => {
//   /* ... */
// };

export const plugin: IPlugin = {
  name: "${name}",
  version: "1.0.0",
  description: "TODO: one-sentence description of ${name}.",

  init: () => {
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
  exec: async (u: IUrsamuSDK) => {
    const sw  = (u.cmd.args[0] ?? "").toLowerCase().trim();
    const arg = u.util.stripSubs(u.cmd.args[1] ?? "").trim();
    if (!arg) { u.send(\`Usage: +${name} <arg>\`); return; }
    // TODO: implement ${name} logic
    u.send(\`${cap(name)}: \${arg}\`);
  },
});
`;
}

// ── routes.ts ────────────────────────────────────────────────────────────────

/**
 * @param {string} name
 * @returns {string}
 */
export function routesTemplate(name) {
  return `import type { IDBObj } from "jsr:@ursamu/ursamu";

/**
 * Handler for all /api/v1/${name} routes.
 * Registered in init() via registerPluginRoute().
 *
 * Note: this route persists until server restart and cannot be hot-unloaded.
 */
export async function routeHandler(req: Request, userId: string | null): Promise<Response> {
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url    = new URL(req.url);
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
  return `import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { mockU, mockPlayer } from "./helpers/mockU.ts";

// TODO: Export the exec function from ../commands.ts and import it here.
// Example:
//   export let ${name}Exec: (u: IUrsamuSDK) => Promise<void>;
//   addCmd({ ..., exec: async (u) => { ${name}Exec = ...; await ${name}Exec(u); } });
// Or refactor exec into a named export:
//   export async function ${name}Exec(u: IUrsamuSDK) { ... }

describe("+${name} command", () => {
  it("happy path — produces correct output", async () => {
    const u = mockU({ args: ["", "example"] });
    // TODO: await ${name}Exec(u);
    // assertEquals(u._sent[0], "${cap(name)}: example");
  });

  it("empty arg — sends usage hint", async () => {
    const u = mockU({ args: ["", ""] });
    // TODO: await ${name}Exec(u);
    // assertStringIncludes(u._sent[0], "Usage:");
  });

  it("null target — graceful not-found message", async () => {
    const u = mockU({ args: ["", "unknown"], targetResult: null });
    // TODO: await ${name}Exec(u);
    // assertStringIncludes(u._sent[0], "not found");
  });

  it("permission denied — canEdit false → no DB write", async () => {
    const u = mockU({ args: ["", "example"], canEditResult: false });
    // TODO: await ${name}Exec(u);
    // assertStringIncludes(u._sent[0], "denied");
    // assertEquals(u._dbCalls.length, 0);
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
  return `import type { IDBObj, IUrsamuSDK } from "jsr:@ursamu/ursamu";

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
