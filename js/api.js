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

export async function archivo(archivoId) {
  const r = await solicitar("gestionArchivo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ archivoId })
  });
  if (!r.ok) await comoJson(r);
  const nombre = decodeURIComponent(r.headers.get("X-Archivo-Nombre") || "documento");
  return { blob: await r.blob(), nombre };
}

// Sube el archivo directo al Drive de la EO (la sesión la abre el backend).
export function subirADrive(uploadUrl, file, alAvanzar) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", uploadUrl);
    x.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    x.upload.onprogress = e => { if (e.lengthComputable && alAvanzar) alAvanzar(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      if (x.status >= 200 && x.status < 300) {
        try { resolve(JSON.parse(x.responseText)); } catch (_) { reject(new ApiError("Google Drive respondió algo inesperado.")); }
      } else reject(new ApiError(`Google Drive rechazó la carga (${x.status}).`));
    };
    x.onerror = () => reject(new ApiError("Se interrumpió la carga. Revisa tu conexión e intenta de nuevo."));
    x.send(file);
  });
}
