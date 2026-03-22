#!/usr/bin/env node

import { cpSync, mkdirSync, existsSync, readdirSync, writeFileSync, readFileSync, realpathSync } from "fs";
import { join, dirname, resolve } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const SKILL_DIR      = join(__dirname, "..", "skill");
const COMPANION_DIR  = join(__dirname, "..", "companion-skills");
const HOME           = homedir();

// ── CODEX_HOME validation ──────────────────────────────────────────────────
// Exported for testing. Resolves CODEX_HOME to an absolute path and verifies
// it is contained within $HOME. Falls back to the default ~/.codex/skills if
// the value is absent, empty, or escapes $HOME (path traversal guard).

export function resolveCodexHome(envValue, home) {
  const fallback = join(home, ".codex", "skills");
  if (!envValue || typeof envValue !== "string" || envValue.trim() === "") {
    return fallback;
  }
  // resolve() expands relative paths and collapses all traversal sequences
  const resolved = resolve(envValue);
  // Ensure the resolved path is strictly inside HOME
  const safeHome = home.replace(/\/+$/, "");
  if (!resolved.startsWith(safeHome + "/") && resolved !== safeHome) {
    return fallback;
  }
  return join(resolved, "skills");
}

// ── Platform definitions ───────────────────────────────────────────────────

const PLATFORMS = {
  claude:      { type: "skills-dir", dir: join(HOME, ".claude",  "skills") },
  gemini:      { type: "skills-dir", dir: join(HOME, ".gemini",  "skills") },
  cursor:      { type: "skills-dir", dir: join(HOME, ".cursor",  "skills") },
  codex:       { type: "skills-dir", dir: resolveCodexHome(process.env.CODEX_HOME, HOME) },
  antigravity: { type: "skills-dir", dir: join(HOME, ".antigravity", "skills") },
  opencode:    { type: "opencode-agent", dir: join(HOME, ".config", "opencode", "agents") },
};

// ── Installers ─────────────────────────────────────────────────────────────

function installSkillsDir(name, destBase, dryRun) {
  const dest = join(destBase, "ursamu-dev");
  console.log(`  → ${dest}`);
  if (dryRun) { console.log("    dry-run — skipped"); return true; }
  try {
    mkdirSync(dest, { recursive: true });
    cpSync(SKILL_DIR, dest, { recursive: true });
    console.log(`  ✓ ursamu-dev installed`);
    return true;
  } catch (e) {
    if (e.code === "EACCES") {
      console.error(`  ✗ Permission denied: ${destBase}`);
      console.error(`    Fix with: sudo chown -R $(whoami) ${destBase}`);
    } else {
      console.error(`  ✗ ${name} install failed: ${e.message}`);
    }
    return false;
  }
}

function installCompanions(destBase, dryRun) {
  if (!existsSync(COMPANION_DIR)) return;
  const skills = readdirSync(COMPANION_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const skill of skills) {
    const src  = join(COMPANION_DIR, skill);
    const dest = join(destBase, skill);
    console.log(`  → ${dest}`);
    if (dryRun) { console.log("    dry-run — skipped"); continue; }
    try {
      mkdirSync(dest, { recursive: true });
      cpSync(src, dest, { recursive: true });
      console.log(`  ✓ ${skill} installed`);
    } catch (e) {
      if (e.code === "EACCES") {
        console.error(`  ✗ Permission denied: ${destBase}`);
      } else {
        console.error(`  ✗ ${skill} install failed: ${e.message}`);
      }
    }
  }
}

function installOpenCode(destDir, dryRun) {
  const dest = join(destDir, "ursamu-dev.md");
  console.log(`  → ${dest}`);
  if (dryRun) { console.log("    dry-run — skipped"); return true; }

  // Strip Claude YAML frontmatter, prepend OpenCode frontmatter
  const raw = readFileSync(join(SKILL_DIR, "SKILL.md"), "utf8");
  const body = raw.replace(/^---[\s\S]*?---\n/, "");
  const content =
`---
name: ursamu-dev
description: Generates idiomatic TypeScript/Deno code for UrsaMU MU* server using the u SDK — commands, plugins, scripts, REST routes, and game hooks — with integrated security and style validation.
---

` + body;

  try {
    mkdirSync(destDir, { recursive: true });
    writeFileSync(dest, content, "utf8");
    console.log("  ✓ ursamu-dev OpenCode agent installed");
    return true;
  } catch (e) {
    if (e.code === "EACCES") {
      console.error(`  ✗ Permission denied: ${destDir}`);
      console.error(`    Fix with: sudo chown -R $(whoami) ${destDir}`);
    } else {
      console.error(`  ✗ OpenCode install failed: ${e.message}`);
    }
    return false;
  }
}

// ── Main (guarded — safe to import for testing) ────────────────────────────

const isMain = (() => {
  try { return realpathSync(process.argv[1]) === realpathSync(__filename); }
  catch { return false; }
})();

if (isMain) {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
@lhi/ursamu-dev — UrsaMU dev skill installer

  npx @lhi/ursamu-dev [options]

Options:
  --claude        Install to ~/.claude/skills        (Claude Code)
  --gemini        Install to ~/.gemini/skills        (Gemini CLI)
  --cursor        Install to ~/.cursor/skills        (Cursor)
  --codex         Install to ~/.codex/skills         (Codex CLI)
  --antigravity   Install to ~/.antigravity/skills   (Antigravity)
  --opencode      Install to ~/.config/opencode/agents (OpenCode)
  --all           Install to all platforms above
  --no-companions Skip companion skills installation
  --dry-run       Show what would be installed without writing files
  --help          Show this help

Default: --claude

Companion skills installed alongside ursamu-dev:
  game-development, typescript-expert, typescript-advanced-types,
  tdd-workflows-tdd-cycle, error-handling-patterns,
  docs-architect, readme, api-documentation

Examples:
  npx @lhi/ursamu-dev
  npx @lhi/ursamu-dev --opencode
  npx @lhi/ursamu-dev --all
  npx @lhi/ursamu-dev --claude --opencode
  npx @lhi/ursamu-dev --claude --no-companions
`);
    process.stdout.write("", () => process.exit(0));
  }

  const DRY_RUN       = args.includes("--dry-run");
  const NO_COMPANIONS = args.includes("--no-companions");

  const targets = new Set();
  if (args.includes("--all")) {
    Object.keys(PLATFORMS).forEach(p => targets.add(p));
  } else {
    for (const p of Object.keys(PLATFORMS)) {
      if (args.includes(`--${p}`)) targets.add(p);
    }
    if (targets.size === 0) targets.add("claude"); // default
  }

  console.log("\n@lhi/ursamu-dev — UrsaMU dev skill installer\n");

  let passed = 0;
  for (const name of targets) {
    const platform = PLATFORMS[name];
    console.log(`Installing for ${name}...`);

    let ok;
    if (platform.type === "opencode-agent") {
      ok = installOpenCode(platform.dir, DRY_RUN);
    } else {
      ok = installSkillsDir(name, platform.dir, DRY_RUN);
    }

    if (ok && !NO_COMPANIONS && platform.type === "skills-dir") {
      console.log(`  Installing companion skills...`);
      installCompanions(platform.dir, DRY_RUN);
    }

    if (ok) passed++;
    console.log();
  }

  // ── tdd-audit toolchain ──────────────────────────────────────────────────
  // Runs after ALL skills (primary + companions) are written.
  // Currently supports --claude only; expand as tdd-audit gains multi-platform flags.

  if (!DRY_RUN && targets.has("claude")) {
    console.log("Installing @lhi/tdd-audit toolchain...");
    try {
      const tddBin = require.resolve("@lhi/tdd-audit");
      const result = spawnSync(process.execPath, [tddBin, "--claude", "--skip-scan"], {
        stdio: "inherit",
      });
      if (result.status !== 0) {
        console.error("  ✗ tdd-audit install failed (non-zero exit)");
      }
    } catch (e) {
      console.error(`  ✗ tdd-audit not found: ${e.message}`);
    }
    console.log();
  }

  const exitCode = passed === targets.size ? 0 : 1;
  const finalMsg = exitCode === 0
    ? `Done. Run /ursamu-dev in your agent to activate.\n`
    : `Completed with errors (${passed}/${targets.size} installed).\n`;

  process.stdout.write(finalMsg, () => process.exit(exitCode));
}
