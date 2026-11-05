// Documentos privados: visor y descarga por bloques, sin credenciales de Drive en el navegador.
import { archivoInfo, archivoBloque } from './api.js?v=0.10.3';
const sesiones = new Map();
const DURACION = 2 * 60 * 60 * 1000;
export function admiteVista(mime = '') {
  return /^(application\/pdf|image\/(jpeg|png|gif|webp|avif|bmp)|video\/(mp4|webm|ogg|quicktime)|audio\/(mpeg|mp4|ogg|wav|webm|x-wav))$/i.test(mime);
}
// Sólo el worker que controla esta app puede pedir bloques de sesiones creadas por esta página.
navigator.serviceWorker?.addEventListener('message', async e => {
  if (e.source !== navigator.serviceWorker.controller || e.data?.type !== 'GESTION_BLOQUE') return;
  const puerto = e.ports?.[0], s = sesiones.get(e.data.id);
  if (!puerto) return;
  try {
    if (!s || s.hasta < Date.now()) throw new Error('La consulta terminó. Vuelve a abrir el documento.');
    const { inicio, longitud } = e.data;
    if (!Number.isSafeInteger(inicio) || inicio < 0 || inicio >= s.info.tamano || !Number.isSafeInteger(longitud) || longitud < 1 || longitud > s.info.bloqueBytes) throw new Error('Tramo inválido.');
    const bytes = await archivoBloque(s.archivoId, s.vista, s.info.revision, inicio, longitud);
    puerto.postMessage({ ok: true, bytes }, [bytes]);
  } catch (error) { puerto.postMessage({ ok: false, mensaje: error.message }); }
});
export async function prepararDocumento(archivoId, vista, accion) {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
    throw new Error('Actualiza la app y vuelve a intentar para habilitar la consulta de documentos.');
  }
  const info = await archivoInfo(archivoId, vista);
  if (accion === 'visualizar' && !admiteVista(info.mimeType)) return { sinVista: true, nombre: info.nombre };
  const id = crypto.randomUUID();
  for (const [k, s] of sesiones) if (s.hasta < Date.now()) sesiones.delete(k);
  const hasta = Date.now() + DURACION;
  sesiones.set(id, { archivoId, vista, info, hasta });
  const canal = new MessageChannel();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { canal.port1.close(); reject(new Error('No se pudo preparar el documento. Actualiza la app.')); }, 5000);
    canal.port1.onmessage = e => {
      clearTimeout(timer); canal.port1.close();
      e.data?.ok ? resolve() : reject(new Error('No se pudo preparar el documento.'));
    };
    navigator.serviceWorker.controller.postMessage({ type: 'GESTION_DOCUMENTO', id, info, accion, hasta }, [canal.port2]);
  });
  return { tamano: info.tamano, url: new URL(`./__documento/${id}`, location.href.split('#')[0]).href, nombre: info.nombre };
}
