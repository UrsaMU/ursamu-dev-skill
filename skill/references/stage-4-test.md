# Stage 4 — Test + TDD Remediation

_Prev: [stage-3-refine.md](stage-3-refine.md) · Next: [stage-5-docs.md](stage-5-docs.md)_

---


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
- [ ] For format handlers: `unregisterFormatHandler` is called in `remove()` with the same reference used in `init()`
- [ ] For middleware: at least one test asserts both the short-circuit path and the `next()` pass-through path

### Run tests

```bash
deno test --allow-env tests/
deno test --allow-env src/plugins/<name>/tests/
```

### Stage 4b — TDD Remediation (runs /tdd-audit)

After all Stage 4 tests pass, invoke `/tdd-audit` on the generated code.

Stage 2 catches what a checklist can see; Stage 4b catches what only adversarial inputs reveal. Remediation catches vulnerabilities that the Stage 2 audit cannot — it proves fixes hold under adversarial inputs by writing exploit tests first (Red), then verifying the patch closes them (Green).

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

Advance to Stage 5 once `/tdd-audit` reports CRITICAL and HIGH items closed.

> **Platform note:** `/tdd-audit` requires the `@lhi/tdd-audit` skill, which is installed automatically when using `npx @lhi/ursamu-dev` (Claude Code target). On other platforms (OpenCode, Gemini CLI, Cursor, Codex), perform the Red-Green-Refactor remediation loop manually using the same protocol: write exploit test → patch → verify full suite passes.
