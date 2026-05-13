---
name: aaak
description: "AAAK compact notation — a lossless structured shorthand for LLM-to-LLM communication. Encode design plans, audit reports, decision logs, and skill outputs into dense, readable shorthand. Retrofit or author any structured output with AAAK."
risk: low
source: local
date_added: "2026-04-07"
---

## Use this skill when

- Compressing a verbose Design Plan, Audit Report, or Decision Log into AAAK
- Asked to "aaak-ify", "compress", or "encode" any structured text
- Authoring a new companion skill and wanting compact internal output formats
- Retrofitting an existing skill's output formats with AAAK notation

## Do not use this skill when

- Writing prose for humans — README files, user-facing help text, error messages
- The output will be read by someone who has not been given this grammar
- Compressing narrative documentation (docs-architect, readme skill outputs)

---

## What is AAAK

AAAK is a structured shorthand dialect. It achieves high compression ratios on
structured text (design plans, checklists, audit reports, decision tables) while
remaining fully readable by any LLM without a decoder, fine-tuning, or extra API
calls. Adapted from the MemPalace AAAK dialect for use with UrsaMU workflows.

**Core principle:** use operators and ALL-CAPS markers instead of prose.
Every field is parseable — LLMs reconstruct meaning from structure, not verbosity.

---

## Grammar

### Operators

| Op  | Meaning                        | Example                                  |
|-----|--------------------------------|------------------------------------------|
| `\|` | field / item separator        | `CMD: +gold(conn) \| +gold/set(wiz)`    |
| `→` | causes / flows into / becomes  | `player:login→onLogin`                   |
| `>` | preferred over / chosen over   | `gameHooks>polling(decoupled)`           |
| `.` | property path                  | `players.data.gold`                      |
| `★` | importance weight 1–5          | `$inc>$set(atomic ★★★)`                 |
| `()` | inline metadata               | `+gold(wiz)`, `REST:POST(auth:yes)`      |
| `??` | null-guard / early return     | `target??return`                         |
| `@` | line / location reference      | `null-guard@L42`                         |
| `:` | label separator                | `CMD:`, `FAIL:`, `INV:`                  |

### Section markers

| Marker    | Used for                                           |
|-----------|----------------------------------------------------|
| `CMD:`    | Commands, their lock, and args                     |
| `DB:`     | Collections and allowed ops                        |
| `HOOKS:`  | gameHooks event → named handler                    |
| `REST:`   | HTTP method, path, auth requirement                |
| `INV:`    | Domain invariants (rules that must always hold)    |
| `DEC:`    | Decisions: chosen>alt(rationale ★N)                |
| `AUDIT:`  | Audit summary — feature name + pass/fail tally     |
| `FAIL:`   | Failed audit items with location                   |
| `PASS:`   | Passed audit items                                 |
| `FIX:`    | Required fixes (one per FAIL)                      |
| `PHASE:`  | Workflow phase label                               |
| `GATE:`   | Hard stop / confirmation required before proceeding|
| `CHECK:`  | Checklist items (use `✓` pass, `✗` fail, `–` N/A) |

### UrsaMU abbreviations

| Full form                    | AAAK       |
|------------------------------|------------|
| `connected`                  | `conn`     |
| `connected builder+`         | `build+`   |
| `connected admin+`           | `adm+`     |
| `connected wizard`           | `wiz`      |
| `u.util.stripSubs()`         | `strip()`  |
| `u.util.displayName()`       | `dname()`  |
| `u.util.target()`            | `target()` |
| `u.canEdit()`                | `canEdit()`|
| `registerPluginRoute`        | `route`    |
| `gameHooks.on/off`           | `hook±`    |
| `new DBO<T>()`               | `DBO`      |
| `u.me.flags.has()`           | `flag?`    |
| `registerHelpDir()`          | `helpDir`  |

---

## Encoding a Design Plan

Apply to Stage 0e output. Keep the GATE instruction; replace the body block.

**Before** (~25 lines of prose + table):
```
## Design Plan: gold-tracker

Context:      plugin: gold
Commands:     +gold (connected) — view balance
              +gold/set (wizard) — set balance
Invariants:   amount must be > 0; canEdit required before modifying others
DB:           players: { data.gold: number }
Hooks:        player:login → onLogin (log balance on connect)
REST:         POST /api/v1/gold (auth: yes)
Side-effects: modifies target.data.gold
Assumptions:  gold is always a non-negative integer

| Decision   | Alternatives | Rationale                        |
|------------|-------------|----------------------------------|
| Use $inc   | $set         | Atomic, prevents race conditions |
| gameHooks  | polling      | Decoupled, reversible teardown   |
```

**After** (~6 lines AAAK):
```
CMD:   +gold(conn) | +gold/set(wiz) | args:[sw,amt]
DB:    players.data.gold | $set,$inc
HOOKS: player:login→onLogin(log-balance)
REST:  POST /api/v1/gold(auth:yes)
INV:   amt>0 | canEdit:required | strip():before-store
DEC:   $inc>$set(atomic ★★★) | gameHooks>polling(decoupled,reversible ★★)
```

---

## Encoding an Audit Report

Apply to Stage 2 output. All items still checked; only the report block is compressed.

**Before** (~8 lines):
```
### Audit: ursamu-dev
- Security ........ PASSED
- Permissions ..... FAILED — no canEdit guard before modifying target
- DB integrity .... PASSED
- Sandbox safety .. N/A
- Style & color ... PASSED
- Help text ....... FAILED — missing Examples section in help:
```

**After** (~4 lines AAAK):
```
AUDIT: +gold | 4/6 PASS
FAIL:  canEdit-guard@L42 | help-examples@L89
PASS:  security | db-integrity | sandbox:N/A | style
FIX:   if(!(await u.canEdit(u.me,target)))return | add Examples: block to help:
```

---

## Encoding workflow validation checkpoints

Apply to any RED/GREEN/REFACTOR or phase-gate checklist.

**Before:**
```
### RED Phase Validation
- [ ] All tests written before implementation
- [ ] All tests fail with meaningful error messages
- [ ] Test failures are due to missing implementation
- [ ] No test passes accidentally
```

**After:**
```
GATE:RED   tests-first | fail:meaningful | fail:missing-impl | no-false-pass
```

---

## Encoding a new companion skill's output formats

When authoring a new skill, apply AAAK to any structured internal output (not
user-facing prose). Pattern:

```
PHASE: <name>
  INPUT:  <what is consumed>
  OUTPUT: <what is produced — use AAAK markers>
  GATE:   <confirmation or hard stop condition>
```

---

## How to apply AAAK retroactively

1. Identify verbose blocks: Design Plans, Audit Reports, Decision Tables, Checklists
2. Extract all discrete facts — each fact maps to one AAAK token
3. Choose the correct marker (`CMD:`, `INV:`, `FAIL:`, etc.)
4. Replace prose with `MARKER: token | token`
5. Weight decisions with `★` (1 = minor, 5 = critical)
6. Never AAAK-ify narrative prose, help text, or human-facing output

---

## Compression stats (approximate)

| Structure          | Before (tokens) | After (tokens) | Ratio |
|--------------------|-----------------|----------------|-------|
| Design Plan        | ~250            | ~40            | 6×    |
| Audit Report       | ~80             | ~25            | 3×    |
| Validation gates   | ~60             | ~10            | 6×    |
| Decision log table | ~100            | ~20            | 5×    |
