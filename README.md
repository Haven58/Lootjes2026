# Sinterklaas lootjes 2026

Een kleine webapp voor de familie-lootjes. Je kiest je naam, trekt je lootje en vult je verlanglijstje in. Je hoeft niet in te loggen.

## Wat zit erin

- `public/index.html`: de hele website (stijl "Daken bij nacht"). Bovenaan het script staan de gegevens van pakjesavond (`EVENT`), die kun je daar aanpassen.
- `netlify/lib/lootjes.mjs`: de logica: namenlijst (`NAMES`), de trekking en de verlanglijstjes.
- `netlify/functions/api.mjs`: koppelt de logica aan de opslag van Netlify (Netlify Blobs).
- `dev-server.mjs`: alleen om lokaal te testen (`npm install` en daarna `npm run local`).

## Hoe de trekking werkt

Bij het allereerste bezoek maakt de app één verdeling: de namen worden geschud en iedereen trekt de volgende in die kring. Zo kan niemand zichzelf trekken. Wie op "Open je lootje" tikt, krijgt zijn lootje te zien en staat daarna in het overzicht als "getrokken".

## Online zetten (eenmalig)

1. Zet deze map in een nieuwe GitHub-repository.
2. Ga naar app.netlify.com, kies **Sign up with GitHub**, dan **Add new project → Import an existing project → GitHub** en kies de repository. De instellingen staan al in `netlify.toml`, dus je klikt alleen op **Deploy**.
3. Geef het project bij **Project configuration** een mooie naam, bijvoorbeeld `lootjes-2026`. Je link wordt dan `https://lootjes-2026.netlify.app`.

## Opnieuw beginnen (reset)

**Makkelijkste manier:** verander in `netlify/functions/api.mjs` de naam `lootjes-2026` naar bijvoorbeeld `lootjes-2026-v2` en sla op. Netlify zet het automatisch opnieuw online, met een lege opslag: een nieuwe trekking en lege lijstjes.

**Alleen de trekking opnieuw, lijstjes houden:** zet in Netlify bij **Environment variables** `ADMIN_KEY` op een geheim woord en deploy opnieuw. Daarna:

```
curl -X POST https://lootjes-2026.netlify.app/api/reset -H "x-admin-key: JOUW-GEHEIME-WOORD"
```

(met `-d '{"wishes":true}'` erbij worden ook de verlanglijstjes gewist)
