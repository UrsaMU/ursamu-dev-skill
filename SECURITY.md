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

## Security Hardening

Protections applied during the 2025 security audit:

- **SSRF — IPv4-mapped IPv6 block** (`lib/llm.js`) — `--base-url` now rejects
  IPv4-mapped IPv6 addresses (e.g. `::ffff:7f00:1` → `127.0.0.1`) in addition
  to plain loopback/private addresses, closing an SSRF bypass.
- **No CLI secrets** (`bin/docs.js`) — `--api-key` is hard-rejected on the
  command line; set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`
  as an environment variable instead (shell-history / process-list exposure
  prevention).
- **Path traversal prevention** — all file-write operations in `lib/writer.js`,
  `lib/scaffold/writer.js`, `lib/scanner.js`, and `bin/cli.js` assert that
  resolved paths stay within `process.cwd()` or `$HOME`.
- **Command-name injection prevention** — `commandBlockTemplate` whitelists
  plugin/command names to `[a-z][a-z0-9-]*` (optionally prefixed with `+`).
- **DoS limits** — `lib/audit/runner.js` and `lib/scanner.js` cap directory
  depth at 8 and file count at 500 per scan root.
- **No dependency vulnerabilities** — `npm audit` shows zero known
  vulnerabilities as of the audit date.
- **Test coverage gate** — all source files maintain ≥ 95% line/branch coverage
  enforced by the CI test suite.

## Security Design Notes

- **No CLI secrets** — `--api-key` is rejected on the command line.
  Set `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY` as environment
  variables to avoid shell-history and process-list exposure.
- **Path traversal prevention** — all file-write operations in `lib/writer.js`,
  `lib/scaffold/writer.js`, and `lib/scanner.js` assert that resolved paths
  stay within `process.cwd()`.
- **Command-name injection prevention** — `commandBlockTemplate` whitelists
  plugin/command names to `[a-z][a-z0-9-]*` (optionally prefixed with `+`).
