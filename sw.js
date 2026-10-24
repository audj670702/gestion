// SCaD Gestión · Service worker · v0.5.2
// Red primero para la app; las llamadas al backend nunca se guardan.
const CACHE_NAME = "gestion-v0.5.2";
const APP_SHELL = ["./", "./index.html", "./css/gestion.css?v=0.5.2", "./js/app.js?v=0.5.2", "./js/inicio.js", "./js/auth.js", "./js/api.js", "./js/programacion.js", "./manifest.json", "./assets/icon-192.png", "./assets/branding/scad-gestion-compacto.png", "./assets/branding/scad-gestion-completo.png", "./assets/branding/scad-gestion-icono.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: "no-store" })
      .then(r => { const copy = r.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
