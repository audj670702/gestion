// SCaD Gestión · Comunicación con el backend · v0.2.0
import { API_BASE, authToken, refreshToken, forgetSession } from "./auth.js";

export class ApiError extends Error {
  constructor(mensaje, code = "", status = 0) { super(mensaje); this.code = code; this.status = status; }
}

async function solicitar(ruta, opciones = {}, reintento = true) {
  await refreshToken();
  const token = authToken();
  if (!token) throw new ApiError("Tu sesión terminó. Inicia sesión de nuevo.", "AUTH_REQUIRED", 401);
  let r;
  try {
    r = await fetch(`${API_BASE}/${ruta}`, {
      mode: "cors", cache: "no-store", credentials: "omit", ...opciones,
      headers: { ...(opciones.headers || {}), Authorization: `Bearer ${token}` }
    });
  } catch (_) {
    throw new ApiError("Sin conexión con el servidor. Revisa tu red e intenta de nuevo.", "RED", 0);
  }
  if (r.status === 401) {
    if (reintento && await refreshToken({ force: true })) return solicitar(ruta, opciones, false);
    forgetSession();
    throw new ApiError("Tu sesión terminó. Inicia sesión de nuevo.", "AUTH_REQUIRED", 401);
  }
  return r;
}

async function comoJson(r) {
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d?.ok !== true) throw new ApiError(d?.mensaje || d?.error || `No fue posible completar la operación (${r.status}).`, d?.code || "", r.status);
  return d;
}

export async function contexto() {
  return comoJson(await solicitar("gestionPwaContext", { method: "GET", headers: { Accept: "application/json" } }));
}

export async function api(accion, datos = {}) {
  return comoJson(await solicitar("gestionApi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion, datos })
  }));
}

// Endpoints genéricos de SYS (p. ej. sysPwaProfile), con el mismo token.
export async function sys(ruta, cuerpo = {}) {
  return comoJson(await solicitar(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo)
  }));
}

export async function archivo(archivoId, vista = "") {
  const r = await solicitar("gestionArchivo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archivoId, vista })
  });
  if (!r.ok) await comoJson(r);
  const nombre = decodeURIComponent(r.headers.get("X-Archivo-Nombre") || "documento");
  return { blob: await r.blob(), nombre };
}

export async function archivoInfo(archivoId, vista = '') {
  return comoJson(await solicitar('gestionArchivo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivoId, vista, soloInfo: true }) }));
}
export async function archivoBloque(archivoId, vista, revision, inicio, longitud) {
  const r = await solicitar('gestionArchivo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archivoId, vista, revision, inicio, longitud }) });
  if (!r.ok) await comoJson(r);
  const bytes = await r.arrayBuffer();
  if (bytes.byteLength !== longitud || Number(r.headers.get('X-Archivo-Inicio')) !== inicio) throw new ApiError('La transferencia quedó incompleta. Intenta de nuevo.');
  return bytes;
}

// Carga directa por tramos de 8 MB; consulta a Google el avance real al reintentar.
export async function subirADrive(uploadUrl, file, alAvanzar) {
  const BLOQUE = 8 * 1024 * 1024;
  let inicio = 0, fallos = 0;
  const enviar = (body, rango, desde = 0) => new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('PUT', uploadUrl);
    x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    x.setRequestHeader('Content-Range', rango);
    x.timeout = 180000;
    x.upload.onprogress = e => { if (e.lengthComputable && alAvanzar && body) alAvanzar(Math.min(99, Math.round((desde + e.loaded) / file.size * 100))); };
    x.onload = () => resolve({ status: x.status, range: x.getResponseHeader('Range'), text: x.responseText });
    x.onerror = x.ontimeout = () => reject(new ApiError('Se interrumpió la carga. Reintenta sin cerrar esta ventana.', 'CARGA_RED'));
    x.send(body);
  });
  const evaluar = r => {
    if (r.status >= 200 && r.status < 300) {
      let meta; try { meta = JSON.parse(r.text); } catch (_) { throw new ApiError('Google respondió algo inesperado.'); }
      if (!meta.id) throw new ApiError('Google no confirmó el archivo.');
      alAvanzar?.(100); return meta;
    }
    if (r.status === 308) {
      const m = /^bytes=0-(\d+)$/.exec(r.range || '');
      const siguiente = m ? Number(m[1]) + 1 : 0;
      if (!Number.isSafeInteger(siguiente) || siguiente > file.size) throw new ApiError('Google informó un avance inválido.');
      inicio = siguiente; return null;
    }
    if (r.status >= 500 || r.status === 429) throw new ApiError('Google no respondió. Reintentando…', 'CARGA_RED');
    throw new ApiError(`Google Drive rechazó la carga (${r.status}). Inicia la carga de nuevo.`, 'CARGA_SESION');
  };
  while (inicio < file.size) {
    try {
      const fin = Math.min(inicio + BLOQUE, file.size);
      const anterior = inicio;
      const meta = evaluar(await enviar(file.slice(inicio, fin), `bytes ${inicio}-${fin - 1}/${file.size}`, inicio));
      if (meta) return meta;
      if (inicio <= anterior) throw new ApiError('Google no confirmó el avance.', 'CARGA_RED');
      fallos = 0;
    } catch (error) {
      if (error.code !== 'CARGA_RED' || ++fallos > 3) throw error;
      await new Promise(r => setTimeout(r, 1000 * 2 ** fallos));
      try { const meta = evaluar(await enviar(null, `bytes */${file.size}`)); if (meta) return meta; }
      catch (e) { if (e.code !== 'CARGA_RED') throw e; }
    }
  }
  throw new ApiError('Google no confirmó el cierre de la carga. Intenta de nuevo.');
}
