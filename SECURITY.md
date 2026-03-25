# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | ✓         |
| < 1.0   | ✗         |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report security issues by emailing the maintainers directly or by opening a
[GitHub Security Advisory](https://github.com/lhi-code/ursamu-dev-pkg/security/advisories/new)
(private disclosure).

Include:
- A description of the vulnerability and its impact
- Steps to reproduce or a minimal proof-of-concept
- Any suggested mitigations

We aim to acknowledge reports within **72 hours** and to release a patch within
**14 days** for confirmed issues.

## Security Design Notes

- **No CLI secrets** — `--api-key` is rejected on the command line.
  Set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY` as environment
  variables to avoid shell-history and process-list exposure.
- **Path traversal prevention** — all file-write operations in `lib/writer.js`,
  `lib/scaffold/writer.js`, and `lib/scanner.js` assert that resolved paths
  stay within `process.cwd()`.
- **Command-name injection prevention** — `commandBlockTemplate` whitelists
  plugin/command names to `[a-z][a-z0-9-]*` (optionally prefixed with `+`).
