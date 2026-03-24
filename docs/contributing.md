# Contributing

## Component Map

| Component | Location |
|-----------|----------|
| Skill content | `skill/SKILL.md` |
| API reference | `skill/references/api-reference.md` |
| Skill installer + hook installer | `bin/cli.js`, `lib/hooks.js` |
| Static audit checks | `lib/audit/checks.js` |
| Audit runner | `lib/audit/runner.js` |
| Audit auto-fixer | `lib/audit/fixer.js` |
| Watch mode diff utilities | `lib/audit/watcher.js` |
| Scaffold templates | `lib/scaffold/templates.js` |
| Scaffold writer + name validation | `lib/scaffold/writer.js` |
| Docs generator | `bin/docs.js` |
| LLM provider resolution + SSRF guard | `lib/llm.js` |

## Testing Locally

```bash
node bin/cli.js --dry-run --all        # installer smoke test
node bin/audit.js --help               # audit CLI
node bin/scaffold.js --help            # scaffold CLI
npm run test:audit                     # audit + fixer tests
npm run test:scaffold                  # scaffold tests
npm run test:hooks                     # hook installer tests
npm run test:docs                      # docs + security tests
```

## Test Suite

| Script | Description | Tests |
|--------|-------------|-------|
| `npm test` | Dry-run skill install to all platforms | — |
| `npm run test:audit` | Unit + integration tests for `ursamu-audit` + fixer | 68 |
| `npm run test:scaffold` | Unit tests for `ursamu-scaffold` templates + writer | 62 |
| `npm run test:hooks` | Unit tests for hook installer + watcher diff utilities | 20 |
| `npm run test:docs` | Tests for `ursamu-docs` + all security tests | 97 |
| `npm run test:security` | Path-traversal and SSRF security tests only | — |

**Total: 247 tests across 18 test files.**

```
__tests__/
  audit/
    checks.test.js      # 41 unit tests, one per check + edge cases
    runner.test.js      # 12 integration tests against fixture directories
    fixer.test.js       # 15 tests for applyFixesToLines + fixFile
  scaffold/
    templates.test.js   # 35 tests, one per template function
    writer.test.js      # 27 tests for validateName + writeScaffold
  hooks/
    hooks.test.js       # 13 hook installer tests + 7 watcher diff tests
  docs/
    llm.test.js         # 14 tests for provider resolution + SSRF
    scanner.test.js     # 6 tests for source unit discovery
    writer.test.js      # 8 tests for section parsing + artifact writing
  security/
    ssrf-base-url.test.js         # 21 SSRF exploit tests (all IP ranges)
    path-traversal-src.test.js    # path traversal via --src
    arbitrary-write-out.test.js   # path traversal via --out
    nan-numeric-args.test.js      # NaN injection via --stage / --max-tokens
    unbounded-scan.test.js        # DoS via deeply nested or huge directories
    missing-arg.test.js           # missing value after flag
    patch-mode-write.test.js      # patch mode path safety
    codex-home-traversal.test.js  # CODEX_HOME escape attempts
```

## Adding a New Audit Check

1. Add the check function to `lib/audit/checks.js` and export it
2. Add it to `runAllChecks()` at the bottom of `checks.js`
3. Add a passing fixture to `__tests__/audit/__fixtures__/passing/`
4. Add a failing fixture to `__tests__/audit/__fixtures__/failing/`
5. Add unit tests to `__tests__/audit/checks.test.js`
6. Add a runner integration test to `__tests__/audit/runner.test.js`
7. Update the checks table in `docs/audit.md` and in `bin/audit.js` HELP

## Adding an Auto-fixable Check

1. Follow the steps above
2. Add the check ID to `FIXABLE_CHECKS` in `lib/audit/fixer.js`
3. Add a fix branch in `applyFixesToLines()`
4. Add fixer tests to `__tests__/audit/fixer.test.js`
5. Mark the check ✓ in the `docs/audit.md` checks table
