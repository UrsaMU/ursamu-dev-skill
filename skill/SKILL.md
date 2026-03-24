---
name: ursamu-dev
description: "Full-cycle UrsaMU development: design → generate → audit → refine → test → docs. Covers commands, plugins, system scripts, REST routes, and game hooks with integrated security validation."
risk: low
source: local
date_added: "2026-03-22"
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

## ⚠ Read the API reference first — always

`references/api-reference.md` is the **authoritative source** for every UrsaMU
type, method signature, import path, event payload, and pattern. It is generated
directly from the engine source and is always current.

**Before writing a single line of code, open `references/api-reference.md`.**
Refer back to it whenever you need:
- Any `u.*` method signature (db, util, chan, bb, auth, sys, mail, ui, events)
- `IDBObj`, `ICmd`, `IPlugin`, `IUrsamuSDK`, or any other interface
- `gameHooks` event names and their payload types
- Lock expression syntax, MUSH color codes, pattern conventions
- Plugin coupling patterns (tight vs. loose via `gameHooks` declaration merging)
- REST API endpoints and auth requirements
- rhost-vision layout helper signatures

Do not guess or reconstruct these from memory — the reference has the exact
signatures. If something in this skill and the reference conflict, **the
reference wins**.

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
Stage 4 — Test      → REQUIRED output: passing Deno test file + /tdd-audit remediation
Stage 5 — Docs      → REQUIRED output: help text + JSDoc + README (if plugin)
```

---

## Scaffold before you design (new plugins)

If the task is creating a **new plugin** and the plugin directory does not yet exist, tell the user to run this in their terminal before Stage 0:

```bash
npx @lhi/ursamu-dev scaffold <name> [--with-routes] [--with-tests]
```

This generates the correct `index.ts`, `commands.ts`, and `README.md` boilerplate. It is a **terminal command** — not a Claude slash command. The user runs it in their shell, then resumes the Stage 0 design conversation here.

If the plugin already exists, skip this step and proceed directly to Stage 0.

---

## Stage 0 — Design

**Do not write any code during this stage.**
Your role here is design facilitator: slow down just enough to get it right.

### 0a. Understand context first

Before asking any questions:
1. **Open `references/api-reference.md`** — review the relevant sections for the feature being designed (SDK methods, event payloads, lock expressions, plugin patterns)
2. Read relevant files in `src/commands/`, `src/plugins/`, `system/scripts/`
3. Identify what is being proposed vs. what already exists
4. Note implicit constraints (lock levels, sandbox restrictions, existing DB schemas)

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

> **Open `references/api-reference.md` now** if you have not already. It
> contains every type definition, method signature, import path, and pattern
> used below. The snippets in this section are *quick reminders*, not
> substitutes — always verify against the reference before writing final code.

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
├── index.ts          REQUIRED — exports `plugin: IPlugin`, imports commands.ts
├── commands.ts       REQUIRED if any commands — all addCmd() calls live here
├── routes.ts         Optional — registerPluginRoute() calls, imported in init()
├── <feature>.ts      Optional — domain logic, imported by commands.ts or routes.ts
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
- [ ] **Help text** — `help:` field on every `addCmd` with: (1) syntax line, (2) Switches section if any switches exist, (3) at least two Examples
- [ ] **Plugin phase discipline** — `addCmd()` calls are in `commands.ts` (module-load), never inside `init()`
- [ ] **gameHooks pairing** — every `gameHooks.on()` in `init()` has a matching `gameHooks.off()` in `remove()` using an identical named-function reference (not an inline arrow)
- [ ] **DBO namespace** — all `new DBO<T>(...)` collection names are prefixed with `<pluginName>.`
- [ ] **REST auth guard** — every `registerPluginRoute` handler returns 401 when `userId` is null before doing any work
- [ ] **init() return** — `init()` returns `true` (not `void`, not `undefined`)

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
- [ ] For plugins: `gameHooks.off()` is called in `remove()` with the same handler reference used in `init()`
- [ ] For plugins: DBO collection names are namespaced (`<plugin>.<collection>`, verified by asserting the string passed to `new DBO()`)
- [ ] For REST routes: handler returns 401 when `userId` is `null` before any other logic runs

### Run tests

```bash
deno test --allow-env tests/
deno test --allow-env src/plugins/<name>/tests/
```

### Stage 4b — TDD Remediation (MANDATORY — do not skip)

After all Stage 4 tests pass, invoke `/tdd-audit` on the generated code.

**This is not optional.** Remediation catches vulnerabilities that the Stage 2 audit cannot — it proves fixes hold under adversarial inputs by writing exploit tests first (Red), then verifying the patch closes them (Green).

```
/tdd-audit
```

The `/tdd-audit` protocol will:
1. **Explore** — scan the generated code for OWASP-class vulnerabilities (injection, broken auth, insecure DB ops, sandbox escapes, permission bypasses)
2. **Report** — present a severity-ranked Audit Report (CRITICAL → HIGH → MEDIUM → LOW) and wait for confirmation
3. **Remediate** — for each confirmed issue, run the full Red-Green-Refactor loop:
   - Write an **exploit test** that reproduces the vulnerability (must fail — Red)
   - Apply the **minimum patch** that closes it (Green — exploit test passes)
   - Re-run the **full test suite** to verify no regressions (Refactor)
4. **Harden** — check security headers, rate limits, dependency CVEs, secret leakage, and error handling
5. **Summary** — produce a final Remediation Summary table

**Do not advance to Stage 5 until `/tdd-audit` completes and all CRITICAL and HIGH items are closed.**

> **Platform note:** `/tdd-audit` requires the `@lhi/tdd-audit` skill, which is installed automatically when using `npx @lhi/ursamu-dev` (Claude Code target). On other platforms (OpenCode, Gemini CLI, Cursor, Codex), perform the Red-Green-Refactor remediation loop manually using the same protocol: write exploit test → patch → verify full suite passes.

---

## Stage 5 — Docs (REQUIRED — never skip, never abbreviate)

Every piece of generated code ships with all applicable doc forms.
Output each section clearly labeled.

### 5a. In-game help text (every `addCmd`) — REQUIRED BLOCKER

**Every command must ship with a complete help text. A one-liner stub is a Stage 2 FAIL.**

Required sections:

```
+command[/switch] <required> [<optional>]  — One-line description.

Switches:
  /switch   What this switch does.
  /other    What the other switch does.

Examples:
  +command Alice           Does the thing.
  +command/switch Alice    Does the other thing.
```

Rules:
- **Syntax line** — always first; show all switches in `[/switch]` notation
- **Switches section** — include if and only if the command has at least one switch
- **Examples** — at least two realistic examples; use real arg names, not `<foo>`
- Embed directly in the `help` field of the `addCmd` registration as a template literal

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

  <player>   Name or #dbref of the target player.
  <amount>   Positive integer amount of gold to award.

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

### Stage 4 — Tests + Remediation

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

  it("input sanitization — MUSH codes stripped before target lookup", async () => {
    const alice = mockPlayer({ id: "5", name: "Alice" });
    // Name arg contains MUSH color codes — must be stripped before use
    const u = mockU({ args: ["%chAlice%cn", "100"], targetResult: alice });
    await execGold(u);
    // DB call should have been made (target resolved), not blocked by raw color codes
    assertEquals(u._dbCalls[0], ["5", "$inc", { "data.gold": 100 }]);
  });
});
```

After all tests pass, invoke the TDD remediation audit:

```
/tdd-audit
```

This triggers the full Red-Green-Refactor exploit loop. Do not advance to Stage 5 until all CRITICAL and HIGH items are closed.

### Stage 5 — Docs

- **Help text:** ✅ embedded in `help` field above
- **JSDoc:** ✅ on the exported function
- **Plugin README:** N/A — native command
- **REST docs:** N/A
- **Inline comments:** ✅ on stripSubs and $inc

---

## Quick reference links

> `references/api-reference.md` is the **single source of truth** for all
> UrsaMU APIs. It mirrors `docs/llms.md` in the engine repo and is kept in sync
> with every release. Read it first, read it often.

| Topic | Section in api-reference.md |
|-------|----------------------------|
| All `u.*` methods | `IUrsamuSDK`, `u.db`, `u.util`, `u.chan`, `u.bb`, `u.auth`, `u.sys`, `u.mail`, `u.ui`, `u.events` |
| Types & interfaces | `IDBObj`, `ICmd`, `IPlugin`, `IUrsamuSDK` |
| gameHooks events + payloads | `GameHooks — Engine Event Bus` |
| Plugin coupling (tight vs loose) | `Plugin Coupling Patterns` |
| Lock expressions | `ICmd — Command Registration` |
| MUSH color codes | `MUSH Color Codes` |
| REST core endpoints | `REST API — Core Endpoints` |
| rhost-vision layout helpers | `rhost-vision Plugin — Layout Utilities` |
| Project file layout | `Project Layout` |
| Common patterns | `Common Patterns` |
