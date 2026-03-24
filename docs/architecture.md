# Architecture

## Directory Structure

```
@lhi/ursamu-dev/
├── bin/
│   ├── cli.js          # ursamu-dev — skill installer + hook installer
│   ├── audit.js        # ursamu-audit — static analysis CLI
│   ├── scaffold.js     # ursamu-scaffold — plugin boilerplate generator
│   └── docs.js         # ursamu-docs — LLM-powered docs generator
│
├── lib/
│   ├── scanner.js      # source unit discovery (commands + plugins)
│   ├── writer.js       # docs artifact writer (default + patch modes)
│   ├── hooks.js        # git pre-commit hook installer
│   ├── llm.js          # LLM provider resolution + SSRF guard
│   ├── prompts.js      # SKILL.md stage extraction
│   │
│   ├── audit/
│   │   ├── checks.js   # 11 pure check functions + block extractor
│   │   ├── runner.js   # orchestrates checks across a directory tree
│   │   ├── reporter.js # formats violations for console or JSON
│   │   ├── fixer.js    # auto-repairs check-09 and check-15 in place
│   │   └── watcher.js  # fs.watch loop + pure diff utilities
│   │
│   └── scaffold/
│       ├── templates.js # all file template strings (6 templates)
│       └── writer.js    # validates names, resolves paths, writes files
│
├── skill/
│   ├── SKILL.md                     # full skill content
│   └── references/
│       └── api-reference.md         # authoritative UrsaMU SDK reference
│
├── companion-skills/                # 8 skills installed alongside ursamu-dev
│   ├── game-development/
│   ├── typescript-expert/
│   ├── typescript-advanced-types/
│   ├── tdd-workflows-tdd-cycle/
│   ├── error-handling-patterns/
│   ├── docs-architect/
│   ├── readme/
│   └── api-documentation/
│
└── __tests__/
    ├── audit/           # checks, runner, fixer tests (68 total)
    ├── scaffold/        # templates, writer tests (62 total)
    ├── hooks/           # hook installer + watcher diff tests (20 total)
    ├── docs/            # LLM, scanner, writer tests (28 total)
    └── security/        # path traversal, SSRF, DoS, NaN tests (69 total)
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
```
