// Alleen om lokaal te testen: `npm run local` en open http://localhost:8888
// Gebruikt een opslag in het geheugen in plaats van Netlify Blobs.
import http from "node:http";
import { readFile } from "node:fs/promises";
import { handle } from "./netlify/lib/lootjes.mjs";

const mem = new Map();
const store = {
  async get(k, o = {}) { const v = mem.get(k); if (v === undefined) return null; return o.type === "json" ? JSON.parse(v) : v; },
  async set(k, v, o = {}) { if (o.onlyIfNew && mem.has(k)) return { modified: false }; mem.set(k, String(v)); return { modified: true }; },
  async setJSON(k, v, o = {}) { return this.set(k, JSON.stringify(v), o); },
  async delete(k) { mem.delete(k); },
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = new Request(url, { method: req.method, headers: req.headers, body: req.method === "POST" ? Buffer.concat(chunks) : undefined });
    const out = await handle(r, store, { ADMIN_KEY: process.env.ADMIN_KEY || "test" });
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(await out.text());
    return;
  }
  try {
    const html = await readFile(new URL("./public/index.html", import.meta.url));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
  } catch { res.writeHead(404); res.end(); }
}).listen(process.env.PORT || 8888, () => console.log("http://localhost:" + (process.env.PORT || 8888)));
