import { addCmd } from "jsr:@ursamu/ursamu";
import type { IUrsamuSDK } from "jsr:@ursamu/ursamu";

// Fails check-07: u.send() contains %ch color code without %cn reset.
addCmd({
  name: "+hello",
  pattern: /^\+hello/i,
  lock: "connected",
  category: "Test",
  help: `+hello  — Say hello.

Examples:
  +hello   Greets the room.
  +hello   Says hi.`,
  exec: async (u: IUrsamuSDK) => {
    u.send("%chHello, world!");
  },
});
