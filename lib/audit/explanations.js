/**
 * lib/audit/explanations.js
 *
 * Full plain-language explanations for every audit check.
 * Used by `ursamu-audit --explain <check-id>`.
 */

/**
 * @type {Record<string, { title: string, level: string, text: string }>}
 */
export const EXPLANATIONS = {
  "check-01": {
    title: "Input sanitization",
    level: "warn",
    text: `\
exec() writes to the DB but no u.util.stripSubs() call was found.

Why it matters:
  MUSH color codes (e.g. %ch, %cr, %cn) are invisible control characters. If
  stored in the database they can corrupt display output for other players, skew
  string-length calculations, and potentially be injected back as functional
  MUSH markup.

How to fix:
  const clean = u.util.stripSubs(u.cmd.args[0] ?? "").trim();
  await u.db.modify(targetId, "$set", { "data.field": clean });

Note: If stripSubs is called in a helper function rather than inline, this
  check may produce a false positive. Suppress with // ursamu-ignore check-01.`,
  },

  "check-02": {
    title: "canEdit permission guard",
    level: "warn",
    text: `\
exec() fetches a target object and writes to the DB but no canEdit() call was found.

Why it matters:
  The UrsaMU SDK does NOT enforce write permission at the database layer.
  Without an explicit canEdit check any connected player can overwrite another
  player's data by crafting the right command arguments.

How to fix:
  const target = await u.util.target(u.me, rawName, true);
  if (!target) { u.send("Target not found."); return; }
  if (!(await u.canEdit(u.me, target))) {
    u.send("Permission denied.");
    return;
  }
  await u.db.modify(target.id, "$set", { ... });

Note: Admin commands that rely on lock: "connected admin+" may intentionally
  omit canEdit. Suppress with // ursamu-ignore check-02 if intentional.`,
  },

  "check-03": {
    title: "Atomic DB writes",
    level: "error",
    text: `\
u.db.modify() was called with a disallowed MongoDB operator.

Why it matters:
  Operators like $push, $pull, $addToSet perform array mutations that are not
  atomic under concurrent access and can leave documents in inconsistent states.
  The UrsaMU SDK only guarantees safety for $set, $inc, and $unset.

Allowed ops:
  "$set"   — set specific fields to given values
  "$inc"   — atomically increment a numeric field
  "$unset" — remove a field from the document

How to fix:
  // Bad
  await u.db.modify(id, "$push", { "data.items": newItem });

  // Good — maintain your own array via $set
  const obj = await u.db.search({ id });
  const updated = [...(obj.data.items ?? []), newItem];
  await u.db.modify(id, "$set", { "data.items": updated });`,
  },

  "check-04": {
    title: "Null guard on util.target()",
    level: "hint",
    text: `\
exec() calls util.target() but no null guard was detected.

Why it matters:
  u.util.target() returns null when the named object cannot be found. Accessing
  properties on null (e.g. target.id) throws a TypeError and crashes the command
  handler, leaving the player with no feedback.

How to fix:
  const target = await u.util.target(u.me, name, true);
  if (!target) { u.send("Target not found."); return; }
  // safe to use target here`,
  },

  "check-05": {
    title: "Admin-only flags guard",
    level: "hint",
    text: `\
addCmd() uses an admin/wizard lock but exec() does not call .flags.has().

Why it matters:
  The lock: field is advisory routing metadata; it is not a security boundary.
  If the command is invoked through an alternative code path the lock may be
  bypassed. Checking u.me.flags.has("admin") inside exec() provides a second
  line of defence.

How to fix:
  exec: async (u) => {
    const isAdmin = u.me.flags.has("admin") ||
                    u.me.flags.has("wizard") ||
                    u.me.flags.has("superuser");
    if (!isAdmin) { u.send("Permission denied."); return; }
    // admin logic here
  }

Note: This is a belt-and-suspenders hint. If the lock is your only intended
  guard and you've audited all entry points, suppress with // ursamu-ignore check-05.`,
  },

  "check-06": {
    title: "Sandbox safety",
    level: "error",
    text: `\
A system/scripts/ file references a banned global (Deno, fetch, require, or process).

Why it matters:
  Files in system/scripts/ are loaded in a sandboxed evaluation context that
  intentionally restricts access to the host environment. Using Deno, fetch,
  require, or process will throw at runtime and may expose the host OS to
  untrusted script content.

Allowed APIs:
  Everything under the u.* SDK namespace is safe. Use u.send(), u.db.*,
  u.util.*, etc. exclusively.

How to fix:
  // Bad
  const data = await fetch("https://example.com/api");

  // Good — use an SDK helper or move I/O to a plugin that registers a hook`,
  },

  "check-07": {
    title: "Color reset",
    level: "warn",
    text: `\
A line contains a MUSH color code but no %cn reset at the end.

Why it matters:
  MUSH color codes like %ch (bold), %cr (red), %cg (green) change the terminal
  state for the receiving player. Without a %cn reset all subsequent output in
  the same session — from other commands, prompts, and system messages — will
  inherit the color. This creates visual pollution and accessibility issues.

How to fix:
  // Bad
  u.send("%chHello%cr world");

  // Good
  u.send("%chHello%cr world%cn");

Note: This check operates per-line and may produce false positives for color
  codes split across a multi-line template literal. Suppress with
  // ursamu-ignore check-07 on the specific line if the reset is on another line.`,
  },

  "check-08": {
    title: "Correct op string",
    level: "error",
    text: `\
db.modify() was called with an op string not in the approved set.

Why it matters:
  The UrsaMU SDK only supports "$set", "$inc", and "$unset" as safe, atomic
  operations. Any other MongoDB operator may work at the DB driver level but is
  not covered by the SDK's consistency guarantees and may cause unexpected
  document states across concurrent updates.

Allowed ops:
  "$set"   — set specific fields to given values
  "$inc"   — atomically increment a numeric field
  "$unset" — remove a field from the document

See also: check-03 catches a subset of known-bad operators ($push, $pull, etc.).
  check-08 is the exhaustive whitelist complement.`,
  },

  "check-09": {
    title: "Import path correctness",
    level: "warn",
    text: `\
Import uses "@ursamu/ursamu" without the "jsr:" prefix.

Why it matters:
  UrsaMU plugins run in Deno. Deno resolves bare npm-style specifiers only when
  a package.json or import map explicitly maps them; without that mapping Deno
  throws "Module not found". The correct specifier for the SDK is
  "jsr:@ursamu/ursamu".

How to fix:
  // Bad
  import { addCmd } from "@ursamu/ursamu";

  // Good
  import { addCmd } from "jsr:@ursamu/ursamu";

Auto-fixable: ursamu-audit --fix will apply this change automatically.`,
  },

  "check-10": {
    title: "Help text on every addCmd",
    level: "error/warn",
    text: `\
addCmd() is missing a help: field, or the help: field is missing an Examples section.

Why it matters:
  Players rely on the +help system to discover command syntax without reading
  source code. A missing help: field means the command is invisible in the help
  index. Missing Examples makes the help entry less useful than it should be.

Required help: structure:
  help: \`+command[/switch] <arg>  — One-line description.

Switches:
  /switch   Description of each switch.

Examples:
  +command foo       Does the thing.
  +command/switch bar  Does the other thing.\`,

Note: The error level fires when help: is completely absent. The warn level fires
  when help: exists but Examples is missing.`,
  },

  "check-11": {
    title: "Plugin phase discipline",
    level: "error",
    text: `\
addCmd() was called inside init().

Why it matters:
  addCmd() is a module-load side effect — it registers the command globally when
  the module is first imported. Calling it inside init() means the command is
  registered every time the plugin is re-initialized, which creates duplicate
  handlers and may cause double-execution bugs.

How to fix:
  Move all addCmd() calls to commands.ts at the top level (outside any function).
  Then import "./commands.ts" from index.ts so registration happens once on load.

  // Bad — in index.ts init()
  init: () => {
    addCmd({ name: "+foo", exec: ... });
    return true;
  }

  // Good — in commands.ts (top level)
  addCmd({ name: "+foo", exec: ... });`,
  },

  "check-12": {
    title: "gameHooks pairing",
    level: "error",
    text: `\
gameHooks.on() in init() has no matching gameHooks.off() in remove().

Why it matters:
  If the plugin is hot-reloaded or removed, the old handler remains registered.
  On the next load a second copy is added, causing double-execution. After enough
  reloads the event fires dozens of times per trigger.

How to fix:
  // in index.ts — use a named function reference, not an inline arrow
  const onLogin = ({ actorId }: SessionEvent) => { /* ... */ };

  init: () => {
    gameHooks.on("player:login", onLogin);
    return true;
  },

  remove: () => {
    gameHooks.off("player:login", onLogin);  // exact same reference
  }

Important: off() must be called with the SAME function reference as on(). An
  inline arrow in off() creates a new reference that does not match.`,
  },

  "check-13": {
    title: "DBO namespace prefix",
    level: "error",
    text: `\
new DBO() was called with an un-namespaced collection name.

Why it matters:
  All plugins share the same MongoDB database. Un-namespaced collection names
  (e.g. "records") collide across plugins. A later-loaded plugin with the same
  collection name will read and write to the same documents.

How to fix:
  // Bad
  const db = new DBO("records");

  // Good
  const db = new DBO("myplugin.records");  // <pluginName>.<collectionName>`,
  },

  "check-14": {
    title: "REST auth guard",
    level: "error",
    text: `\
registerPluginRoute() handler does not check if (!userId) at the start.

Why it matters:
  REST routes are publicly reachable. If userId is null the request is
  unauthenticated. Without an explicit check the handler executes with no
  identity, which allows unauthenticated reads and writes.

How to fix:
  export async function routeHandler(req: Request, userId: string | null) {
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    // authenticated logic here
  }`,
  },

  "check-15": {
    title: "init() returns true",
    level: "error",
    text: `\
init() does not return true.

Why it matters:
  The UrsaMU plugin loader checks the return value of init(). A falsy return is
  treated as a load failure — the plugin is marked as errored and may be skipped
  on subsequent loads. For async init functions, return Promise<true>.

How to fix:
  init: async () => {
    // ... setup work ...
    return true;  // required
  }

Auto-fixable: ursamu-audit --fix will insert return true; before the closing
  brace of init() automatically.`,
  },
};

/**
 * Return a formatted explanation string for a check ID, or null if unknown.
 *
 * @param {string} checkId  e.g. "check-01"
 * @returns {string | null}
 */
export function explain(checkId) {
  const entry = EXPLANATIONS[checkId];
  if (!entry) return null;

  const line = "─".repeat(60);
  return [
    `${checkId}  —  ${entry.title}  [${entry.level}]`,
    line,
    "",
    entry.text,
    "",
  ].join("\n");
}
