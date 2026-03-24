import { addCmd, gameHooks } from "jsr:@ursamu/ursamu";
import type { IPlugin } from "jsr:@ursamu/ursamu";

export const plugin: IPlugin = {
  name: "bad-phase",
  version: "1.0.0",
  description: "Phase discipline violation.",
  init: () => {
    // VIOLATION: addCmd called inside init()
    addCmd({
      name: "+bad",
      pattern: /^\+bad/i,
      lock: "connected",
      category: "Test",
      help: `+bad  — Bad.

Examples:
  +bad  Does bad thing.
  +bad  Also does bad thing.`,
      exec: async (u) => { u.send("bad"); },
    });
    return true;
  },
  remove: () => {},
};
