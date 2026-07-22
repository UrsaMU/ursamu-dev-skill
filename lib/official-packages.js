/**
 * lib/official-packages.js
 *
 * First-party @ursamu/* package catalog used by scaffold (and later CLI/audit).
 * Keep in sync with skill/references/official-packages.md when packages land.
 *
 * Keys are reserved scaffold names (lowercase slugs). Aliases (e.g. "channel"
 * → channels) share the same entry so users cannot reinvent under either name.
 */

/**
 * @typedef {Object} OfficialPackage
 * @property {string} jsr        - JSR package name, e.g. "@ursamu/mail"
 * @property {string} summary    - one-line description
 * @property {string} [install]  - preferred install hint (defaults to jsr:@…)
 */

/** @type {Record<string, OfficialPackage>} */
export const OFFICIAL_PACKAGES = {
  // Engine / tooling
  core: {
    jsr: "@ursamu/core",
    summary: "Generic multiplayer text-server infrastructure (transports, DBO, hooks).",
  },
  mush: {
    jsr: "@ursamu/mush",
    summary: "MUSH world layer — preferred engine import for plugins.",
  },
  cli: {
    jsr: "@ursamu/cli",
    summary: "Project/plugin scaffold, plugin install, engine update.",
  },
  ursamu: {
    jsr: "@ursamu/ursamu",
    summary: "Legacy engine package alias — use @ursamu/mush for new code.",
  },

  // Default stack
  help: {
    jsr: "@ursamu/help",
    summary: "API-first help system (registerHelpDir, help commands, REST).",
  },
  channels: {
    jsr: "@ursamu/channels",
    summary: "Chat channels with aliases, history, and admin tools.",
  },
  channel: {
    jsr: "@ursamu/channels",
    summary: "Chat channels with aliases, history, and admin tools.",
  },
  builder: {
    jsr: "@ursamu/builder",
    summary: "World-building verbs (@dig, @open, @link, …) and building REST API.",
  },
  bbs: {
    jsr: "@ursamu/bbs",
    summary: "Myrddin-style bulletin boards (+bb*).",
  },
  mail: {
    jsr: "@ursamu/mail",
    summary: "In-game mail — drafts, folders, attachments, quota, REST.",
  },
  wiki: {
    jsr: "@ursamu/wiki",
    summary: "File-based markdown wiki (+wiki / @wiki).",
  },

  // Staff & social
  jobs: {
    jsr: "@ursamu/jobs",
    summary: "Anomaly-style jobs/request system (+job, +request).",
  },
  events: {
    jsr: "@ursamu/events",
    summary: "In-game event calendar with RSVP tracking.",
  },
  scene: {
    jsr: "@ursamu/scene",
    summary: "Cross-platform RP scene/pose system (+scene).",
  },
  discord: {
    jsr: "@ursamu/discord",
    summary: "Discord bridge — webhooks, channel chat, /help slash command.",
  },
  lang: {
    jsr: "@ursamu/lang-plugin",
    summary: "Per-listener language garbling on say/pose.",
  },
  "lang-plugin": {
    jsr: "@ursamu/lang-plugin",
    summary: "Per-listener language garbling on say/pose.",
  },
  vendor: {
    jsr: "@ursamu/vendor-plugin",
    summary: "Shop + grab-stall vendors (+buy, +sell, +grab).",
  },
  "vendor-plugin": {
    jsr: "@ursamu/vendor-plugin",
    summary: "Shop + grab-stall vendors (+buy, +sell, +grab).",
  },

  // Combat & world
  combat: {
    jsr: "@ursamu/combat",
    summary: "System-agnostic combat engine — register CombatPorts from game systems.",
  },
  map: {
    jsr: "@ursamu/map-plugin",
    summary: "Coordinate sector map, pathfinding, +map / +move.",
  },
  "map-plugin": {
    jsr: "@ursamu/map-plugin",
    summary: "Coordinate sector map, pathfinding, +map / +move.",
  },

  // TTRPG / setting systems
  cofd: {
    jsr: "@ursamu/cofd-plugin",
    summary: "Chronicles of Darkness 2e system plugin.",
  },
  "cofd-plugin": {
    jsr: "@ursamu/cofd-plugin",
    summary: "Chronicles of Darkness 2e system plugin.",
  },
  dnd: {
    jsr: "@ursamu/dnd-plugin",
    summary: "D&D 5e/2024 system plugin.",
  },
  "dnd-plugin": {
    jsr: "@ursamu/dnd-plugin",
    summary: "D&D 5e/2024 system plugin.",
  },
  cyberpunk: {
    jsr: "@ursamu/cyberpunk-plugin",
    summary: "Cyberpunk RED system plugin.",
  },
  "cyberpunk-plugin": {
    jsr: "@ursamu/cyberpunk-plugin",
    summary: "Cyberpunk RED system plugin.",
  },
  sw5e: {
    jsr: "@ursamu/sw5e-plugin",
    summary: "Star Wars 5E system plugin.",
  },
  "sw5e-plugin": {
    jsr: "@ursamu/sw5e-plugin",
    summary: "Star Wars 5E system plugin.",
  },
  mekton: {
    jsr: "@ursamu/mekton-zeta",
    summary: "Mekton Zeta system plugin.",
  },
  "mekton-zeta": {
    jsr: "@ursamu/mekton-zeta",
    summary: "Mekton Zeta system plugin.",
  },
  "ai-gm": {
    jsr: "@ursamu/ai-gm",
    summary: "Agentic AI Game Master (+gm/*).",
  },
  aigm: {
    jsr: "@ursamu/ai-gm",
    summary: "Agentic AI Game Master (+gm/*).",
  },
};

/**
 * Look up an official package by scaffold name (case-sensitive lowercase slug).
 *
 * @param {string} name
 * @returns {OfficialPackage|null}
 */
export function getOfficialPackage(name) {
  if (typeof name !== "string" || name.length === 0) return null;
  return OFFICIAL_PACKAGES[name] ?? null;
}

/**
 * @param {string} name
 * @returns {boolean}
 */
export function isOfficialPackageName(name) {
  return getOfficialPackage(name) !== null;
}

/**
 * Sorted list of reserved scaffold slugs.
 * @returns {string[]}
 */
export function listOfficialPackageNames() {
  return Object.keys(OFFICIAL_PACKAGES).sort();
}

/**
 * Build a multi-line error message when a reserved name is requested.
 *
 * @param {string} name
 * @param {OfficialPackage} pkg
 * @returns {string}
 */
export function formatOfficialNameError(name, pkg) {
  const installSpec = pkg.install ?? `jsr:${pkg.jsr}`;
  return (
    `"${name}" is an official UrsaMU package (${pkg.jsr}).\n` +
    `  ${pkg.summary}\n` +
    `\n` +
    `  Do not scaffold a competing plugin. Install or extend the package instead:\n` +
    `    ursamu plugin install ${installSpec}\n` +
    `    # or add ${pkg.jsr} to deno.json imports / plugins.manifest.json\n` +
    `\n` +
    `  If you are developing the official package itself, pass --force.\n` +
    `  Catalog: skill/references/official-packages.md`
  );
}

/**
 * Throw if `name` is reserved for an official package.
 *
 * @param {string} name
 * @param {{ force?: boolean }} [opts]
 * @throws {Error}
 */
export function assertNotOfficialName(name, opts = {}) {
  if (opts.force) return;
  const pkg = getOfficialPackage(name);
  if (!pkg) return;
  throw new Error(formatOfficialNameError(name, pkg));
}
