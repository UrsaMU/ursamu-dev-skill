---
name: ursamu-dev
description: "Generates idiomatic TypeScript/Deno code for UrsaMU MU* server using the u SDK — commands, plugins, scripts, REST routes, and game hooks — with integrated security and style validation."
risk: low
source: local
date_added: "2026-03-21"
---

## Use this skill when

- Writing or modifying UrsaMU commands (`addCmd`), plugins (`IPlugin`), or system scripts
- Creating game objects, attributes, or database operations with `u.db`
- Implementing REST routes via `registerPluginRoute`
- Listening to engine events via `gameHooks`
- Reviewing UrsaMU code for correctness, style, or security issues
- Any task in the `ursamu/` repository or referencing `jsr:@ursamu/ursamu`

## Do not use this skill when

- Working on non-UrsaMU TypeScript/Deno projects
- Writing plain documentation with no code output
- The task is purely about the Discord bot (use a different skill)

---

## Instructions

You are an expert UrsaMU developer. Every code generation task follows a
**three-stage pipeline**: Generate → Audit → Refine.

### Stage 1 — Generate

Write code that satisfies the requirement using the patterns below.
Full API reference is in `references/api-reference.md` — open it for any
type, method signature, or import path not covered here.

#### Project layout

```
src/commands/        Native addCmd (Deno context, full APIs)
src/plugins/<name>/  Plugin — index.ts exports IPlugin, commands.ts has addCmd
system/scripts/      Sandbox scripts — one file per command, no Deno/net/fs APIs
```

#### Always use the correct import

```typescript
// Public package (outside src/)
import { addCmd, DBO, gameHooks, registerPluginRoute } from "jsr:@ursamu/ursamu";
import type { ICmd, IPlugin, IDBObj, IUrsamuSDK } from "jsr:@ursamu/ursamu";

// Internal plugin (inside src/plugins/<name>/)
import { addCmd } from "../../services/commands/cmdParser.ts";
import type { IUrsamuSDK } from "../../@types/UrsamuSDK.ts";
```

#### Command skeleton

```typescript
addCmd({
  name: "+example",
  pattern: /^\+example(?:\/(\S+))?\s*(.*)/i,  // args[0]=switch, args[1]=rest
  lock: "connected",
  exec: async (u: IUrsamuSDK) => {
    const sw  = (u.cmd.args[0] ?? "").toLowerCase().trim();
    const arg = (u.cmd.args[1] ?? "").trim();
    // ...
  },
});
```

#### Pattern cheat-sheet

| Intent | Pattern | args |
|--------|---------|------|
| No args | `/^inventory$/i` | — |
| One arg | `/^look\s+(.*)/i` | `[0]` |
| Switch + arg | `/^\+cmd(?:\/(\S+))?\s*(.*)/i` | `[0]`=sw, `[1]`=rest |
| Two parts | `/^@name\s+(.+)=(.+)/i` | `[0]`, `[1]` |

#### Lock expressions

| Lock string | Meaning |
|-------------|---------|
| `""` | Login screen (no auth) |
| `"connected"` | Logged-in player |
| `"connected builder+"` | Builder flag or higher |
| `"connected admin+"` | Admin flag or higher |
| `"connected wizard"` | Wizard only |

#### Key SDK calls (memorize these)

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

#### MUSH color quick reference

| Code | Effect |
|------|--------|
| `%ch` | Bold |
| `%cn` | Reset |
| `%cr` | Red |
| `%cg` | Green |
| `%cy` | Cyan/Yellow |
| `%cb` | Blue |
| `%cw` | White |
| `%r` | Newline |

Always end colored strings with `%cn`. Use `u.util.center(title, 78, "=")` for headers.

#### Plugin scaffold

```typescript
// src/plugins/myplugin/index.ts
import "./commands.ts";
import { gameHooks } from "jsr:@ursamu/ursamu";
import type { IPlugin, SessionEvent } from "jsr:@ursamu/ursamu";

const onLogin = ({ actorId, actorName }: SessionEvent) => { /* ... */ };

export const plugin: IPlugin = {
  name: "myplugin", version: "1.0.0",
  init:   () => { gameHooks.on("player:login", onLogin); return true; },
  remove: () => { gameHooks.off("player:login", onLogin); },
};
```

#### DBO collection (plugin-scoped storage)

```typescript
interface IMyRecord { id: string; playerId: string; text: string; date: number; }
const records = new DBO<IMyRecord>("myplugin.records");

await records.create({ id: crypto.randomUUID(), playerId: u.me.id, text: arg, date: Date.now() });
const all = await records.find({ playerId: u.me.id });
await records.update({ id: recordId }, { text: "updated" });
await records.delete({ id: recordId });
```

#### System script (system/scripts/)

```typescript
// ESM style — recommended
export default async (u: IUrsamuSDK) => {
  // No Deno APIs, no network, no filesystem
  // u.mail is available here (not in addCmd)
};
export const aliases = ["alt-name"];
```

---

### Stage 2 — Security & Style Audit

After writing code, internally verify every item below.
Then output the **Audit Report** (required for every response).

#### Checklist

- [ ] **Input sanitization** — user-supplied strings passed to length checks or DB keys
  must go through `u.util.stripSubs()` first
- [ ] **Permission guard** — if modifying an object other than `u.me`, call
  `await u.canEdit(u.me, target)` first
- [ ] **Atomic DB writes** — use `"$set"` / `"$inc"` / `"$unset"`, never overwrite
  the whole `data` object blindly unless intentional
- [ ] **Null checks** — `u.util.target()` returns `null`; always guard before use
- [ ] **Admin-only actions** — check `u.me.flags` explicitly; the SDK does NOT enforce privilege
- [ ] **Sandbox safety** — scripts in `system/scripts/` must not reference Deno, fetch,
  `Deno.readFile`, or any global not on the `u` object
- [ ] **Color reset** — all colored strings end with `%cn`
- [ ] **Correct op string** — `u.db.modify` third arg is `"$set"` | `"$unset"` | `"$inc"` only
- [ ] **Import path** — internal plugins use relative imports; external use `jsr:@ursamu/ursamu`

#### Audit Report format (always output this)

```
### Audit: ursamu-dev
- Security ........ PASSED / FAILED — <reason if failed>
- Permissions ..... PASSED / FAILED — <reason>
- DB integrity .... PASSED / FAILED — <reason>
- Sandbox safety .. PASSED / N/A   — <reason>
- Style & color ... PASSED / FAILED — <reason>
```

If any item is FAILED, output the fixed code immediately after the report.

---

### Stage 3 — Refine

If the audit found issues, rewrite only the affected sections and re-run the
checklist mentally before presenting the final code.

---

## Full example — "+gold" (admin give-gold command)

```typescript
// src/commands/gold.ts
import { addCmd } from "../../services/commands/cmdParser.ts";
import type { IUrsamuSDK } from "../../@types/UrsamuSDK.ts";

export default () =>
  addCmd({
    name: "+gold",
    pattern: /^\+gold\s+(.+)=(.+)/i,
    lock: "connected admin+",
    exec: async (u: IUrsamuSDK) => {
      const rawName = u.util.stripSubs(u.cmd.args[0]).trim();
      const amount  = parseInt(u.cmd.args[1], 10);

      if (isNaN(amount) || amount <= 0) {
        u.send("%crAmount must be a positive integer.%cn");
        return;
      }

      const target = await u.util.target(u.me, rawName, true);
      if (!target) { u.send("Target not found."); return; }

      await u.db.modify(target.id, "$inc", { "data.gold": amount });

      u.send(`%chYou give ${amount} gold to ${u.util.displayName(target, u.me)}.%cn`);
      u.send(
        `%ch${u.util.displayName(u.me, target)} gives you ${amount} gold.%cn`,
        target.id,
      );
    },
  });
```

```
### Audit: ursamu-dev
- Security ........ PASSED — stripSubs applied to name arg
- Permissions ..... PASSED — lock: "connected admin+" enforced by engine
- DB integrity .... PASSED — $inc prevents race conditions
- Sandbox safety .. N/A   — native addCmd context
- Style & color ... PASSED — all %c* sequences closed with %cn
```

---

## Quick reference links

- Full API (types, all methods): `references/api-reference.md`
- rhost-vision layout helpers: see api-reference.md § rhost-vision Plugin
- gameHooks event payloads: see api-reference.md § GameHooks
- REST endpoints: see api-reference.md § REST API
- OpenCode installation: `references/opencode.md`
