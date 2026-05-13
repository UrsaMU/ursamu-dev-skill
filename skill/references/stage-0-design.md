# Stage 0 — Design

_Next: [stage-1-generate.md](stage-1-generate.md)_

---

This stage is design-only — code lands in Stage 1 once invariants are agreed. The plan you produce here is the contract that Stage 2 audits against, so a bad plan wastes audit tokens.

Your role: design facilitator. Slow down just enough to get it right.

### 0a. Understand context first

Before asking any questions:
1. Open `api-reference.md` — review the relevant sections for the feature being designed (SDK methods, event payloads, lock expressions, plugin patterns)
2. Read relevant files in `src/commands/`, `src/plugins/`, `system/scripts/`
3. Identify what is being proposed vs. what already exists
4. Note implicit constraints (lock levels, sandbox restrictions, existing DB schemas)

### 0b. Clarify requirements (one question at a time)

Ask one targeted question per message — prefer multiple-choice. Resolve all of the following before designing:

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

Before designing data structures, identify the rules that must always hold:
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
- YAGNI check — reject any feature not explicitly needed right now

### 0e. Confirm the plan before Stage 1

Stage 1 writes files that Stage 2 then attacks; if the plan is wrong, both stages waste tokens. Output this block in AAAK compact notation and pause for user confirmation:

```
## Design Plan: <feature name>

CMD:   <+name>(<lock>) | <+name/switch>(<lock>) | args:[<sw>,<rest>]
DB:    <plugin>.<collection>.<field> | <$set,$inc,$unset>  (or: none)
HOOKS: <event>→<handlerName>(<purpose>)  (or: none)
REST:  <METHOD> /api/v1/<path>(auth:<yes|no>)  (or: none)
INV:   <invariant> | <invariant>  (rules that must always hold)
DEC:   <chosen>><alt>(<rationale> ★N) | ...
```

AAAK key: `conn`=connected · `build+`=builder+ · `adm+`=admin+ · `wiz`=wizard · `★1`=minor · `★★★`=important · `★★★★★`=critical

Pause for confirmation. If a PreToolUse stage-gate hook is installed (see `../hooks/`), Write/Edit calls into `src/plugins/**`, `src/commands/**`, etc. are blocked until you set `design_confirmed: true` in `.ursamu-stage` — run `bash ~/.claude/skills/ursamu-dev/hooks/advance-stage.sh --confirm-design`.
