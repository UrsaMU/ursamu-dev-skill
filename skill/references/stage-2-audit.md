# Stage 2 — Security & Style Audit

_Prev: [stage-1-generate.md](stage-1-generate.md) · Next: [stage-3-refine.md](stage-3-refine.md)_

---


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
- [ ] **Import path** — internal plugins use relative imports; external use `jsr:@ursamu/*` (mush, mail, bbs, combat, …) or a matching `deno.json` imports map entry
- [ ] **Help text** — `help:` field on every `addCmd` with: (1) syntax line, (2) Switches section if any switches exist, (3) at least two Examples
- [ ] **Help file** — `help/<name>.md` exists for every command and `init()` calls `registerHelpDir()` (plugins only)
- [ ] **Plugin phase discipline** — `addCmd()` calls are in `commands.ts` (module-load), never inside `init()`
- [ ] **gameHooks pairing** — every `gameHooks.on()` in `init()` has a matching `gameHooks.off()` in `remove()` using an identical named-function reference (not an inline arrow)
- [ ] **DBO namespace** — all `new DBO<T>(...)` collection names are prefixed with `<pluginName>.`
- [ ] **REST auth guard** — every `registerPluginRoute` handler returns 401 when `userId` is null before doing any work
- [ ] **init() return** — `init()` returns `true` (not `void`, not `undefined`)
- [ ] **Format handler pairing** — every `registerFormatHandler(slot, fn)` in `init()` has a matching `unregisterFormatHandler(slot, fn)` in `remove()` with the **identical** reference
- [ ] **Middleware discipline** — every `registerCmdMiddleware` handler either calls `next()` or intentionally short-circuits (no silent drops); plugin README notes it is not hot-removable
- [ ] **LockFunc registration** — `registerLockFunc` is called once (module-load or `init()`); not called in `remove()`; does not collide with reserved names (`flag`, `attr`, `type`, `is`, `holds`, `perm`)

### Audit Report format (ALL items required, no exceptions)

Output in **AAAK compact notation**:

```
AUDIT: <feature> | <N>/<TOTAL> PASS
FAIL:  <check-label>@<location> | ...   (omit line if all passed)
PASS:  <check-label> | ...
FIX:   <minimal fix per FAIL item> | ...  (omit line if nothing to fix)
```

`TOTAL` is the count of **applicable** checks for the feature (native command: 6 core; plugin: +phase/hooks/dbo/init/format/middleware/lockfunc as applicable; REST: +rest-auth).

Check labels: `security` · `canEdit` · `db-integrity` · `sandbox` · `style` · `help-text` · `phase` · `hooks-pair` · `dbo-ns` · `init-return` · `rest-auth` · `format-pair` · `middleware` · `lockfunc`
Location: `@L<n>` for a line, `@<file>` for a file, omit if global.

Example (native command, 6 core checks):
```
AUDIT: +gold | 4/6 PASS
FAIL:  canEdit@L42 | help-text@L89
PASS:  security | db-integrity | sandbox:N/A | style
FIX:   if(!(await u.canEdit(u.me,target)))return | add Examples: block to help:
```

Example (plugin with format handler + REST, 10 applicable checks):
```
AUDIT: rooster-plugin | 10/10 PASS
PASS:  security | canEdit | db-integrity | style | help-text | phase | hooks-pair | dbo-ns | init-return | format-pair | rest-auth
```

If any item is FAILED → do not output final code yet, go to Stage 3.
