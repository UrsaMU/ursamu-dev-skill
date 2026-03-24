import { gameHooks } from "jsr:@ursamu/ursamu";
import type { IPlugin, SessionEvent } from "jsr:@ursamu/ursamu";

const onLogin = ({ actorName }: SessionEvent) => {
  console.log(actorName);
};

export const plugin: IPlugin = {
  name: "nopair",
  version: "1.0.0",
  description: "Missing off() violation.",
  init: () => {
    // VIOLATION: on() without matching off() in remove()
    gameHooks.on("player:login", onLogin);
    return true;
  },
  remove: () => {
    // Missing: gameHooks.off("player:login", onLogin)
  },
};
