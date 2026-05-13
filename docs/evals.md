# Trigger Evals

Skills are matched by their frontmatter `description:` field. The `skill/evals/`
suite tests whether the loader (or a faithful proxy of it) actually routes the
prompts we expect to `ursamu-dev` — and **doesn't** route near-miss prompts
that belong to sibling skills.

Canonical reference: `skill/evals/README.md`. This page covers the parts worth
knowing without reading the runner source.

## Pattern

`skill/evals/evals.json` holds two buckets of 10 prompts each:

- **`should_trigger`** — prompts that must select `ursamu-dev`. UrsaMU-specific
  markers (`addCmd`, `IPlugin`, `gameHooks`, `jsr:@ursamu/ursamu`, etc.) are
  intentional.
- **`should_not_trigger`** — near-miss prompts that *look* UrsaMU-adjacent but
  belong elsewhere. Each entry **names the sibling skill** it should route to
  (`mush-architect`, `tdd-audit`, `sdd`, `documentation`, etc.), so a failure
  identifies exactly which description boundary blurred.

Re-run the suite whenever you change:

- The frontmatter `description:` field.
- The "Use this skill when" / "Do not use this skill when" sections.
- Any of the trigger-collision-prone areas (audit, test, design, docs, MUSH).

## Running

```bash
npm run test:evals
# or, against the Anthropic SDK directly:
ANTHROPIC_API_KEY=sk-ant-... node skill/evals/run-programmatic.js
```

Output is one line per prompt — `PASS|FAIL  expected: X  predicted: Y  conf: 0.NN`
— a summary, and a grouped failure list. Full per-prompt records (predicted
skill, confidence, reasoning, tokens) land in `skill/evals/last-run.json`
(gitignored).

## The judge-model proxy caveat

The Anthropic SDK does **not** expose Claude Code's internal skill-loader as
a callable. `run-programmatic.js` uses a **judge model** (Claude Haiku) as a
proxy: it presents Haiku with `ursamu-dev`'s description alongside 15+ sibling
skills and asks which would route for each prompt.

This is **not** the real loader. It is a useful proxy for description
ambiguity — if a competent reader can't disambiguate given the same
descriptions the loader sees, the loader probably can't either. Treat
proxy passes as necessary-but-not-sufficient; treat proxy failures as a
real signal to tighten the description.

## Interpreting a failure

1. Open `skill/evals/last-run.json`, find the failed entry.
2. Read `predicted`, `confidence`, and `reasoning`.
3. Diagnose:
   - **Description issue** — tighten the SKILL.md frontmatter to disambiguate
     from the predicted sibling. Re-run.
   - **Eval issue** — the prompt is genuinely ambiguous to any reader.
     Sharpen it, or move it to the other bucket.

## Cost

~20 prompts × ~1500 tokens ≈ 30k Haiku tokens per run. Pennies. Run on every
SKILL.md description change without hesitation.

See [contributing.md](./contributing.md) for the surrounding test suite.
