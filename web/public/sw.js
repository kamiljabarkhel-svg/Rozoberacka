// Service worker Rozoberačky: umožňuje pridať web na plochu ako aplikáciu.
// Nič neukladá do zariadenia (žiadna vyrovnávacia pamäť). Bez internetu ukáže krátke hlásenie.
const OFFLINE = `<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bez pripojenia – Rozoberačka</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:0;display:grid;place-items:center;min-height:100vh;background:#f3f6f7;color:#0d1b22}
main{max-width:420px;padding:24px;text-align:center}button{margin-top:12px;padding:10px 18px;border:0;border-radius:3px;background:#ffb400;font-weight:700;cursor:pointer}</style></head>
<body><main><h1>Ste bez internetu</h1><p>Rozoberačka potrebuje pripojenie, aby ukázala aktuálne diely a telefóny predajcov.</p>
<button onclick="location.reload()">Skúsiť znova</button></main></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (e) => {
  if (e.request.mode !== "navigate") return; // obrázky, údaje a skripty idú normálne cez sieť
  e.respondWith(fetch(e.request).catch(() => new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } })));
});
