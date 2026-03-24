import type { IPlugin } from "jsr:@ursamu/ursamu";

export const plugin: IPlugin = {
  name: "noreturn",
  version: "1.0.0",
  description: "Missing return true.",
  // VIOLATION: init() does not return true
  init: () => {
    // forgot return true
  },
  remove: () => {},
};
