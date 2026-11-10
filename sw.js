// SCaD Gestión · Service worker · v0.13.24
// Páginas: red primero (siempre la versión nueva). Archivos estáticos (logotipos, CSS, JS, video):
// caché primero y se actualizan en segundo plano. Las llamadas al backend no pasan por aquí.
const CACHE_NAME = "gestion-v0.13.24";
const APP_SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rutas privadas transitorias. Nunca se guardan documentos ni permisos en Cache Storage.
const DOCUMENTOS = new Map();
self.addEventListener('message', e => {
  const d = e.data;
  if (d?.type !== 'GESTION_DOCUMENTO' || !e.source?.id) return;
  const nombre = String(d.info?.nombre || 'documento').replace(/[\r\n]/g, '');
  if (!/^[a-f0-9-]{36}$/i.test(d.id) || !Number.isSafeInteger(d.info?.tamano) || d.info.tamano < 1 || !['visualizar','descargar'].includes(d.accion)) return;
  for (const [id, s] of DOCUMENTOS) if (s.hasta < Date.now()) DOCUMENTOS.delete(id);
  DOCUMENTOS.set(d.id, { ...d, info: { ...d.info, nombre }, cliente: e.source.id });
  e.ports[0]?.postMessage({ ok: true });
});
function tramoHttp(cabecera, total) {
  if (!cabecera) return { inicio: 0, fin: total - 1, parcial: false };
  const m = /^bytes=(\d*)-(\d*)$/.exec(cabecera);
  if (!m || (!m[1] && !m[2])) return null;
  let inicio = m[1] ? Number(m[1]) : Math.max(0, total - Number(m[2]));
  let fin = m[1] ? (m[2] ? Math.min(Number(m[2]), total - 1) : total - 1) : total - 1;
  return Number.isSafeInteger(inicio) && Number.isSafeInteger(fin) && inicio <= fin && inicio < total ? { inicio, fin, parcial: true } : null;
}
async function pedirBloque(s, inicio, longitud) {
  const cliente = await self.clients.get(s.cliente);
  if (!cliente) throw new Error('Mantén GESTIÓN abierta y vuelve a intentar.');
  return new Promise((resolve, reject) => {
    const canal = new MessageChannel();
    const timer = setTimeout(() => { canal.port1.close(); reject(new Error('Se interrumpió la transferencia.')); }, 55000);
    canal.port1.onmessage = e => {
      clearTimeout(timer); canal.port1.close();
      if (!e.data?.ok) { reject(new Error(e.data?.mensaje || 'No se pudo leer el documento.')); return; }
      resolve(new Uint8Array(e.data.bytes));
    };
    cliente.postMessage({ type: 'GESTION_BLOQUE', id: s.id, inicio, longitud }, [canal.port2]);
  });
}
async function servirDocumento(request, id) {
  const s = DOCUMENTOS.get(id);
  if (!s || s.hasta < Date.now()) return new Response('Vuelve a abrir el documento desde GESTIÓN.', { status: 410, headers: { 'Cache-Control': 'no-store' } });
  const total = s.info.tamano, tramo = tramoHttp(request.headers.get('Range'), total);
  if (!tramo) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${total}`, 'Cache-Control': 'no-store' } });
  let siguiente = tramo.inicio, cancelado = false;
  // Se valida el primer bloque antes de anunciar una respuesta exitosa.
  let primero;
  try { primero = await pedirBloque(s, siguiente, Math.min(s.info.bloqueBytes, tramo.fin - siguiente + 1)); }
  catch (error) { return new Response(error.message, { status: 502, headers: { 'Cache-Control': 'no-store' } }); }
  const cuerpo = new ReadableStream({
    async pull(control) {
      try {
        if (cancelado) return;
        const bytes = primero || await pedirBloque(s, siguiente, Math.min(s.info.bloqueBytes, tramo.fin - siguiente + 1));
        primero = null;
        const esperados = Math.min(s.info.bloqueBytes, tramo.fin - siguiente + 1);
        if (bytes.byteLength !== esperados) throw new Error('Transferencia incompleta.');
        if (cancelado) return;
        control.enqueue(bytes); siguiente += bytes.byteLength;
        if (siguiente > tramo.fin) control.close();
      } catch (error) { if (!cancelado) control.error(error); }
    },
    cancel() { cancelado = true; }
  });
  const seguro = /^(application\/pdf|image\/(jpeg|png|gif|webp|avif|bmp)|video\/(mp4|webm|ogg|quicktime)|audio\/(mpeg|mp4|ogg|wav|webm|x-wav))$/i.test(s.info.mimeType);
  const inline = s.accion === 'visualizar' && seguro;
  const headers = {
    'Content-Type': inline ? s.info.mimeType : 'application/octet-stream',
    'Content-Length': String(tramo.fin - tramo.inicio + 1), 'Accept-Ranges': 'bytes',
    'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(s.info.nombre)}`,
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'self'"
  };
  if (tramo.parcial) headers['Content-Range'] = `bytes ${tramo.inicio}-${tramo.fin}/${total}`;
  return new Response(cuerpo, { status: tramo.parcial ? 206 : 200, headers });
}

const ESTATICO = /\.(png|jpe?g|webp|svg|ico|mp4|css|js|json)$/i;
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const documento = /^\/__documento\/([a-f0-9-]{36})$/i.exec(url.pathname);
  if (documento) { e.respondWith(servirDocumento(e.request, documento[1])); return; }
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

