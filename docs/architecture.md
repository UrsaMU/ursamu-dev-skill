# Architecture

## Engine target

This package targets **`@ursamu/ursamu ≥ 2.3.4`**. Plugins still on the v1.9.x
engine should pin `@lhi/ursamu-dev@^1`; the v2 line assumes v2.x APIs are
available.

## v2.x extension points

The skill and `api-reference.md` document the following v2.x additions
(authoritative coverage lives in `skill/references/api-reference.md`):

| API | Engine version | Notes |
|-----|----------------|-------|
| Native layout helpers — `header`, `divider`, `footer` | 2.3.0+ | Replaces `rhost-vision`, which is no longer used. Import from `jsr:@ursamu/ursamu`. |
| `engine:ready` hook | 1.9.30+ | Fires after every plugin's `init()` resolves. Use for cross-plugin wiring that needs all SDKs registered. |
| `registerCmdMiddleware(fn)` | 1.9.27+ | Command-pipeline middleware. Must call `next()` or intentionally short-circuit. **Not hot-removable** — plugin can't be cleanly torn down. |
| `registerLockFunc(name, fn)` with `&&` / `\|\|` short-circuit | 2.2.0+ | Custom lock vocabulary. Reserved names (`flag`, `attr`, `type`, `is`, `holds`, `perm`) are rejected. |
| `registerFormatHandler` / `unregisterFormatHandler` / `resolveFormat` | 2.3.0+ | Format-attribute pipeline. Resolution order: softcode → plugin handler → built-in. Audit check `format-pair` enforces register/unregister parity with identical function references. |
| `joinSocketToRoom` + `socketId` on `SessionEvent` | 1.9.27+ | Post-login socket wiring for channel-style plugins. |
| `softcodeService` + `ObjectAccessor` | 2.x | Bridge to the v2 TinyMUX-flavor softcode engine. |

`rhost-vision` is **removed** from skill guidance — use the native helpers above.

## Default-loaded plugins

The engine loads `help`, `builder`, and `channel` by default. New plugins
should not register commands or DBO collections that collide with theirs (e.g.
do not register `+help`, `@dig`, or `+channel` names).

## Directory Structure

```
@lhi/ursamu-dev/
├── bin/
│   ├── cli.js          # ursamu-dev — skill installer + hook installers
│   ├── audit.js        # ursamu-audit — static analysis CLI
│   ├── scaffold.js     # ursamu-scaffold — plugin boilerplate generator
│   └── docs.js         # ursamu-docs — LLM-powered docs generator
│
├── lib/
│   ├── scanner.js          # source unit discovery (commands + plugins)
│   ├── writer.js           # docs artifact writer (default + patch modes)
│   ├── hooks.js            # git pre-commit hook installer
│   ├── claude-hooks.js     # Claude Code PreToolUse stage-gate installer (v2.1.0)
│   ├── llm.js              # LLM provider resolution + SSRF guard
│   ├── prompts.js          # SKILL.md stage extraction
│   │
│   ├── audit/
│   │   ├── checks.js   # pure check functions + block extractor
│   │   ├── runner.js   # orchestrates checks across a directory tree
│   │   ├── reporter.js # formats violations for console or JSON
│   │   ├── fixer.js    # auto-repairs check-09 and check-15 in place
│   │   └── watcher.js  # fs.watch loop + pure diff utilities
│   │
│   └── scaffold/
│       ├── templates.js # all file template strings
│       └── writer.js    # validates names, resolves paths, writes files
│
├── skill/
│   ├── SKILL.md                     # thin router (v2.1.0 split)
│   ├── references/
│   │   ├── api-reference.md         # authoritative UrsaMU SDK reference
│   │   ├── stage-0-design.md
│   │   ├── stage-1-generate.md
│   │   ├── stage-2-audit.md
│   │   ├── stage-3-refine.md
│   │   ├── stage-4-test.md
│   │   ├── stage-5-docs.md
│   │   └── example-gold.md          # full worked example
│   ├── hooks/                       # optional PreToolUse stage-gate (v2.1.0)
│   └── evals/                       # trigger evals (v2.1.0)
│
├── companion-skills/                # installed alongside ursamu-dev
└── __tests__/
```

## Module Map

```
bin/audit.js
  └── lib/audit/runner.js      → lib/scanner.js (assertSafePath)
                                → lib/audit/checks.js (runAllChecks)
  └── lib/audit/reporter.js    (formatReport, exitCode)
  └── lib/audit/fixer.js       → lib/audit/checks.js (extractBlock, INIT_BLOCK_RE)
  └── lib/audit/watcher.js     (startWatch, diffViolations)

bin/scaffold.js
  └── lib/scaffold/writer.js   → lib/scaffold/templates.js

bin/docs.js
  └── lib/scanner.js           (scan, assertSafePath)
  └── lib/writer.js            (write, assertSafeOutPath)
  └── lib/llm.js               (resolve, validateBaseURL)
  └── lib/prompts.js           (systemPrompt)

bin/cli.js
  └── lib/hooks.js             (installHook, findGitRoot)
  └── lib/claude-hooks.js      (installClaudeStageGate, uninstallClaudeStageGate)
```

See `skill/references/api-reference.md` for engine-side API shapes;
[hooks.md](./hooks.md) for the stage-gate marker; [audit.md](./audit.md) for
the 18-check audit invariants.
