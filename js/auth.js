// SCaD Gestión · Sesión SYS · v0.1.0
// Mismo esquema que NEXUS: sys-autenticacion entrega el token firmado en
// el fragmento (#t=...). El token se guarda en el teléfono y se renueva en
// silencio hasta 30 días después del inicio de sesión.

export const API_BASE = "https://www.scad.mx/_functions";
const SYS_AUTH_URL = "https://www.scad.mx/sys-autenticacion";
const APP = "GESTION";
const TOKEN_KEY = "gestion.sys.token";
const REDIRECT_KEY = "gestion.sys.authRedirectAt";
const REDIRECT_COOLDOWN_MS = 2 * 60 * 1000;
const REFRESH_BEFORE_SEC = 2 * 60 * 60;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (_) { /* sin almacenamiento */ } },
  remove(k) { try { localStorage.removeItem(k); } catch (_) { /* sin almacenamiento */ } }
};

function tokenExp(token) {
  try {
    const p = String(token || "").split(".")[1] || "";
    return Number(JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/"))).exp) || 0;
  } catch (_) { return 0; }
}
function rawToken() { return String(store.get(TOKEN_KEY) || ""); }

export function captureTokenFromHash() {
  const m = /(?:^#|&)t=([^&]+)/.exec(String(window.location.hash || ""));
  if (!m) return false;
  store.set(TOKEN_KEY, decodeURIComponent(m[1]));
  try { sessionStorage.removeItem(REDIRECT_KEY); } catch (_) { /* nada */ }
  const url = new URL(window.location.href);
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
  return true;
}

export function hasToken() { return !!rawToken(); }

export function authToken() {
  const t = rawToken();
  const exp = tokenExp(t);
  return t && (!exp || Date.now() / 1000 < exp) ? t : "";
}

let refreshing = null;
export function refreshToken({ force = false } = {}) {
  const t = rawToken();
  if (!t) return Promise.resolve(false);
  const exp = tokenExp(t), now = Date.now() / 1000;
  if (!force && exp && exp - now > REFRESH_BEFORE_SEC) return Promise.resolve(true);
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const r = await fetch(`${API_BASE}/gestionTokenRefresh`, {
        method: "POST", mode: "cors", cache: "no-store", credentials: "omit",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: "{}"
      });
      if (r.status === 401) { store.remove(TOKEN_KEY); return false; }
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok && d.token) { store.set(TOKEN_KEY, String(d.token)); return true; }
      return !!authToken();
    } catch (_) {
      return !!authToken(); // sin red: se sigue con el token actual
    } finally { refreshing = null; }
  })();
  return refreshing;
}

document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") refreshToken(); });

export function startLogin() {
  let last = 0;
  try { last = Number(sessionStorage.getItem(REDIRECT_KEY) || 0); } catch (_) { /* nada */ }
  if (last && Date.now() - last < REDIRECT_COOLDOWN_MS) return false;
  try { sessionStorage.setItem(REDIRECT_KEY, String(Date.now())); } catch (_) { /* nada */ }
  const back = new URL(window.location.href);
  back.hash = "";
  const u = new URL(SYS_AUTH_URL);
  u.searchParams.set("app", APP);
  u.searchParams.set("returnUrl", back.toString());
  window.location.assign(u.toString());
  return true;
}

export function logout() {
  store.remove(TOKEN_KEY);
  const u = new URL(SYS_AUTH_URL);
  u.searchParams.set("app", APP);
  u.searchParams.set("returnUrl", window.location.origin + window.location.pathname);
  u.searchParams.set("logout", "1");
  window.location.assign(u.toString());
}

export function forgetSession() { store.remove(TOKEN_KEY); }
