// Alle logica van de lootjes-app. De opslag ("store") wordt van buitenaf
// meegegeven, zodat dit zowel op Netlify (Netlify Blobs) als lokaal
// (geheugen) werkt.

export const NAMES = [
  "Jan", "Saskia", "Benthe", "Norah", "Nila",
  "Bas", "Melle", "Mirjam", "Marieke", "Jitse",
];

const MAX_WISHES = 30;
const MAX_DESC = 200;
const MAX_LINK = 500;

// Fisher–Yates shuffle met crypto-random
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Maakt een verdeling waarin niemand zichzelf heeft.
// We schudden de namen en laten iedereen de volgende in de kring trekken:
// zo ontstaat één grote kring en kan niemand zichzelf trekken.
export function makeAssignments(names = NAMES) {
  const order = shuffle(names);
  const out = {};
  order.forEach((giver, i) => {
    out[giver] = order[(i + 1) % order.length];
  });
  return out;
}

async function getAssignments(store) {
  let a = await store.get("assignments", { type: "json" });
  if (a) return a;
  // Eerste bezoek ooit: maak de verdeling. onlyIfNew voorkomt dat twee
  // gelijktijdige bezoekers elk een andere verdeling wegschrijven.
  await store.setJSON("assignments", makeAssignments(), { onlyIfNew: true });
  return await store.get("assignments", { type: "json" });
}

async function getWishes(store, name) {
  return (await store.get("wishes/" + name, { type: "json" })) || [];
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function cleanName(n) {
  return NAMES.find((x) => x.toLowerCase() === String(n || "").trim().toLowerCase()) || null;
}

function cleanLink(l) {
  l = String(l || "").trim().slice(0, MAX_LINK);
  if (!l) return "";
  if (!/^https?:\/\//i.test(l)) l = "https://" + l;
  try {
    const u = new URL(l);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}

export async function handle(req, store, env = {}) {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  let body = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }

  // GET /api/state?me=Naam
  if (route === "state" && req.method === "GET") {
    const me = cleanName(url.searchParams.get("me"));
    const assignments = await getAssignments(store);
    const drawnList = [];
    const wishes = {};
    await Promise.all(NAMES.map(async (n) => {
      const d = await store.get("drawn/" + n);
      if (d) drawnList.push(n);
      wishes[n] = await getWishes(store, n);
    }));
    const iDrew = me ? drawnList.includes(me) : false;
    return json({
      names: NAMES,
      me,
      drawn: NAMES.filter((n) => drawnList.includes(n)),
      iDrew,
      target: me && iDrew ? assignments[me] : null,
      wishes,
    });
  }

  // POST /api/draw {me}
  if (route === "draw" && req.method === "POST") {
    const me = cleanName(body.me);
    if (!me) return json({ error: "Onbekende naam" }, 400);
    const assignments = await getAssignments(store);
    await store.set("drawn/" + me, new Date().toISOString());
    return json({ target: assignments[me] });
  }

  // POST /api/wish {me, d, l}
  if (route === "wish" && req.method === "POST") {
    const me = cleanName(body.me);
    if (!me) return json({ error: "Onbekende naam" }, 400);
    const d = String(body.d || "").trim().slice(0, MAX_DESC);
    if (!d) return json({ error: "Beschrijving ontbreekt" }, 400);
    const list = await getWishes(store, me);
    if (list.length >= MAX_WISHES) return json({ error: "Je lijstje is vol" }, 400);
    list.push({ id: crypto.randomUUID(), d, l: cleanLink(body.l) });
    await store.setJSON("wishes/" + me, list);
    return json({ wishes: list });
  }

  // POST /api/wish/delete {me, id}
  if (route === "wish/delete" && req.method === "POST") {
    const me = cleanName(body.me);
    if (!me) return json({ error: "Onbekende naam" }, 400);
    const list = (await getWishes(store, me)).filter((w) => w.id !== body.id);
    await store.setJSON("wishes/" + me, list);
    return json({ wishes: list });
  }

  // POST /api/reset  (header x-admin-key moet gelijk zijn aan ADMIN_KEY)
  // body {wishes: true} wist ook alle verlanglijstjes.
  if (route === "reset" && req.method === "POST") {
    if (!env.ADMIN_KEY || req.headers.get("x-admin-key") !== env.ADMIN_KEY) {
      return json({ error: "Niet toegestaan" }, 403);
    }
    await store.delete("assignments");
    await Promise.all(NAMES.map((n) => store.delete("drawn/" + n)));
    if (body.wishes) await Promise.all(NAMES.map((n) => store.delete("wishes/" + n)));
    return json({ ok: true });
  }

  return json({ error: "Niet gevonden" }, 404);
}
