import { addCmd } from "../../services/commands/cmdParser.ts";
import type { IUrsamuSDK } from "../../@types/UrsamuSDK.ts";

export const notesCommands = [
  addCmd({
    name: "+note",
    pattern: /^\+note\s+(.*)/i,
    lock: "connected",
    category: "Notes",
    help: `+note <text>  — Save a personal note.`,
    exec: async (u: IUrsamuSDK) => {
      const text = u.util.stripSubs(u.cmd.args[0] ?? "").trim();
      if (!text) { u.send("Usage: +note <text>"); return; }
      await u.db.modify(u.me.id, "$set", { "data.note": text });
      u.send("Note saved.");
    },
  }),
];
