---
name: ursamu-dev
description: "Full-cycle UrsaMU development: design → generate → audit → refine → test → docs. Covers commands, plugins, system scripts, REST routes, and game hooks with integrated security validation."
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
- Writing tests or documentation for any of the above
- Any task in the `ursamu/` repository or referencing `jsr:@ursamu/ursamu`

## Do not use this skill when

- Working on non-UrsaMU TypeScript/Deno projects
- The task is purely about the Discord bot (use a different skill)

---

## ⚠ All stages are MANDATORY

Every task — no matter how small — must complete all six stages in order.
**Do not skip, abbreviate, or merge stages.** Each stage has required output.
Proceeding to Stage 1 without completing Stage 0 is a protocol violation.

```
Stage 0 — Design    → REQUIRED output: Design Plan + Decision Log
Stage 1 — Generate  → REQUIRED output: working code
Stage 2 — Audit     → REQUIRED output: Audit Report (all 6 items)
Stage 3 — Refine    → REQUIRED output: fixed code (or "No issues found")
Stage 4 — Test      → REQUIRED output: passing Deno test file
Stage 5 — Docs      → REQUIRED output: help text + JSDoc + README (if plugin)
```

---

## Stage 0 — Design

**Do not write any code during this stage.**
Your role here is design facilitator: slow down just enough to get it right.

### 0a. Understand context first

Before asking any questions, review what already exists:
- Read relevant files in `src/commands/`, `src/plugins/`, `system/scripts/`
- Identify what is being proposed vs. what already exists
- Note implicit constraints (lock levels, sandbox restrictions, existing DB schemas)

### 0b. Clarify requirements (one question at a time)

Ask **one targeted question per message** — prefer multiple-choice.
Resolve all of the following before designing:

| Question | Why it matters |
|----------|---------------|
| What is the feature? | Shapes command name, pattern, lock |
| Native command, plugin, or system script? | Determines available APIs |
| What inputs? (args, switches) | Drives the regex pattern |
| What lock level? | `connected`, `builder+`, `admin+`, `wizard` |
| Which DB collections? | Plan DBO schemas upfront |
| Which `gameHooks` events? | Plugin `init`/`remove` wiring |
| Which REST routes? | Auth requirement, method, path |
| Side-effects on other objects? | Requires `canEdit` + null guards |
| Performance / scale expectations? | Informs whether to cache, paginate, or batch |

### 0c. Identify domain invariants (DDD lens)

Before designing data structures, identify the **rules that must always be true**:
- What state transitions are valid? (e.g. a scene cannot be closed if it has no poses)
- What constraints belong on the game object vs. the command?
- Are there value objects that should be validated at creation (e.g. a gold amount must be > 0)?
- Keep domain behavior in domain objects and commands — not in DB queries or REST handlers

Design aggregate boundaries around invariants, not around convenience.

### 0d. Explore approaches (2–3 options)

Propose 2–3 viable approaches. Lead with your recommendation. For each, state:
- Complexity (low / medium / high)
- Extensibility trade-offs
- Risk
- **YAGNI check** — reject any feature not explicitly needed right now

### 0e. Understanding Lock (hard gate)

Before writing a single line of code, output this block and **wait for confirmation**:

```
## Design Plan: <feature name>

Context:      <native command | plugin: <name> | system script>
Commands:     <+name> (<lock>)  — <description>
Invariants:   <rules that must always hold>
DB:           <collection>: { <schema> }  (or: none)
Hooks:        <event> → <purpose>  (or: none)
REST:         <METHOD /path> (auth: yes/no)  (or: none)
Side-effects: <objects modified besides u.me>  (or: none)
Assumptions:  <explicit list>

## Decision Log
| Decision | Alternatives | Rationale |
|----------|-------------|-----------|
| ...      | ...         | ...       |
```

**Do not proceed to Stage 1 until the user confirms this plan.**

---

## Stage 1 — Generate

Write code satisfying the confirmed Design Plan using the patterns below.
Full API reference is in `references/api-reference.md` — open it for any
type, method signature, or import path not covered here.

### Project layout

```
src/commands/        Native addCmd (Deno context, full APIs)
src/plugins/<name>/  Plugin — index.ts exports IPlugin, commands.ts has addCmd
system/scripts/      Sandbox scripts — one file per command, no Deno/net/fs APIs
```

### Code style rules (non-negotiable)

- **Early return** over nested conditions
- **No function longer than 50 lines** — decompose into named helpers
- **No file longer than 200 lines** — split into modules
- **Domain-specific names** — never `utils`, `helpers`, `misc`
- **Library-first** — if the SDK already does it, use the SDK; don't rewrite
- **No deep nesting** — max 3 levels
- **Typed catch blocks** — `catch (e: unknown)` not bare `catch`

### Always use the correct import

```typescript
// Public package (outside src/)
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
  help: "+example[/<switch>] <arg>  — Brief description.\n\nExamples:\n  +example Alice  Does the thing.",
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

Always end colored strings with `%cn`. Use `u.util.center(title, 78, "=")` for headers.

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

---

## Stage 2 — Security & Style Audit

After writing code, internally verify every item. Output the full **Audit Report** — no items may be omitted.

### Checklist

- [ ] **Input sanitization** — user strings through `u.util.stripSubs()` before DB ops or length checks
- [ ] **Permission guard** — `await u.canEdit(u.me, target)` before modifying others' objects
- [ ] **Atomic DB writes** — `"$set"` / `"$inc"` / `"$unset"` only; never blind full-object overwrite
- [ ] **Null checks** — `u.util.target()` returns `null`; always guard before use
- [ ] **Admin-only actions** — check `u.me.flags` explicitly; the SDK does NOT enforce privilege
- [ ] **Sandbox safety** — `system/scripts/` must not reference Deno, fetch, or any non-`u` global
- [ ] **Color reset** — all colored strings end with `%cn`
- [ ] **Correct op string** — `u.db.modify` third arg is `"$set"` | `"$unset"` | `"$inc"` only
- [ ] **Import path** — internal plugins use relative imports; external use `jsr:@ursamu/ursamu`
- [ ] **Help text** — `help?` field set on every `addCmd` registration

### Audit Report format (ALL 6 items required, no exceptions)

```
### Audit: ursamu-dev
- Security ........ PASSED / FAILED — <reason if failed>
- Permissions ..... PASSED / FAILED — <reason>
- DB integrity .... PASSED / FAILED — <reason>
- Sandbox safety .. PASSED / N/A   — <reason>
- Style & color ... PASSED / FAILED — <reason>
- Help text ....... PASSED / FAILED — <reason>
```

If any item is FAILED → do not output final code yet, go to Stage 3.

---

## Stage 3 — Refine

If the audit found any FAILED items, rewrite **only** the affected sections.
Re-run the full checklist mentally before presenting corrected code.
Output either the corrected code or: `Stage 3: No issues found.`

---

## Stage 4 — Test

Write Deno tests for all generated code. Place in `tests/<feature>.test.ts`
or `src/plugins/<name>/tests/` for plugin tests.

### Mock SDK helper

Define `mockU()` at the top of every test file (or import from `tests/helpers/mockU.ts`):

```typescript
import type { IDBObj, IUrsamuSDK } from "jsr:@ursamu/ursamu";

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
```

### Required test cases (all mandatory)

```typescript
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";

describe("<feature> command", () => {
  it("happy path — correct output and DB call", async () => { /* ... */ });
  it("null target — graceful not-found message", async () => { /* ... */ });
  it("permission denied — canEdit false", async () => { /* ... */ });
  it("DB write — correct op and field path", async () => { /* ... */ });
  it("admin guard — non-admin rejected", async () => { /* ... (if admin cmd) */ });
  it("input sanitization — stripSubs called before DB", async () => { /* ... */ });
});
```

### Coverage requirements

- [ ] Happy path produces correct output
- [ ] Null target is handled (no crash, correct message)
- [ ] Permission denied path does not write to DB
- [ ] DB op is `$set`/`$inc`/`$unset` (never raw assignment)
- [ ] Admin commands reject non-admin callers
- [ ] `stripSubs` is called before any DB key (no MUSH codes in stored data)
- [ ] For plugins: `init()` returns `true`; `remove()` does not throw

### Run tests

```bash
deno test --allow-env tests/
deno test --allow-env src/plugins/<name>/tests/
```

---

## Stage 5 — Docs (REQUIRED — never skip, never abbreviate)

Every piece of generated code ships with all applicable doc forms.
Output each section clearly labeled.

### 5a. In-game help text (every `addCmd`)

Format:

```
+command[/switch] <required> [<optional>]  — One-line description.

Switches:
  /switch   What this switch does.

Examples:
  +command Alice           Does the thing.
  +command/switch Alice    Does the other thing.
```

Embed directly in the `help` field of the `addCmd` registration.

### 5b. JSDoc (all exports, DBO schemas, plugin objects)

```typescript
/**
 * Gives a positive amount of gold to a target player.
 *
 * @param u       UrsaMU SDK context
 *                args[0] = target name or #dbref
 *                args[1] = amount (positive integer)
 * @requires      admin+ flag on caller
 * @sideeffect    Increments `data.gold` on target via `$inc`
 */
async function giveGold(u: IUrsamuSDK): Promise<void> { /* ... */ }
```

### 5c. Plugin README (`src/plugins/<name>/README.md`) — required for every plugin

```markdown
# <Plugin Name>

> One-sentence description of what this plugin does.

## Commands

| Command | Syntax | Lock | Description |
|---------|--------|------|-------------|
| `+cmd` | `+cmd <target>` | connected | What it does |

## Events

| Event | Handler action |
|-------|----------------|
| `player:login` | Sends MOTD to connecting player |

## Storage

| Collection | Schema | Purpose |
|------------|--------|---------|
| `<plugin>.records` | `{ id, playerId, text, date }` | ... |

## REST Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/v1/<plugin>` | Bearer | List caller's records |

## Install

Place in `src/plugins/<name>/` — auto-discovered on next restart.

## Configuration

| Key | Default | Description |
|-----|---------|-------------|
| `plugin.<name>.limit` | `50` | Max records per player |
```

### 5d. REST route contract (every `registerPluginRoute`)

```typescript
/**
 * GET /api/v1/myplugin
 *   Auth:     Bearer JWT required
 *   Response: 200 { data: INote[] }
 *             401 { error: "Unauthorized" }
 *
 * POST /api/v1/myplugin
 *   Body:     { text: string }
 *   Response: 201 { id: string }
 *             400 { error: "text is required" }
 */
registerPluginRoute("/api/v1/myplugin", async (req, userId) => { /* ... */ });
```

### 5e. Inline comments for non-obvious logic

```typescript
// stripSubs first — MUSH color codes must not land in DB keys
const clean = u.util.stripSubs(u.cmd.args[0]).trim();

// $inc is atomic — avoids race if two players trigger simultaneously
await u.db.modify(target.id, "$inc", { "data.score": 1 });

// u.mail only exists in sandbox scripts, not native addCmd
```

---

## Full example — "+gold" (all stages)

### Stage 0 — Design Plan

```
## Design Plan: +gold

Context:      native command (src/commands/gold.ts)
Commands:     +gold <player>=<amount>  (admin+)  — Give gold to a player
Invariants:   amount must be a positive integer; target must exist and be editable
DB:           u.db.modify on target — "$inc" data.gold
Hooks:        none
REST:         none
Side-effects: modifies target's data.gold

## Decision Log
| Decision             | Alternatives            | Rationale                        |
|----------------------|-------------------------|----------------------------------|
| Use $inc not $set    | $set with read-modify   | $inc is atomic, no race condition|
| Lock at admin+       | wizard-only             | Admin level sufficient for economy|
| Global target search | Room-only search        | Admins need to reach offline players|
```

### Stage 1 — Code

```typescript
// src/commands/gold.ts
import { addCmd } from "../../services/commands/cmdParser.ts";
import type { IUrsamuSDK } from "../../@types/UrsamuSDK.ts";

/**
 * Gives gold to a target player (admin only).
 * args[0] = target name or #dbref
 * args[1] = amount (positive integer)
 * @sideeffect Increments data.gold on target via $inc
 */
export default () =>
  addCmd({
    name: "+gold",
    pattern: /^\+gold\s+(.+)=(.+)/i,
    lock: "connected admin+",
    category: "Admin",
    help: `+gold <player>=<amount>  — Give gold to a player (admin only).

Examples:
  +gold Alice=100    Give Alice 100 gold.
  +gold #5=50        Give object #5 50 gold.`,
    exec: async (u: IUrsamuSDK) => {
      // stripSubs first — MUSH codes must not land in DB queries
      const rawName = u.util.stripSubs(u.cmd.args[0]).trim();
      const amount  = parseInt(u.cmd.args[1], 10);

      if (isNaN(amount) || amount <= 0) {
        u.send("%crAmount must be a positive integer.%cn");
        return;
      }

      const target = await u.util.target(u.me, rawName, true);
      if (!target) { u.send("Target not found."); return; }

      if (!(await u.canEdit(u.me, target))) {
        u.send("Permission denied.");
        return;
      }

      // $inc is atomic — no race condition on simultaneous awards
      await u.db.modify(target.id, "$inc", { "data.gold": amount });

      u.send(`%chYou give ${amount} gold to ${u.util.displayName(target, u.me)}.%cn`);
      u.send(`%ch${u.util.displayName(u.me, target)} gives you ${amount} gold.%cn`, target.id);
    },
  });
```

### Stage 2 — Audit

```
### Audit: ursamu-dev
- Security ........ PASSED — stripSubs applied to name arg before target lookup
- Permissions ..... PASSED — lock: "connected admin+" enforced; canEdit checked
- DB integrity .... PASSED — $inc is atomic, prevents race condition
- Sandbox safety .. N/A   — native addCmd context
- Style & color ... PASSED — all %c* sequences closed with %cn
- Help text ....... PASSED — help field present with examples
```

### Stage 3

`Stage 3: No issues found.`

### Stage 4 — Tests

```typescript
// tests/gold.test.ts
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { describe, it } from "jsr:@std/testing/bdd";
import { mockU, mockPlayer } from "./helpers/mockU.ts";

describe("+gold command", () => {
  it("gives gold — $inc with correct amount", async () => {
    const alice = mockPlayer({ id: "5", name: "Alice" });
    const u = mockU({ args: ["Alice", "100"], targetResult: alice });
    await execGold(u);
    assertEquals(u._dbCalls[0], ["5", "$inc", { "data.gold": 100 }]);
    assertStringIncludes(u._sent[0], "Alice");
  });

  it("rejects zero amount — no DB write", async () => {
    const u = mockU({ args: ["Alice", "0"], targetResult: mockPlayer() });
    await execGold(u);
    assertStringIncludes(u._sent[0], "positive integer");
    assertEquals(u._dbCalls.length, 0);
  });

  it("rejects negative amount", async () => {
    const u = mockU({ args: ["Alice", "-50"] });
    await execGold(u);
    assertStringIncludes(u._sent[0], "positive integer");
  });

  it("null target — not-found message, no DB write", async () => {
    const u = mockU({ args: ["nobody", "100"], targetResult: null });
    await execGold(u);
    assertStringIncludes(u._sent[0], "not found");
    assertEquals(u._dbCalls.length, 0);
  });

  it("permission denied — no DB write", async () => {
    const u = mockU({ args: ["Alice", "100"], targetResult: mockPlayer(), canEditResult: false });
    await execGold(u);
    assertStringIncludes(u._sent[0], "Permission denied");
    assertEquals(u._dbCalls.length, 0);
  });
});
```

### Stage 5 — Docs

- **Help text:** ✅ embedded in `help` field above
- **JSDoc:** ✅ on the exported function
- **Plugin README:** N/A — native command
- **REST docs:** N/A
- **Inline comments:** ✅ on stripSubs and $inc

---

## Quick reference links

- Full API (types, all methods): `references/api-reference.md`
- rhost-vision layout helpers: see api-reference.md § rhost-vision Plugin
- gameHooks event payloads: see api-reference.md § GameHooks
- REST endpoints: see api-reference.md § REST API
