# Stage 1 — Generate

_Prev: [stage-0-design.md](stage-0-design.md) · Next: [stage-2-audit.md](stage-2-audit.md)_

---


Write code satisfying the confirmed Design Plan using the patterns below.

> **Open `references/api-reference.md` now** if you have not already. It
> contains every type definition, method signature, import path, and pattern
> used below. The snippets in this section are *quick reminders*, not
> substitutes — always verify against the reference before writing final code.

> **If the Design Plan’s `PKG` line reuses an official package**, open
> `references/official-packages.md` and implement against that package’s
> public API (hooks, `registerCombatPorts`, `registerHelpDir`, …). Do not
> copy package internals into `src/plugins/`.

### Project layout

```
src/commands/        Native addCmd (Deno context, full APIs)
src/plugins/<name>/  Plugin — index.ts exports IPlugin, commands.ts has addCmd
packages/<name>/     Monorepo first-party packages (@ursamu/*) — prefer editing here when in-tree
system/scripts/      Sandbox scripts — one file per command, no Deno/net/fs APIs
```

### Code style rules (non-negotiable)

- **Early return** over nested conditions
- **No function longer than 50 lines** — decompose into named helpers
- **No file longer than 200 lines** — split into modules
- **Domain-specific names** — never `utils`, `helpers`, `misc`
- **Library-first** — if the SDK or an official package already does it, use it; don't rewrite
- **No deep nesting** — max 3 levels
- **Typed catch blocks** — `catch (e: unknown)` not bare `catch`

### Always use the correct import

```typescript
// Preferred engine import for new code
import { addCmd, DBO, gameHooks, registerPluginRoute } from "jsr:@ursamu/mush";
import type { ICmd, IPlugin, IDBObj, IUrsamuSDK } from "jsr:@ursamu/mush";

// Official feature packages (see official-packages.md)
import { registerHelpDir } from "jsr:@ursamu/help";
import { registerCombatPorts } from "jsr:@ursamu/combat";
import { jobHooks } from "jsr:@ursamu/jobs";
import mailPlugin from "jsr:@ursamu/mail";

// Legacy alias still seen in older games / scaffolds
import { addCmd, DBO, gameHooks, registerPluginRoute } from "jsr:@ursamu/ursamu";
import type { ICmd, IPlugin, IDBObj, IUrsamuSDK } from "jsr:@ursamu/ursamu";

// Internal plugin (inside src/plugins/<name>/)
import { addCmd } from "../../services/commands/cmdParser.ts";
import type { IUrsamuSDK } from "../../@types/UrsamuSDK.ts";
```

### Command skeleton

```typescript
addCmd({
  name: "+example",
  pattern: /^\+example(?:\/(\S+))?\s*(.*)/i,  // args[0]=switch, args[1]=rest
  lock: "connected",
  category: "General",
  // REQUIRED: full help text — see Stage 5a for format rules.
  // Must include: syntax line, Switches section (if any), and Examples section.
  help: `+example[/<switch>] <required> [<optional>]  — Brief description.

Switches:
  /switch   What this switch does.

Examples:
  +example Alice           Does the thing.
  +example/switch Alice    Does the other thing.`,
  exec: async (u: IUrsamuSDK) => {
    const sw  = (u.cmd.args[0] ?? "").toLowerCase().trim();
    const arg = u.util.stripSubs(u.cmd.args[1] ?? "").trim();
    // ...
  },
});
```

### Pattern cheat-sheet

| Intent | Pattern | args |
|--------|---------|------|
| No args | `/^inventory$/i` | — |
| One arg | `/^look\s+(.*)/i` | `[0]` |
| Switch + arg | `/^\+cmd(?:\/(\S+))?\s*(.*)/i` | `[0]`=sw, `[1]`=rest |
| Two parts | `/^@name\s+(.+)=(.+)/i` | `[0]`, `[1]` |

### Lock expressions

| Lock string | Meaning |
|-------------|---------|
| `""` | Login screen (no auth) |
| `"connected"` | Logged-in player |
| `"connected builder+"` | Builder flag or higher |
| `"connected admin+"` | Admin flag or higher |
| `"connected wizard"` | Wizard only |

### Key SDK calls

```typescript
// Target resolution
const target = await u.util.target(u.me, arg, true);  // true = global search
if (!target) { u.send("Not found."); return; }

// Display name (applies moniker)
u.util.displayName(target, u.me)

// DB writes — op MUST be "$set" | "$unset" | "$inc"
await u.db.modify(target.id, "$set",  { "data.gold": 100 });
await u.db.modify(target.id, "$inc",  { "data.score": 1 });
await u.db.modify(target.id, "$unset",{ "data.tempFlag": "" });

// Strip MUSH codes before storing or measuring
const clean = u.util.stripSubs(u.cmd.args[0]);

// Permission checks
if (!(await u.canEdit(u.me, target))) { u.send("Permission denied."); return; }
const isAdmin = u.me.flags.has("admin") || u.me.flags.has("wizard") || u.me.flags.has("superuser");
```

### MUSH color quick reference

| Code | Effect | Code | Effect |
|------|--------|------|--------|
| `%ch` | Bold | `%cn` | Reset |
| `%cr` | Red | `%cg` | Green |
| `%cb` | Blue | `%cy` | Yellow |
| `%cw` | White | `%cc` | Cyan |
| `%r` | Newline | `%t` | Tab |

Always end colored strings with `%cn`. For framed output, prefer the native layout helpers (v2.3.0+) over hand-rolled `center()` calls:

```typescript
import { header, divider, footer } from "jsr:@ursamu/ursamu";

u.send(header("Character Sheet", u.theme));
u.send(divider("Stats", u.theme));
u.send(footer(u.theme));
```

### Plugin scaffold

```typescript
// src/plugins/myplugin/index.ts
import "./commands.ts";
import { gameHooks } from "jsr:@ursamu/ursamu";
import type { IPlugin, SessionEvent } from "jsr:@ursamu/ursamu";

const onLogin = ({ actorId, actorName }: SessionEvent) => { /* ... */ };

export const plugin: IPlugin = {
  name: "myplugin",
  version: "1.0.0",
  description: "One-sentence description.",
  init:   () => { gameHooks.on("player:login", onLogin); return true; },
  remove: () => { gameHooks.off("player:login", onLogin); },
};
```

---

### Atomic Plugin Architecture

UrsaMU plugins are **self-contained, reversible units**. The architecture enforces a strict separation between three phases:

#### Phase 1 — Module load (side-effect imports)

`index.ts` imports `commands.ts` at the top level. This fires `addCmd()` calls synchronously as the module loads — **before** `init()` is ever called.

```
Module load order:
  import "./commands.ts"   → addCmd() calls run immediately (sync)
  export const plugin      → declares lifecycle hooks
```

**Rule:** Never call `addCmd()` inside `init()`. Command registration is a module-load side effect, not a lifecycle event.

#### Phase 2 — `init()` (async startup)

`init()` runs after all plugins have been module-loaded. Use it for:
- Wiring `gameHooks` listeners (always store the handler reference for `remove()`)
- Calling `registerPluginRoute()` for REST routes
- Seeding default data or validating config
- Returning `false` to abort the plugin without crashing the server

```typescript
// CORRECT: handler stored as named reference so remove() can off() it
const onLogin = (e: SessionEvent) => { /* ... */ };

init: () => {
  gameHooks.on("player:login", onLogin);
  registerPluginRoute("/api/v1/myplugin", routeHandler);
  return true;
}
```

**Rule:** `init()` must return `true` (or `Promise<true>`) on success. Returning `false` disables the plugin gracefully.

#### Phase 3 — `remove()` (teardown / hot-unload)

`remove()` must undo everything `init()` did. This enables hot-unload without a server restart.

```typescript
remove: () => {
  gameHooks.off("player:login", onLogin);  // MUST match exact reference used in init()
  // registerPluginRoute is not reversible — document this if used
}
```

**Rules for `remove()`:**
- Every `gameHooks.on(event, fn)` in `init()` must have a matching `gameHooks.off(event, fn)` in `remove()` using the **same function reference** — not an arrow literal, not a new wrapper.
- `removePluginRoute` does not exist; REST routes registered in `init()` persist until restart. Note this in the plugin README.
- Commands registered via `addCmd()` (module-load phase) are also not unregistered — document if the plugin is intended to be hot-removed.

#### Plugin file layout (enforced)

```
src/plugins/<name>/
├── index.ts          REQUIRED — exports `plugin: IPlugin`, imports commands.ts, calls registerHelpDir()
├── commands.ts       REQUIRED if any commands — all addCmd() calls live here
├── routes.ts         Optional — registerPluginRoute() calls, imported in init()
├── <feature>.ts      Optional — domain logic, imported by commands.ts or routes.ts
├── help/             REQUIRED — help files served by help-plugin FileProvider
│   └── <name>.md     One file per command (or sub-topic)
├── tests/            Optional — Deno tests for this plugin's units
│   └── <name>.test.ts
└── README.md         REQUIRED — see Stage 5c format
```

Auto-discovery rule: The server scans `src/plugins/*/index.ts` at startup. Any file matching that glob is loaded. The exported `plugin` object is optional — the file's side effects (addCmd calls) run regardless.

#### DBO namespace isolation

Each plugin owns its DBO collections under a namespaced prefix:

```typescript
// CORRECT: plugin-scoped namespace
const records = new DBO<IRecord>("myplugin.records");

// WRONG: collides with other plugins or core
const records = new DBO<IRecord>("records");
```

Convention: `<pluginName>.<collectionName>` — always lowercase, dot-separated.

#### gameHooks pairing checklist (Stage 2 audit item)

For every `gameHooks.on()` in `init()`, verify:
- [ ] The handler is a **named const** defined at module scope (not an inline arrow)
- [ ] `remove()` calls `gameHooks.off()` with the **identical reference**
- [ ] Handler performs a null-check on any resolved DB object before acting
- [ ] Handler does not call `u.send()` — it has no socket context; use `gameHooks.emit()` or `mu()` instead

#### Complete minimal plugin (all three phases)

```typescript
// src/plugins/greeter/commands.ts
import { addCmd } from "jsr:@ursamu/ursamu";
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

addCmd({
  name: "+greet",
  pattern: /^\+greet\s+(.*)/i,
  lock: "connected",
  category: "Social",
  help: `+greet <player>  — Send a greeting to another player.

Examples:
  +greet Alice    Greet Alice.
  +greet #5       Greet object #5.`,
  exec: async (u: IUrsamuSDK) => {
    const name = u.util.stripSubs(u.cmd.args[0]).trim();
    const target = await u.util.target(u.me, name, true);
    if (!target) { u.send("Not found."); return; }
    u.send(`You wave to ${u.util.displayName(target, u.me)}.`);
    u.send(`${u.util.displayName(u.me, target)} waves to you.`, target.id);
  },
});
```

```typescript
// src/plugins/greeter/index.ts
import "./commands.ts";                          // Phase 1 — module load
import { gameHooks, registerPluginRoute } from "jsr:@ursamu/ursamu";
import type { IPlugin, SessionEvent } from "jsr:@ursamu/ursamu";

// Named reference — required for remove() to work
const onLogin = ({ actorId, actorName }: SessionEvent) => {
  console.log(`[greeter] ${actorName} connected`);
};

export const plugin: IPlugin = {
  name: "greeter",
  version: "1.0.0",
  description: "Greeting utilities for players.",

  init: () => {                                  // Phase 2 — async startup
    gameHooks.on("player:login", onLogin);
    registerPluginRoute("/api/v1/greeter", async (_req, userId) => {
      if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
      return Response.json({ ok: true });
    });
    return true;
  },

  remove: () => {                                // Phase 3 — teardown
    gameHooks.off("player:login", onLogin);
    // Note: REST route /api/v1/greeter persists until restart
  },
};
```

### v2.x Extension Points

Engine v2.x added four plugin-author hooks that go beyond `addCmd` + `gameHooks`. Use them when the feature genuinely requires cross-cutting behavior — not as the first reach.

#### `engine:ready` — wait until all plugins loaded

Use when your plugin needs to look up another plugin's DBO or call something registered in another plugin's `init()`. Fires once, after every plugin's `init()` and all STARTUP attributes complete.

```typescript
const onReady = async () => {
  const otherStore = new DBO<IFoo>("other-plugin.records");
  await otherStore.find({});  // safe — other-plugin.init() has run
};

init: () => {
  gameHooks.on("engine:ready", onReady);
  return true;
},
remove: () => {
  gameHooks.off("engine:ready", onReady);
}
```

#### `registerCmdMiddleware` — pre-match interception

Use when you need to act on raw input **before** the command parser tries to match it (e.g. channel aliases, intent matching, audit logging). Do **not** use this to register commands.

```typescript
import { registerCmdMiddleware } from "jsr:@ursamu/ursamu";

registerCmdMiddleware(async (ctx, next) => {
  if (await matchChannelAlias(ctx)) return;  // consume — short-circuit
  await next();                                // pass through to next middleware / parser
});
```

Rules:
- Always either call `next()` or intentionally short-circuit
- Middleware is **not** unregisterable in v2.x — register it once at module-load or `init()` and document that the plugin cannot be hot-removed cleanly

#### `registerLockFunc` — custom lock functions

Use to extend lock-expression vocabulary with your plugin's predicates.

```typescript
import { registerLockFunc } from "jsr:@ursamu/ursamu";

registerLockFunc("ingame", (enactor) => enactor.flags.has("connected"));
// Then in lock expressions: "flag(player) && ingame()"
```

Lock expressions support `&&` / `||` short-circuit operators in addition to `&` / `|` (v2.2.0+). Reserved names (`flag`, `attr`, `type`, `is`, `holds`, `perm`) are protected — re-registering silently no-ops.

#### `registerFormatHandler` — pluggable display rendering

Use to override built-in rendering for `NAMEFORMAT`, `DESCFORMAT`, `CONFORMAT`, `EXITFORMAT`, `WHOFORMAT`, `WHOROWFORMAT`, `PSFORMAT`, `PSROWFORMAT` — or invent your own uppercase slot. Resolution order: softcode attribute on target → plugin handler → built-in.

```typescript
import {
  registerFormatHandler,
  unregisterFormatHandler,
} from "jsr:@ursamu/ursamu";

const renderName = (_u, target, _defaultArg) =>
  target.flags.has("admin") ? `★ ${target.name}` : null;  // null = fall through

init: () => {
  registerFormatHandler("NAMEFORMAT", renderName);
  return true;
},
remove: () => {
  unregisterFormatHandler("NAMEFORMAT", renderName);  // MUST pair like gameHooks
}
```

Return `string` to override, `null` to fall through. **Pair `register`/`unregister` with identical references** — same rule as `gameHooks.on`/`off`.

#### `socketId` + `joinSocketToRoom` — post-login socket wiring

`SessionEvent` carries an optional `socketId?: string` (v1.9.27+). Use it with `joinSocketToRoom` to subscribe the new socket to channels or rooms after login:

```typescript
import { joinSocketToRoom } from "jsr:@ursamu/ursamu";

const onLogin = ({ actorId, socketId }: SessionEvent) => {
  if (!socketId) return;
  joinSocketToRoom(socketId, `player:${actorId}`);
};
```

#### Default-loaded plugins (v1.9.32+)

`help`, `builder`, and `channel` are loaded by default. Do not redefine `+help`, `@dig`, `@create`, `@destroy`, `+channel`, or channel-alias prefixes from your plugin.

---

### DBO collection (plugin-scoped storage)

```typescript
interface IMyRecord { id: string; playerId: string; text: string; date: number; }
const records = new DBO<IMyRecord>("myplugin.records");

await records.create({ id: crypto.randomUUID(), playerId: u.me.id, text: arg, date: Date.now() });
const all = await records.find({ playerId: u.me.id });
await records.update({ id: recordId }, { text: "updated" });
await records.delete({ id: recordId });
```

### System script (system/scripts/)

```typescript
// ESM style — recommended
export default async (u: IUrsamuSDK) => {
  // No Deno APIs, no network, no filesystem
};
export const aliases = ["alt-name"];
```

### REST route design rules

- Auth: always check `if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 })`
- Use correct HTTP status codes: 200 GET, 201 POST create, 204 DELETE, 400 bad input, 401 unauth, 404 not found
- Validate and sanitize all request body fields before use
- Never expose internal DB IDs or stack traces in error responses
- Version all routes: `/api/v1/<plugin>/...`

