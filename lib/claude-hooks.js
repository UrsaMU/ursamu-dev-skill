/**
 * lib/claude-hooks.js
 *
 * Installs / uninstalls the UrsaMU stage-gate PreToolUse hook entry inside
 * the user's Claude Code settings file (~/.claude/settings.json).
 *
 * Safe rules:
 *  - Idempotent: matches our hook by command-string substring; never adds duplicates.
 *  - Preserves unrelated keys and unrelated PreToolUse matchers.
 *  - Backs up the existing settings.json to settings.json.bak on first modify.
 *  - Surfaces clear errors on corrupted JSON instead of crashing.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

// Substring used to match our hook entry inside settings.json.
export const STAGE_GATE_MARKER = "ursamu-dev/hooks/pretool-stage-gate.sh";

// The canonical entry we install.
export const STAGE_GATE_ENTRY = Object.freeze({
  matcher: "Write|Edit|NotebookEdit",
  hooks: [
    {
      type: "command",
      command: "bash ~/.claude/skills/ursamu-dev/hooks/pretool-stage-gate.sh",
      timeout: 5,
    },
  ],
});

/**
 * Default settings.json path: ~/.claude/settings.json.
 * @returns {string}
 */
export function defaultSettingsPath() {
  return join(homedir(), ".claude", "settings.json");
}

/**
 * Read and parse a settings.json file. Returns {} if missing or empty.
 * Throws a clear Error on invalid JSON.
 *
 * @param {string} path
 * @returns {object}
 */
function readSettings(path) {
  if (!existsSync(path)) return {};
  let raw;
  try {
    raw = readFileSync(path, "utf8");
  } catch (e) {
    throw new Error(`Failed to read ${path}: ${e.message}`);
  }
  if (raw.trim() === "") return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("settings.json root must be a JSON object");
    }
    return parsed;
  } catch (e) {
    throw new Error(
      `Corrupted settings file at ${path}: ${e.message}. ` +
      `Please fix or remove the file and retry.`
    );
  }
}

/**
 * Returns true if any PreToolUse matcher already contains our hook command.
 *
 * @param {object} settings
 * @returns {boolean}
 */
function hasOurEntry(settings) {
  const pre = settings?.hooks?.PreToolUse;
  if (!Array.isArray(pre)) return false;
  for (const m of pre) {
    if (!m || !Array.isArray(m.hooks)) continue;
    for (const h of m.hooks) {
      if (h && typeof h.command === "string" && h.command.includes(STAGE_GATE_MARKER)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Install the UrsaMU stage-gate PreToolUse hook into settings.json.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun]       Preview without writing.
 * @param {boolean} [opts.force]        Add the entry even if a match exists (no-op currently — kept for API parity).
 * @param {string}  [opts.settingsPath] Override target settings.json path.
 * @returns {{ status: "installed"|"already-present"|"dry-run", path: string }}
 */
export function installClaudeStageGate(opts = {}) {
  const dryRun       = opts.dryRun ?? false;
  const force        = opts.force  ?? false;
  const settingsPath = opts.settingsPath ?? defaultSettingsPath();

  const settings = readSettings(settingsPath);

  if (!force && hasOurEntry(settings)) {
    return { status: "already-present", path: settingsPath };
  }

  if (dryRun) {
    return { status: "dry-run", path: settingsPath };
  }

  // Normalize structure.
  if (!settings.hooks || typeof settings.hooks !== "object" || Array.isArray(settings.hooks)) {
    settings.hooks = {};
  }
  if (!Array.isArray(settings.hooks.PreToolUse)) {
    settings.hooks.PreToolUse = [];
  }

  settings.hooks.PreToolUse.push(JSON.parse(JSON.stringify(STAGE_GATE_ENTRY)));

  // Backup existing file on first modify.
  if (existsSync(settingsPath)) {
    const bak = settingsPath + ".bak";
    if (!existsSync(bak)) {
      try { copyFileSync(settingsPath, bak); } catch { /* best-effort */ }
    }
  } else {
    mkdirSync(dirname(settingsPath), { recursive: true });
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return { status: "installed", path: settingsPath };
}

/**
 * Remove our stage-gate hook from settings.json (leaves other entries intact).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.dryRun]
 * @param {string}  [opts.settingsPath]
 * @returns {{ status: "uninstalled"|"not-present"|"dry-run", path: string }}
 */
export function uninstallClaudeStageGate(opts = {}) {
  const dryRun       = opts.dryRun ?? false;
  const settingsPath = opts.settingsPath ?? defaultSettingsPath();

  if (!existsSync(settingsPath)) {
    return { status: "not-present", path: settingsPath };
  }

  const settings = readSettings(settingsPath);

  if (!hasOurEntry(settings)) {
    return { status: "not-present", path: settingsPath };
  }

  if (dryRun) {
    return { status: "dry-run", path: settingsPath };
  }

  const pre = settings.hooks.PreToolUse;
  const filtered = [];
  for (const m of pre) {
    if (!m || !Array.isArray(m.hooks)) { filtered.push(m); continue; }
    const remainingHooks = m.hooks.filter(
      h => !(h && typeof h.command === "string" && h.command.includes(STAGE_GATE_MARKER))
    );
    if (remainingHooks.length === 0) {
      // Drop the matcher entirely if it only contained our hook.
      continue;
    }
    filtered.push({ ...m, hooks: remainingHooks });
  }
  settings.hooks.PreToolUse = filtered;

  // Backup before write.
  const bak = settingsPath + ".bak";
  if (!existsSync(bak)) {
    try { copyFileSync(settingsPath, bak); } catch { /* best-effort */ }
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf8");
  return { status: "uninstalled", path: settingsPath };
}
