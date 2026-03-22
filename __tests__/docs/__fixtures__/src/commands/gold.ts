import { addCmd } from "jsr:@ursamu/ursamu";
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

addCmd({
  name: "+gold",
  pattern: /^\+gold\s+(.*)/i,
  lock: "connected admin+",
  category: "Economy",
  help: `+gold <target>=<amount>  — Give gold to a player.`,
  exec: async (u: IUrsamuSDK) => {
    const arg = u.util.stripSubs(u.cmd.args[0] ?? "").trim();
    const [targetName, amountStr] = arg.split("=").map(s => s.trim());
    const amount = parseInt(amountStr, 10);
    if (!targetName || isNaN(amount) || amount <= 0) {
      u.send("Usage: +gold <target>=<amount>");
      return;
    }
    const target = await u.util.target(u.me, targetName, true);
    if (!target) { u.send("Target not found."); return; }
    await u.db.modify(target.id, "$inc", { "data.gold": amount });
    u.send(`You give ${amount} gold to ${u.util.displayName(target, u.me)}.`);
  },
});
