# Stage 5 — Docs

_Prev: [stage-4-test.md](stage-4-test.md)_

---

Every piece of generated code ships with the doc forms applicable to it (a native command needs help + JSDoc; a plugin adds README + help file). Users cannot discover commands without these, and Stage 2 audits the help-text check.

Every piece of generated code ships with all applicable doc forms.
Output each section clearly labeled.

### 5a. In-game help text (every `addCmd`)

A command without a complete help block is invisible to `+help` and fails the Stage 2 `help-text` check.

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

### 5f. Help system file (`help/<name>.md`) — required for every plugin command

Every command must have a corresponding Markdown help file registered via
`registerHelpDir()`. The scaffold generates `help/<name>.md` automatically.
Verify it is filled in — stubs are a Stage 2 FAIL.

> **How it works:** `registerHelpDir()` is called in `init()` and scans the
> `help/` directory. Files are served by the
> [help-plugin](https://github.com/UrsaMU/help-plugin) `FileProvider` at
> priority 50, overriding the inline `help:` field (priority 10).

Required content per help file:

```markdown
# +<command>

> One-sentence description.

## Syntax

    +<command>[/switch] <required> [<optional>]

## Switches

| Switch | Description |
|--------|-------------|
| `/switch` | What this switch does. |

## Examples

    +<command> Alice          Does the thing.
    +<command>/switch Alice   Does the other thing.
```

Rules:
- File lives at `src/plugins/<name>/help/<name>.md` (add more files for sub-topics)
- `init()` must call `registerHelpDir(new URL("./help", import.meta.url).pathname, "<name>")`
- The section name passed to `registerHelpDir` must match the plugin name
- At least two Examples; use real arg names, not `<foo>`
