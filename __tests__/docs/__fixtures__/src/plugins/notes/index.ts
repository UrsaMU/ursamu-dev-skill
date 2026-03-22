import type { IPlugin } from "jsr:@ursamu/ursamu";
import { notesCommands } from "./commands.ts";

const notes: IPlugin = {
  name: "notes",
  commands: notesCommands,
};

export default notes;
