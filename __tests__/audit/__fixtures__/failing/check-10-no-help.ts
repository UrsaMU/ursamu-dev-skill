import { addCmd } from "jsr:@ursamu/ursamu";

// VIOLATION: addCmd with no help: field
addCmd({
  name: "+nohelp",
  pattern: /^\+nohelp\s*(.*)/i,
  lock: "connected",
  category: "Test",
  exec: async (u) => {
    u.send("no help here");
  },
});
