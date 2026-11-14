// Swipo — service worker de l'espace agent.
// Garde sur le téléphone les pages des missions et les fichiers de l'application, pour que l'agent
// puisse ouvrir ses missions et continuer à travailler sans réseau (sous-sol, cave, mode avion).
// Les gestes faits hors connexion sont gardés à part (IndexedDB) et envoyés au retour du réseau.

const VERSION = "swipo-v3";
const STATIC = `${VERSION}-fichiers`;
const PAGES = `${VERSION}-missions`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (!key.startsWith(VERSION)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Pages de l'agent gardées : la liste du jour, chaque mission et son écran de signalement.
function isAgentPage(url) {
  return url.pathname === "/agent" || /^\/agent\/mission\/[0-9a-f-]{36}(\/signaler)?$/.test(url.pathname);
}

function isStatic(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname === "/icon.svg";
}

// Fichiers de code et de style dont la page a besoin (y compris ceux chargés à la demande) :
// on les garde aussi, sinon la page s'afficherait sans pouvoir fonctionner.
async function keepAssets(html) {
  const found = new Set();
  // Les noms peuvent contenir des parenthèses et des crochets : « app/(agent)/…/[id]/page-….js ».
  const norm = (u) => u.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
  for (const m of html.matchAll(/\/_next\/static\/[^"'\s\\]+?\.(?:js|css|woff2)/g)) found.add(norm(m[0]));
  for (const m of html.matchAll(/static\/(?:chunks|css)\/[^"'\s\\]+?\.(?:js|css)/g)) found.add(norm("/_next/" + m[0]));
  const cache = await caches.open(STATIC);
  await Promise.all(
    [...found].map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const r = await fetch(u);
        if (r.ok) await cache.put(u, r);
      } catch {}
    }),
  );
}

const OFFLINE_PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hors connexion · Swipo</title>
<style>body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;font:16px/1.5 system-ui,sans-serif;background:#f7f8fa;color:#12202b;text-align:center;padding:24px}
@media (prefers-color-scheme:dark){body{background:#0f171e;color:#e8f0f6}}a{display:inline-block;margin-top:16px;padding:14px 22px;border-radius:12px;background:#1663a6;color:#fff;text-decoration:none;font-weight:600}</style></head>
<body><div><h1 style="font-size:24px;margin:0 0 8px">Pas de réseau</h1><p>Cette page n'a pas encore été ouverte sur ce téléphone.<br>Vos missions du jour restent disponibles.</p><a href="/agent">Mes chantiers</a></div></body></html>`;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Fichiers de l'application (leur nom change à chaque version) : d'abord le téléphone.
  if (isStatic(url)) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Pages de l'agent (HTML complet, pas les données de navigation interne) : d'abord le réseau,
  // le téléphone en secours.
  const isRsc = req.headers.get("RSC") === "1" || url.searchParams.has("_rsc");
  if (isAgentPage(url) && !isRsc) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        const key = url.origin + url.pathname;
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && (res.headers.get("content-type") || "").includes("text/html")) {
            await cache.put(key, res.clone());
            // Ouverture d'une page : on ne la fait pas attendre. Préparation hors connexion : on attend.
            const assets = res.clone().text().then(keepAssets);
            if (req.mode === "navigate") event.waitUntil(assets);
            else await assets;
          }
          return res;
        } catch {
          const hit = await cache.match(key);
          if (hit) return hit;
          if (req.mode === "navigate") {
            const list = await cache.match(url.origin + "/agent");
            return list ?? new Response(OFFLINE_PAGE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
          }
          return Response.error();
        }
      })(),
    );
  }
});

// À la déconnexion, on efface les pages gardées (elles contiennent les missions).
self.addEventListener("message", (event) => {
  if (event.data === "effacer") event.waitUntil(caches.delete(PAGES));
});
