# ursamu-dev evals

Trigger evals for the `ursamu-dev` skill, following Anthropic's
[skill-creator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md)
pattern: a balanced set of `should_trigger` prompts (must select this skill) and
`should_not_trigger` near-miss prompts (must select a *different*, named skill —
or no skill at all — proving our description doesn't over-claim).

Run these whenever you change:

- `SKILL.md` frontmatter `description:` field — that's what the loader matches on.
- The "Use this skill when" / "Do not use this skill when" sections.
- The trigger-collision-prone areas: audit, test, design, docs, MUSH.

## Files

- `evals.json` — 10 should-trigger + 10 should-not-trigger prompts. Every
  near-miss explicitly names the sibling skill it *should* go to instead.
- `schema.json` — JSON Schema for `evals.json` (light validation only).
- `run.sh` — Auto-routes to the programmatic runner if `ANTHROPIC_API_KEY` is
  set, otherwise falls back to paste-mode (prints prompts grouped by expected
  skill so you can confirm routing visually in Claude Code).
- `run-programmatic.js` — Automated judge-model runner (see below).
- `last-run.json` — Per-prompt machine-readable result from the most recent
  programmatic run (gitignored).

## Automated runs

```bash
ANTHROPIC_API_KEY=sk-ant-... ./run.sh
# or directly:
ANTHROPIC_API_KEY=sk-ant-... node skill/evals/run-programmatic.js
```

Output: one line per prompt (`PASS|FAIL  expected: X  predicted: Y  conf: 0.NN`),
a summary block, and a grouped failure list. Exit code is 0 on all-pass, 1
otherwise. A full per-prompt record (predicted skill, confidence, reasoning,
tokens) lands in `last-run.json`.

**Cost:** ~20 prompts × ~1500 tokens ≈ 30k Haiku tokens per run — pennies.

### The judge-model approximation (honest caveats)

The Anthropic SDK does NOT have a "load these skills and tell me which one
activates" API — Claude Code's skill loader is internal to that product. This
runner uses a **judge model** as a proxy: it sends Claude Haiku a curated
catalog of `ursamu-dev` plus 15+ sibling skills with their real descriptions
and asks it to predict which skill would route for each eval prompt.

This is NOT the real loader. It IS a useful proxy for description ambiguity:
if a competent reader (Haiku, given the same descriptions the loader sees)
mis-routes a prompt, the description is probably ambiguous to the loader too.

### Interpreting a failure

1. Open `skill/evals/last-run.json` and find the failed entry.
2. Read `predicted`, `confidence`, and `reasoning` for the model's choice.
3. Decide:
   - **Description issue** → tighten the SKILL.md frontmatter `description:`
     to disambiguate from the predicted sibling. Re-run.
   - **Eval issue** → the prompt is genuinely ambiguous to any reader. Either
     rewrite it to be more pointed, or move it to the other bucket.
4. Re-run until all 20 pass (or you've documented why a stubborn one is OK).

## Known trigger collisions

The `should_not_trigger` set explicitly tests for these competing skills:

| Sibling | Why it collides | Our disambiguator |
|---------|-----------------|-------------------|
| `mush-architect`, `mush-natural` | Both fire on "MUSH" | We name "UrsaMU" + "TypeScript MUSH engine" + exclude RhostMUSH/PennMUSH/TinyMUX |
| `mush-bboard`, `mush-chargen`, `mush-jobs` | Domain MUSH scaffolds | They target softcode; we target TypeScript engine code |
| `tdd-workflows-tdd-cycle`, `test-driven-development` | Both fire on "test" | We name `mockU`/`mockPlayer`/Deno + UrsaMU APIs |
| `tdd-audit` | Fires on "audit" | We *invoke* `/tdd-audit` as Stage 4b; standalone audit prompts should still go to tdd-audit |
| `code-reviewer`, `review`, `security-review` | Fire on "review", "audit" | We require UrsaMU/Deno markers in the prompt |
| `sdd`, `writing-plans`, `concise-planning` | Stage 0 looks like spec-driven dev | We require UrsaMU context; generic spec prompts go to sdd |
| `documentation`, `api-documentation`, `readme` | Fire on "docs", "README" | We name plugin README + REST route contract specifically |

## Adding a new eval

1. Pick a clear category: should-trigger (skill applies) or should-not-trigger
   (named sibling owns it).
2. Write the prompt as a real user would — no "this is an eval" cues.
3. Set `expect_skill` (or `expect_skill_in` for multiple acceptable answers).
4. Set `near_miss_for` if the prompt is intentionally close to another skill.

Aim for **near-miss** should-not-trigger prompts — generic ones don't test
anything. The harder it is to tell apart, the better the eval.
