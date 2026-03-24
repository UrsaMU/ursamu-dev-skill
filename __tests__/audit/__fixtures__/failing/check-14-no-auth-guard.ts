import { registerPluginRoute } from "jsr:@ursamu/ursamu";

// VIOLATION: route handler does not check if (!userId) before logic
registerPluginRoute("/api/v1/badroute", async (req, userId) => {
  const url = new URL(req.url);
  return Response.json({ ok: true, userId });
});
