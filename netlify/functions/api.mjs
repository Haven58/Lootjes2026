import { getStore } from "@netlify/blobs";
import { handle } from "../lib/lootjes.mjs";

export default async (req) => {
  const store = getStore({ name: "lootjes-2026", consistency: "strong" });
  return handle(req, store, { ADMIN_KEY: Netlify.env.get("ADMIN_KEY") });
};

export const config = { path: "/api/*" };
