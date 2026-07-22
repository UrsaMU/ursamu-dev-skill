# Official UrsaMU Packages

> Catalog of first-party packages in the UrsaMU monorepo (`packages/*`).
> Prefer these over scaffolding a new plugin when the feature already exists.
> Source of truth: sibling repo `ursamu/packages/` (and JSR `@ursamu/*`).
> Last synced: 2026-07-22 against monorepo package versions.

---

## Rule: reuse before invent

At Stage 0, before designing a new plugin or command set:

1. Match the feature against the tables below (mail, BBS, jobs, combat, …).
2. If an official package covers ≥80% of the need → **install / extend it**.
3. Only scaffold a greenfield plugin when no package fits, or the work is a
   thin game-system adapter on top of an existing package (e.g. combat ports).

```bash
# Install into a game project
ursamu plugin install jsr:@ursamu/<name>
# or add to plugins.manifest.json / deno.json imports and restart
```

Monorepo local override (when developing beside `ursamu/`):

```json
{
  "name": "mail",
  "local": "../../packages/mail",
  "ursamu": ">=2.6.0"
}
```

Import style for published packages:

```typescript
import mailPlugin from "jsr:@ursamu/mail";
import { registerCombatPorts } from "jsr:@ursamu/combat";
import { registerHelpDir } from "jsr:@ursamu/help";
import { addCmd, DBO, gameHooks } from "jsr:@ursamu/mush";
```

---

## Engine layer (do not reimplement)

| Package | Version | Role |
|---------|---------|------|
| **`@ursamu/core`** | 0.1.x | Transports (WS/Telnet/HTTP+SSE), `DBO`, `gameHooks`, dispatch pipeline, plugin loader, sessions, rooms, queue. No world model. |
| **`@ursamu/mush`** | 0.1.x | MUSH world layer on core: `IDBObj`, flags/locks, softcode, `addCmd` / `IUrsamuSDK`, format pipeline, layout chrome. **Re-exports `@ursamu/core`.** Preferred engine import for plugins. |
| **`@ursamu/cli`** | 0.1.x | Project/plugin scaffold, plugin install/update, engine update, local telnet client. |

> Historical note: older docs and scaffolds still say `jsr:@ursamu/ursamu`.
> New code should prefer `jsr:@ursamu/mush`. Inside the monorepo, relative
> imports or the root `deno.json` import map may still resolve `@ursamu/ursamu`
> to the same tree — follow whatever the host game’s `deno.json` uses.

---

## Default stack (new game projects)

Written by `@ursamu/cli` into `plugins.manifest.json`:

| Package | JSR / dir | What you get |
|---------|-----------|--------------|
| **`@ursamu/help`** | `packages/help` | `help`, `+help/set`/`del`/`reload`, `registerHelpDir()`, REST help API |
| **`@ursamu/channels`** | `packages/channels` | `@channel`, `@addcom`, `@chancreate`, history/transcripts, login auto-join |
| **`@ursamu/builder`** | `packages/builder` | `@dig`/`@open`/`@link`/`@create`/… + `/api/v1/building` |
| **`@ursamu/bbs`** | `packages/bbs` | Myrddin-style boards (`+bb*`), seeds Announcements/OOC/Jobs, optional jobs mirror |
| **`@ursamu/mail`** | `packages/mail` | `@mail` drafts/folders/attachments/quota/expiry + REST |
| **`@ursamu/wiki`** | `packages/wiki` | File markdown wiki (`+wiki`, `@wiki`), subscriptions |

Do **not** scaffold competing mail/BBS/help/channel/builder/wiki plugins.

---

## Staff & social infrastructure

| Package | Version | Commands (sample) | Integrate via |
|---------|---------|-------------------|---------------|
| **`@ursamu/jobs`** | 0.1.x | `+job`, `+jobs`, `+request`, `+myjobs`, `+archive` | `jobHooks` (`job:created`, …), `registerJobBuckets()`, needs **mail** |
| **`@ursamu/events`** | 0.1.x | `+event`, `+events` | `eventHooks`, RSVP DBO + REST |
| **`@ursamu/scene`** | 0.1.x | `+scene` | Scene/pose DBO for cross-platform RP rooms |
| **`@ursamu/discord`** | 0.2.x | `@discord/*` | Webhooks + Gateway bridge; peers: channels, help, jobs |
| **`@ursamu/lang-plugin`** | 3.x | `+language`, `+speak` | Per-listener garble on say/pose |
| **`@ursamu/vendor-plugin`** | 1.x | `+buy`, `+sell`, `+grab`, `+vendor/*` | `createVendor()`; shop vs grab-stall modes |

### Jobs ↔ BBS ↔ Mail

- **jobs** depends on **mail** (notifications).
- **bbs** optionally depends on **jobs** — job lifecycle can mirror onto the Jobs board.
- Load order: `help` → `mail` → `jobs` → `bbs` (and `channels` early for chat).

---

## Combat engine (system-agnostic)

| Package | Version | Role |
|---------|---------|------|
| **`@ursamu/combat`** | 0.8.x | Encounters, turn walker, JSON AI brains, zone pathfind, `CombatPorts` adapter kit |

**Not a full game system.** Game plugins (CofD, D&D, Cyberpunk, …) register ports:

```typescript
import {
  registerCombatPorts,
  registerEncounterStore,
  type CombatPorts,
} from "jsr:@ursamu/combat";

// In plugin init(), after combat is loaded:
registerCombatPorts({
  async loadActor(id) { /* → CombatActorView */ },
  async executeAction(id, action, ctx) {
    return {
      ok: true,
      damageApplied: 4,
      targetId: action.type === "attack" ? action.targetId : undefined,
      logLine: "Goblin hits Hero",
      endedTurn: true,
    };
  },
  // …remaining CombatPorts methods
});
```

Config (`config.json`):

```json
{
  "plugins": {
    "combat": {
      "brains": ["json"],
      "defaultAiKey": "beshilu-swarmer",
      "enableDecideHook": true
    }
  }
}
```

- Load **combat before** any system that calls `registerCombatPorts`.
- Optional `combat:decide` hook lets **ai-gm** (or custom brains) claim NPC turns.
- Do **not** reimplement initiative/turn order when extending a TTRPG system — port into combat.

---

## TTRPG / setting system plugins

These sit on top of combat (and usually help). Prefer extending the matching
system over inventing a parallel sheet/combat command set.

| Package | Version | Setting | Notes |
|---------|---------|---------|-------|
| **`@ursamu/cofd-plugin`** | 1.x | Chronicles of Darkness 2e | Chargen, d10 roller, health, beats/XP, Changeling overlay; uses combat |
| **`@ursamu/dnd-plugin`** | 1.x | D&D 5e/2024 SRD | Sheets, adv/dis, HP, `+combat/*`; uses combat |
| **`@ursamu/cyberpunk-plugin`** | 1.x | Cyberpunk RED | FNFF combat, cyberware, netrunning, economy; uses combat |
| **`@ursamu/sw5e-plugin`** | 1.x | Star Wars 5E | Chargen, Force/Tech, starships; peers: combat ecosystem, map, vendor |
| **`@ursamu/mekton-zeta`** | 0.1.x | Mekton Zeta | Chargen, gear, personal combat bridge |
| **`@ursamu/ai-gm`** | 0.2.x | Agentic GM | Book ingest, sessions, `+gm/*`; peers: combat, bbs |

Typical plugin list for a system game:

```text
@ursamu/help
@ursamu/combat          ← before the system plugin
@ursamu/<system-plugin>
@ursamu/ai-gm           ← optional
```

---

## World / content packages

| Package | Version | Role |
|---------|---------|------|
| **`@ursamu/map-plugin`** | 3.x | Coordinate sector map, pathfinding, `+map` / `+move`, fog/regions |
| **`@ursamu/wiki`** | 0.1.x | Markdown wiki on disk + watch/subscriptions |

---

## Decision cheat-sheet

| User asks for… | Use | Do not |
|----------------|-----|--------|
| In-game mail / @mail | `@ursamu/mail` | Scaffold `src/plugins/mail` |
| Bulletin boards / +bb | `@ursamu/bbs` | New BBS from scratch |
| Staff requests / +job | `@ursamu/jobs` (+ mail) | Softcode jobs port without package |
| Channels / aliases | `@ursamu/channels` | Reimplement matchChannel middleware |
| Help files / registerHelpDir | `@ursamu/help` | Ad-hoc help command only |
| @dig @open building | `@ursamu/builder` | Duplicate builder verbs |
| Wiki pages | `@ursamu/wiki` | One-off markdown reader plugin |
| Initiative / turns / NPC AI | `@ursamu/combat` + ports | Per-system turn engine |
| CofD / D&D / CPR / SW5e sheets | matching `*-plugin` | Fork sheets into game `src/plugins/` |
| Discord bridge | `@ursamu/discord` | Raw webhook glue in core |
| AI game master | `@ursamu/ai-gm` | One-off LangChain bot in-tree |
| Shops / free grab stalls | `@ursamu/vendor-plugin` | Ad-hoc +buy only |
| Language garbling | `@ursamu/lang-plugin` | Rewrite say/pose filters |
| Calendar / RSVP | `@ursamu/events` | New +event plugin |
| RP scenes | `@ursamu/scene` | Duplicate scene DBO |

---

## Extending an official package (preferred patterns)

| Need | Pattern |
|------|---------|
| Extra help topics | Drop files under your plugin’s `help/` and `registerHelpDir(import.meta.url)` from `@ursamu/help` |
| React to jobs | `import { jobHooks } from "@ursamu/jobs"` — named handlers, off in `remove()` |
| React to wiki/events | `wikiHooks` / `eventHooks` same way |
| System-specific combat | `registerCombatPorts` + optional brain registration — never fork walker |
| Extra BBS boards | `seedBoards` / config defaults — don’t copy bbs DB layer |
| Mail from another plugin | Use mail helpers / send through mail APIs — don’t write parallel message DBO |
| New game commands only | Thin plugin that **imports** official packages; keep domain code local |

---

## Monorepo layout (when working inside `ursamu/`)

```
packages/
  core/ mush/ cli/          engine + tooling
  help/ channels/ builder/  default stack
  mail/ bbs/ jobs/ wiki/
  events/ scene/ discord/
  combat/                   shared combat engine
  cofd/ dnd/ cyberpunk/     TTRPG systems
  sw5e/ mekton/ ai-gm/
  map/ vendor/ lang/
```

When editing a package in-tree:

- Prefer package-local imports and that package’s `deno.json` `imports` map.
- Run that package’s `deno task test` / `check` before claiming done.
- Cross-package APIs: import the **published name** (`@ursamu/combat`) as
  mapped in the root or package `deno.json` — not deep relative hacks into
  another package’s `src/` unless you are deliberately coupling internals.

---

## Keeping this catalog fresh

When new packages land under `ursamu/packages/`:

1. Add a row to the matching section above (name, version, one-line role, peers).
2. Add a cheat-sheet line if agents might reinvent it.
3. Bump the “Last synced” date at the top of this file.
4. Mention the addition in `CHANGELOG.md` under the next `@lhi/ursamu-dev` release.
