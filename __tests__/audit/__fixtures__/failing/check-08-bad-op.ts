import { addCmd } from "jsr:@ursamu/ursamu";
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

// Fails check-08: db.modify uses $sort which is not in the approved whitelist.
// ($sort is not in check-03's explicit blacklist, so only check-08 fires.)
addCmd({
  name: "+sort",
  pattern: /^\+sort\s+(.+)/i,
  lock: "connected",
  category: "Test",
  help: `+sort <list>  — Sort a list (test).

Examples:
  +sort items   Sorts the list.
  +sort tags    Sorts the tags.`,
  exec: async (u: IUrsamuSDK) => {
    await u.db.modify(u.me.id, "$sort", { "data.items": 1 });
    u.send("Sorted.");
  },
});
