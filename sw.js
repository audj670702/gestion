// SCaD Gestión · Service worker · v0.5.5
// Páginas: red primero (siempre la versión nueva). Archivos estáticos (logotipos, CSS, JS, video):
// caché primero y se actualizan en segundo plano. Las llamadas al backend no pasan por aquí.
const CACHE_NAME = "gestion-v0.7.5";
const APP_SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const ESTATICO = /\.(png|jpe?g|webp|svg|ico|mp4|css|js|json)$/i;
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (ESTATICO.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async c => {
        const hit = await c.match(e.request);
        const red = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
        return hit || red;
      })
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(r => { const copia = r.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});
