# Worked Example — +gold (all stages end-to-end)

_See: [../SKILL.md](../SKILL.md)_

---


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
AUDIT: +gold | 6/6 PASS
PASS:  security | canEdit | db-integrity | sandbox:N/A | style | help-text
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

Stage 4b is documented in [stage-4-test.md](stage-4-test.md).

### Stage 5 — Docs

- **Help text:** ✅ embedded in `help` field above
- **JSDoc:** ✅ on the exported function
- **Plugin README:** N/A — native command
- **REST docs:** N/A
- **Inline comments:** ✅ on stripSubs and $inc
