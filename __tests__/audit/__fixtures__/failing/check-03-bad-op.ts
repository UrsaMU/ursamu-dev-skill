import { addCmd } from "jsr:@ursamu/ursamu";

addCmd({
  name: "+badop",
  pattern: /^\+badop\s*(.*)/i,
  lock: "connected",
  category: "Test",
  help: `+badop <x>  — Bad op test.

Examples:
  +badop foo  Does thing.
  +badop bar  Does other thing.`,
  exec: async (u) => {
    const arg = u.cmd.args[0] ?? "";
    // VIOLATION: $push is not a valid op
    await u.db.modify(u.me.id, "$push", { "data.items": arg });
  },
});
