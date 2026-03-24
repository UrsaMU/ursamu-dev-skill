# ursamu-audit — Static Analysis

Scans `.ts` and `.js` source files for violations of the UrsaMU Stage 2 audit invariants. No LLM — pure static analysis built to run in CI.

## Usage

```bash
ursamu-audit [path] [options]
```

```bash
ursamu-audit                   # scan ./src (default)
ursamu-audit src/plugins/bbs   # scan one plugin directory
ursamu-audit --fix             # auto-repair check-09 and check-15
ursamu-audit --watch           # re-run on every file save
ursamu-audit --json            # machine-readable JSON for CI
ursamu-audit --no-hints        # suppress informational findings
```

## Checks Reference

| ID | Check | Level | Auto-fix? |
|----|-------|-------|-----------|
| check-01 | `stripSubs()` called before `u.db` writes | warn | |
| check-03 | `u.db.modify` op is `$set`/`$inc`/`$unset` only | error | |
| check-04 | `util.target()` result is null-guarded before use | hint | |
| check-06 | No `Deno`/`fetch`/`require` in `system/scripts/` | error | |
| check-09 | `@ursamu/ursamu` imports use `jsr:` prefix | warn | ✓ |
| check-10 | Every `addCmd` has `help:` with an Examples section | error/warn | |
| check-11 | No `addCmd()` calls inside `init()` | error | |
| check-12 | Every `gameHooks.on()` has a matching `gameHooks.off()` in `remove()` | error | |
| check-13 | `new DBO(...)` collection names are `<plugin>.<collection>` namespaced | error | |
| check-14 | Every `registerPluginRoute` handler checks `if (!userId)` first | error | |
| check-15 | `init()` returns `true` | error | ✓ |

**Levels:**
- `error` — deterministic; CI should fail on these
- `warn` — high-confidence on common patterns; may miss edge cases
- `hint` — heuristic; informational only, does not affect the exit code

Violations for check-01, check-03, check-10, check-11, check-12, check-13, and check-14 require developer judgment and are intentionally left for manual review.

## Auto-fix Mode

```bash
ursamu-audit --fix
ursamu-audit src/plugins/bbs --fix
```

Reads each violating file, applies safe in-place patches, re-runs the full audit, and prints the updated results.

| Check | Transformation |
|-------|---------------|
| check-09 | `from "@ursamu/ursamu"` → `from "jsr:@ursamu/ursamu"` |
| check-15 | Inserts `return true;` before the closing `}` of `init()` with correct indentation |

**Sample output:**

```
UrsaMU Audit — auto-fixing 3 file(s)

  fixed  src/plugins/bbs/commands.ts  (1 change(s))
  fixed  src/plugins/mail/index.ts    (1 change(s))

  Skipped (require manual review): check-12, check-14

After auto-fix:

UrsaMU Audit — 12 file(s) scanned

No violations found.
```

## Watch Mode

```bash
ursamu-audit --watch
ursamu-audit src/plugins/bbs --watch
```

Runs a full audit on startup, then watches the directory for `.ts`/`.js` changes. On every save (debounced 300 ms), re-runs the scan and prints a compact diff:

```
[14:32:01] commands.ts changed — 4 file(s)
  + ERROR [check-09] src/plugins/bbs/commands.ts:3 — Import uses "@ursamu/ursamu" ...
  ✓ resolved [check-15] src/plugins/bbs/index.ts:8
1 violation(s) remaining.
```

Press `Ctrl+C` to stop. Watch mode requires Node 20+ on Linux (uses `fs.watch` with `{ recursive: true }`).

> `--watch` and `--fix` are mutually exclusive. `--json` cannot be combined with either.

## JSON Output

```bash
ursamu-audit --json
ursamu-audit --json --no-hints > audit-results.json
```

```json
{
  "fileCount": 12,
  "violations": [
    {
      "file": "/abs/path/src/plugins/bbs/commands.ts",
      "line": 24,
      "check": "check-10",
      "level": "error",
      "message": "addCmd() is missing a help: field."
    }
  ]
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Clean — no errors or warnings |
| `1` | One or more errors or warnings found |
| `2` | Fatal error (bad path, not a directory, incompatible flags) |

Hints (check-04) alone return exit code `0`.

## CI Integration

**GitHub Actions — block on violations:**

```yaml
- name: UrsaMU audit
  run: npx ursamu-audit --no-hints
```

**With JSON output piped to a reporter:**

```yaml
- name: UrsaMU audit
  run: npx ursamu-audit --json > audit-results.json
```

**Sample human-readable output:**

```
UrsaMU Audit — 12 file(s) scanned

  src/plugins/bbs/commands.ts
    ERROR line   24  [check-10]  addCmd() is missing a help: field.
    WARN  line   31  [check-01]  exec() writes to the DB but no stripSubs() call found.

  src/plugins/mail/index.ts
    ERROR line    8  [check-12]  gameHooks.on("player:login", onLogin) has no matching off() in remove().

Summary: 2 error(s), 1 warning(s) across 2 file(s).
```
