# ursamu-scaffold — Plugin Scaffold

Generates a fully-wired, correctly-structured UrsaMU plugin from one command. Every generated file follows the exact conventions enforced by the skill and checked by `ursamu-audit`.

`ursamu-scaffold` is a **terminal command** — run it in your shell, not inside your agent.

## Usage

```bash
# With npx (no install required)
npx @lhi/ursamu-dev scaffold <name> [options]

# Or if installed globally
ursamu-scaffold <name> [options]
```

```bash
npx @lhi/ursamu-dev scaffold bbs
npx @lhi/ursamu-dev scaffold mail --with-routes --with-tests
npx @lhi/ursamu-dev scaffold my-plugin --out ./plugins/my-plugin --dry-run
```

## Output Directory

The default output directory depends on where you run the command:

| Context | Default output |
|---------|---------------|
| Inside a UrsaMU project (`src/plugins/` exists, or `package.json` has ursamu) | `./src/plugins/<name>` |
| Outside a UrsaMU project | `./<name>` |

Use `--out <dir>` to override in either case.

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--with-routes` | Include `routes.ts` with a pre-wired `routeHandler` and `if (!userId)` auth guard | off |
| `--with-tests` | Include `tests/<name>.test.ts` and `tests/helpers/mockU.ts` | off |
| `--out <dir>` | Override the output root | see above |
| `--add-command <name>` | Append a new `addCmd()` skeleton to an existing plugin's `commands.ts` | — |
| `--dry-run` | Preview files that would be created without writing anything | off |
| `--help` | Show help | — |

## Name Rules

Plugin names must:
- Be lowercase
- Start with a letter
- Contain only letters, digits, and hyphens

**Valid:** `bbs`, `my-plugin`, `mail2`
**Invalid:** `MyPlugin`, `my_plugin`, `123bad`, `../evil`

## Generated Files

**Always created:**

| File | Contents |
|------|----------|
| `index.ts` | `IPlugin` export with three-phase lifecycle: module-load imports `addCmd`, `init()` returns `true`, calls `registerHelpDir()`, `remove()` tears down hooks. If a `deno.json` exists at the project root, `version` is read from it automatically — single source of truth. |
| `commands.ts` | `addCmd()` skeleton with correct `jsr:` imports, pattern, lock, `help:` with Examples, `stripSubs` in exec |
| `README.md` | Plugin documentation template with Commands, Events, Storage, REST Routes, and Notes sections |
| `help/<name>.md` | Markdown help file registered via `registerHelpDir()`. Served by the [help-plugin](https://github.com/UrsaMU/help-plugin) `FileProvider` at priority 50, overriding the inline `help:` field. Fill in the Syntax, Switches, and Examples sections. |

**With `--with-routes`:**

| File | Contents |
|------|----------|
| `routes.ts` | `routeHandler` with `if (!userId) return new Response(null, { status: 401 })` as the first statement |

**With `--with-tests`:**

| File | Contents |
|------|----------|
| `tests/<name>.test.ts` | Deno test file with happy-path, null-target, and permission-denied stubs |
| `tests/helpers/mockU.ts` | Complete `mockU()` / `mockPlayer()` helper from SKILL.md Stage 4, with `_sent` and `_dbCalls` tracking |

## Adding a Command to an Existing Plugin

```bash
ursamu-scaffold bbs --add-command "+bbs-post"
```

Appends a new `addCmd()` skeleton to the existing `commands.ts` in the plugin directory. The plugin must already exist.

## Example

```bash
npx @lhi/ursamu-dev scaffold greeter --with-routes --with-tests
```

```
@lhi/ursamu-dev scaffold — creating plugin "greeter"

  created  src/plugins/greeter/index.ts
  created  src/plugins/greeter/commands.ts
  created  src/plugins/greeter/README.md
  created  src/plugins/greeter/help/greeter.md
  created  src/plugins/greeter/routes.ts
  created  src/plugins/greeter/tests/greeter.test.ts
  created  src/plugins/greeter/tests/helpers/mockU.ts

Done. 7 file(s) created.

Next steps:
  1. Fill in your plugin description in index.ts and README.md
  2. Implement the exec() body in commands.ts
  3. Fill in help/greeter.md (Syntax, Switches, Examples)
  4. Run Stage 0 design with the ursamu-dev skill
```
