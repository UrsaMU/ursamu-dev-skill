#!/usr/bin/env node

import { cpSync, mkdirSync, existsSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILL_DIR  = join(__dirname, "..", "skill");
const HOME       = homedir();

// ── Platform definitions ───────────────────────────────────────────────────

const PLATFORMS = {
  claude:      { type: "skills-dir", dir: join(HOME, ".claude",  "skills") },
  gemini:      { type: "skills-dir", dir: join(HOME, ".gemini",  "skills") },
  cursor:      { type: "skills-dir", dir: join(HOME, ".cursor",  "skills") },
  codex:       { type: "skills-dir", dir: process.env.CODEX_HOME
                   ? join(process.env.CODEX_HOME, "skills")
                   : join(HOME, ".codex", "skills") },
  antigravity: { type: "skills-dir", dir: join(HOME, ".antigravity", "skills") },
  opencode:    { type: "opencode-agent", dir: join(HOME, ".config", "opencode", "agents") },
};

// ── Arg parsing ────────────────────────────────────────────────────────────

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
  --dry-run       Show what would be installed without writing files
  --help          Show this help

Default: --claude

Examples:
  npx @lhi/ursamu-dev
  npx @lhi/ursamu-dev --opencode
  npx @lhi/ursamu-dev --all
  npx @lhi/ursamu-dev --claude --opencode
`);
  process.exit(0);
}

const DRY_RUN = args.includes("--dry-run");

const targets = new Set();
if (args.includes("--all")) {
  Object.keys(PLATFORMS).forEach(p => targets.add(p));
} else {
  for (const p of Object.keys(PLATFORMS)) {
    if (args.includes(`--${p}`)) targets.add(p);
  }
  if (targets.size === 0) targets.add("claude"); // default
}

// ── Installers ─────────────────────────────────────────────────────────────

function installSkillsDir(name, destBase) {
  const dest = join(destBase, "ursamu-dev");
  console.log(`  → ${dest}`);
  if (DRY_RUN) { console.log("    dry-run — skipped"); return true; }
  try {
    mkdirSync(dest, { recursive: true });
    cpSync(SKILL_DIR, dest, { recursive: true });
    console.log(`  ✓ ${name} skill installed`);
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

function installOpenCode(destDir) {
  const dest = join(destDir, "ursamu-dev.md");
  console.log(`  → ${dest}`);
  if (DRY_RUN) { console.log("    dry-run — skipped"); return true; }

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
    console.log("  ✓ OpenCode agent installed");
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

// ── Main ───────────────────────────────────────────────────────────────────

console.log("\n@lhi/ursamu-dev — UrsaMU dev skill installer\n");

let passed = 0;
for (const name of targets) {
  const platform = PLATFORMS[name];
  console.log(`Installing for ${name}...`);
  let ok;
  if (platform.type === "opencode-agent") {
    ok = installOpenCode(platform.dir);
  } else {
    ok = installSkillsDir(name, platform.dir);
  }
  if (ok) passed++;
  console.log();
}

// ── tdd-audit toolchain ────────────────────────────────────────────────────
// tdd-audit currently supports --claude only; invoke it when that target was
// selected.  As tdd-audit gains multi-platform flags we can expand here.

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

if (passed === targets.size) {
  console.log(`Done. Run /ursamu-dev in your agent to activate.\n`);
  process.exit(0);
} else {
  console.log(`Completed with errors (${passed}/${targets.size} installed).\n`);
  process.exit(1);
}
