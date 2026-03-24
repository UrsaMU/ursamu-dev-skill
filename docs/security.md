# Security Model

Every user-controlled input is validated before any filesystem or network operation.

## Path Traversal Protection

All paths supplied by users (`--src`, `--out`, plugin `--out`, audit scan path) are resolved to their absolute canonical form and checked to be strictly inside `process.cwd()`:

```js
const abs = resolve(rawPath);
if (abs !== cwd && !abs.startsWith(cwd + "/")) throw new Error("...");
```

Applied at multiple layers:

| Module | Guard |
|--------|-------|
| `lib/scanner.js` | `assertSafePath()` |
| `lib/writer.js` | `assertSafeOutPath()` |
| `lib/scaffold/writer.js` | local `assertSafeOutPath()` |
| `lib/audit/runner.js` | delegates to `assertSafePath()` |
| `lib/hooks.js` | never writes outside the detected git root |

## SSRF Prevention

Custom LLM base URLs (`--base-url`) are validated against all known internal address classes:

| Class | Range | Blocked |
|-------|-------|---------|
| Non-HTTPS schemes | `http://`, `ftp://`, `file://`, etc. | ✓ |
| IPv4 loopback | `127.0.0.0/8` | ✓ |
| Localhost | `localhost`, `ip6-localhost` | ✓ |
| RFC-1918 class A | `10.0.0.0/8` | ✓ |
| RFC-1918 class B | `172.16.0.0/12` | ✓ |
| RFC-1918 class C | `192.168.0.0/16` | ✓ |
| Link-local / cloud metadata | `169.254.0.0/16` | ✓ |
| IPv6 loopback | `::1` | ✓ |
| IPv6 Unique Local | `fc00::/7` (`fc__`, `fd__` prefixes) | ✓ |
| IPv6 Link-Local | `fe80::/10` (`fe80`–`febf`) | ✓ |

DNS rebinding is acknowledged as out of scope for a local CLI tool.

## DoS Limits

Recursive directory scans cap at:
- `MAX_DEPTH = 8` — maximum directory nesting
- `MAX_FILES = 500` — maximum source files per scan

Symlinks are never followed.

## Input Validation

| Input | Constraint |
|-------|-----------|
| Plugin name | `/^[a-z][a-z0-9-]*$/` |
| `--stage` | Integer in `[0, 9]` |
| `--max-tokens` | Positive integer ≤ 100,000 |
| `CODEX_HOME` | Must resolve to a path inside `$HOME` |
