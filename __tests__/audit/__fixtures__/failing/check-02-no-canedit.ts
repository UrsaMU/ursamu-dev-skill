import { addCmd } from "jsr:@ursamu/ursamu";
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

// Fails check-02: exec() calls util.target() and db.modify but no canEdit guard.
addCmd({
  name: "+move",
  pattern: /^\+move\s+(.+)/i,
  lock: "connected",
  category: "Test",
  help: `+move <target>  — Move item (test).

Examples:
  +move box    Moves the box.
  +move chair  Moves the chair.`,
  exec: async (u: IUrsamuSDK) => {
    const target = await u.util.target(u.me, u.cmd.args[0], true);
    if (!target) { u.send("Not found."); return; }
    await u.db.modify(target.id, "$set", { "data.location": u.me.id });
    u.send("Moved.");
  },
});
