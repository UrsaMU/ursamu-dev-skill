import "./commands.ts";
import { gameHooks } from "jsr:@ursamu/ursamu";
import type { IPlugin, SessionEvent } from "jsr:@ursamu/ursamu";

const onLogin = ({ actorId, actorName }: SessionEvent) => {
  console.log(`[notes] ${actorName} connected`);
};

export const plugin: IPlugin = {
  name: "notes",
  version: "1.0.0",
  description: "Note-taking plugin.",
  init: () => {
    gameHooks.on("player:login", onLogin);
    return true;
  },
  remove: () => {
    gameHooks.off("player:login", onLogin);
  },
};
