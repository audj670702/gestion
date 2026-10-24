// SCaD Gestión · App · v0.2.0
// v0.2.0: menú de cuenta normalizado (avatar + nombre a mostrar), Editar perfil (sysPwaProfile),
//         Instalar app (tutorial en video para iPhone), vistas Dirección / Operación / Instancia
//         (el ADM las alterna desde el menú), Panel de Control sólo ADM, búsqueda y filtro de proyectos.
// v0.1.1: la ficha muestra todas las instancias otorgantes con su aportación y resultado.
// Vistas por rol de la EO (sin roles nuevos): ADM → las tres · EJECUTIVO → Dirección ·
// staff → Operación · CLIENTE → Instancia. Sólo en Operación se trabaja el checklist;
// Dirección e Instancia son de consulta. Los momentos del proyecto los valida el ADM en el panel.
import { captureTokenFromHash, hasToken, startLogin, logout } from "./auth.js";
import { contexto, api, sys, archivo, subirADrive, ApiError } from "./api.js";

export const VERSION = "GESTION_APP v0.2.0";
const PANEL_URL = "https://www.scad.mx/panel-gestion";

const FASES = { PREVISION: "Previsión", INTEGRACION: "Integración del expediente", EJECUCION: "Ejecución", CERRADO: "Cerrado" };
const ESTATUS = {
  IDENTIFICADO: "Identificado", EN_GESTION: "En gestión de viabilidad", EN_INTEGRACION: "En integración",
  EXPEDIENTE_VALIDADO: "Expediente validado", EXPEDIENTE_ENTREGADO: "Expediente entregado", EN_EJECUCION: "En ejecución",
  SUSPENDIDO: "Suspendido", CONCLUIDO: "Concluido", CONCLUIDO_PARCIAL: "Concluido parcialmente", CANCELADO: "Cancelado",
  DESISTIDO: "Desistido", BENEFICIO_NO_OTORGADO: "Beneficio no otorgado", NO_VIABLE: "No viable"
};
const ESTADOS = {
  PENDIENTE: { t: "Pendiente", c: "" }, SOLICITADO: { t: "Solicitado", c: "info" }, ENTREGADO: { t: "Entregado · por revisar", c: "warn" },
  OBSERVADO: { t: "Observado", c: "bad" }, VALIDADO: { t: "Validado", c: "ok" }, NO_APLICA: { t: "No aplica", c: "mute" }
};
const ACCION = {
  SOLICITADO: { t: "Marcar solicitado", c: "" }, VALIDADO: { t: "Validar", c: "pri" }, OBSERVADO: { t: "Observar", c: "bad" },
  NO_APLICA: { t: "No aplica", c: "" }, PENDIENTE: { t: "Reactivar", c: "" }
};
const RESULTADO = { PENDIENTE: { t: "Pendiente", c: "" }, ENTREGADO: { t: "Expediente entregado", c: "info" }, OTORGADO: { t: "Otorgado", c: "ok" }, NO_OTORGADO: { t: "No otorgado", c: "bad" } };
const MEDIOS = { OFICIO: "Oficio", CORREO: "Correo electrónico", EN_MANO: "Entrega en mano", OTRO: "Otro medio" };

const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fecha = v => { if (!v) return "—"; const d = new Date(v); return isNaN(d) ? "—" : d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" }); };
const fechaHora = v => { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); };
const isoDia = v => { if (!v) return ""; const d = new Date(v); if (isNaN(d)) return ""; return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const pesos = v => (v === null || v === undefined) ? "—" : "$" + Number(v).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tamano = b => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";

const S = { ctx: null, modo: null, proyectos: [], fase: "ACTIVOS", q: "", tipo: "", det: null, tab: "checklist", filtroReq: "TODOS" };

const ins = id => (S.ctx?.instancias || []).find(i => i.id === id) || null;
const insEtq = id => { const i = ins(id); return i ? (i.siglas || i.nombre) : ""; };
const tipoDoc = k => (S.ctx?.catalogos?.tiposDocumento || []).find(x => x.clave === k)?.etiqueta || "";
const tipoPry = k => (S.ctx?.catalogos?.tiposProyecto || []).find(x => x.clave === k)?.etiqueta || "";
const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ── Vistas (modo) ────────────────────────────────────────────
const MODOS = {
  DIRECCION: { t: "Dirección", band: "MODO DIRECCIÓN", lista: "Proyectos", sub: "Cartera de proyectos de la EO." },
  OPERACION: { t: "Operación", band: "MODO OPERACIÓN", lista: "Mis proyectos", sub: "Proyectos de los que eres responsable." },
  INSTANCIA: { t: "Instancia", band: "MODO INSTANCIA", lista: "Proyectos", sub: "Proyectos en los que participa tu instancia." }
};
const usr = () => S.ctx?.usuario || {};
const rolApp = () => String(usr().modo || "").toUpperCase();
const esAdm = () => rolApp() === "ADM" || usr().admPrincipal === true;
function modosDisponibles() {
  if (esAdm()) return ["DIRECCION", "OPERACION", "INSTANCIA"];
  return { EJECUTIVO: ["DIRECCION"], OPERACION: ["OPERACION"], CLIENTE: ["INSTANCIA"] }[rolApp()] || [];
}
const claveModo = () => `gestion.modo.${usr().memberId || S.ctx?.memberId || usr().email || "u"}`;
function resolverModo() {
  const ms = modosDisponibles();
  let guardado = "";
  try { guardado = localStorage.getItem(claveModo()) || ""; } catch (_) { /* sin almacenamiento */ }
  return ms.includes(guardado) ? guardado : (ms[0] || null);
}
function pintarModo() {
  const b = $("#modeBand");
  b.hidden = !S.modo;
  if (S.modo) { b.textContent = MODOS[S.modo].band; b.dataset.tone = S.modo; document.body.dataset.modo = S.modo; }
  const ms = modosDisponibles(), box = $("#menuModos");
  box.hidden = ms.length < 2;
  box.innerHTML = ms.length < 2 ? "" : `<span class="menu-sec">VISTA</span>` + ms.map(m =>
    `<button type="button" class="menu-modo ${m === S.modo ? "on" : ""}" data-modo="${m}" data-tone="${m}"><i></i><span>${MODOS[m].t}</span>${m === S.modo ? "<b>✓</b>" : ""}</button>`).join("");
}
async function cambiarModo(m) {
  cerrarMenu();
  if (m === S.modo) return;
  S.modo = m;
  try { localStorage.setItem(claveModo(), m); } catch (_) { /* sin almacenamiento */ }
  Object.assign(S, { fase: "ACTIVOS", q: "", tipo: "", det: null });
  pintarModo();
  if (location.hash && location.hash !== "#/") history.replaceState({}, "", "#/");
  $("#view").innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  await cargarLista();
  pintarLista();
}

// ── Identidad y menú de cuenta ───────────────────────────────
const nombreMostrar = () => usr().nombreVisible || usr().nombreApp || usr().nombre || "Usuario";
const iniciales = n => String(n || "U").trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join("").toUpperCase() || "U";
function urlImagen(v) {
  if (!v) return "";
  if (typeof v === "object") return urlImagen(v.url || v.src);
  const t = String(v).trim();
  if (t.startsWith("wix:image://v1/")) { const id = t.slice(15).split("/")[0]; return id ? `https://static.wixstatic.com/media/${id}` : ""; }
  return t;
}
function pintarAvatar(el, url, nombre) {
  el.textContent = url ? "" : iniciales(nombre);
  el.style.backgroundImage = url ? `url("${url.replace(/"/g, "%22")}")` : "";
}
function pintarIdentidad() {
  const n = nombreMostrar(), foto = urlImagen(usr().avatar || usr().foto);
  $("#eoName").textContent = S.ctx.eo?.nombreMostrar || S.ctx.eo?.nombre || "";
  $("#topName").textContent = n;
  $("#menuName").textContent = n;
  $("#menuEmail").textContent = usr().email || S.ctx.email || "";
  pintarAvatar($("#topAvatar"), foto, n);
  pintarAvatar($("#menuAvatar"), foto, n);
  $("#btnPanel").hidden = !esAdm();
}
function cerrarMenu() { $("#accountMenu").hidden = true; $("#account").setAttribute("aria-expanded", "false"); }
function abrirPanel() {
  const u = new URL(PANEL_URL);
  const eo = S.ctx?.eo?.codigoEO || S.ctx?.eo?.codigo;
  if (eo) u.searchParams.set("scadEO", eo);
  window.location.assign(u.toString());
}
async function actualizar() {
  cerrarMenu();
  const c = await tarea(() => contexto());
  if (!c) return;
  S.ctx = c;
  pintarIdentidad();
  if (!modosDisponibles().includes(S.modo)) S.modo = resolverModo();
  pintarModo();
  $("#driveWarn").hidden = !!S.ctx.drive?.conectado;
  await cargarLista();
  ruta();
  aviso("Información actualizada.");
}

// ── Instalar app ─────────────────────────────────────────────
let promptInstalar = null;
const instalada = () => window.matchMedia?.("(display-mode: standalone)")?.matches === true || navigator.standalone === true;
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function pintarInstalar() { $("#installButton").hidden = instalada(); }
async function instalar() {
  if (instalada()) return;
  if (esIOS()) {
    dialogo(`<h3>Instalar app en iPhone</h3>
      <video class="tuto" controls playsinline webkit-playsinline preload="metadata" disablepictureinpicture>
        <source src="./assets/tutorial-instalar-app.mp4" type="video/mp4">Tu navegador no puede reproducir este tutorial.</video>
      <p class="muted sm">En Safari: Compartir → Agregar a pantalla de inicio.</p>`, null, { textoCerrar: "Cerrar" });
    return;
  }
  promptInstalar = promptInstalar || window.__gestionInstallPrompt;
  if (!promptInstalar) { aviso("Abre el menú del navegador y elige «Instalar app» o «Agregar a la pantalla de inicio»."); return; }
  promptInstalar.prompt();
  await promptInstalar.userChoice.catch(() => null);
  promptInstalar = window.__gestionInstallPrompt = null;
  pintarInstalar();
}
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); promptInstalar = window.__gestionInstallPrompt = e; pintarInstalar(); });
window.addEventListener("appinstalled", () => { promptInstalar = window.__gestionInstallPrompt = null; pintarInstalar(); });

// ── Editar perfil (sysPwaProfile, igual que en las demás apps SYS) ──
const leerFoto = f => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result || "")); r.onerror = () => mal(new Error("No fue posible leer la fotografía.")); r.readAsDataURL(f); });
function dlgPerfil() {
  cerrarMenu();
  const u = usr(), n = nombreMostrar();
  dialogo(`<div class="perfil-head"><span id="pAvatar" class="avatar xl"></span><div><span class="kicker">PERFIL</span><h3>Editar perfil</h3></div></div>
    <label class="f">Nombre a mostrar<input id="pNombre" maxlength="80" autocomplete="name" value="${esc(n === "Usuario" ? "" : n)}"></label>
    <label class="f">Teléfono / WhatsApp<input id="pTel" type="tel" maxlength="30" autocomplete="tel" value="${esc(u.telefono || "")}"></label>
    <div class="f">Avatar<input id="pFoto" type="file" accept="image/*" hidden>
      <div class="row"><button type="button" class="btn sm" data-foto="elegir">Cargar foto</button><button type="button" class="btn sm" data-foto="camara">Tomar foto</button></div></div>
    <div class="fijo"><span>Correo</span><b>${esc(u.email || S.ctx.email || "—")}</b></div>`,
  async () => {
    const memberId = u.memberId || S.ctx.memberId;
    if (!memberId) { aviso("No fue posible identificar tu cuenta. Usa Actualizar e intenta de nuevo.", "bad"); return; }
    const f = $("#pFoto").files?.[0];
    if (f && f.size > 5 * 1048576) { aviso("La fotografía debe pesar máximo 5 MB.", "bad"); return; }
    const datos = { memberId, app: "GESTION", nombreApp: $("#pNombre").value.trim(), telefono: $("#pTel").value.trim() };
    const r = await tarea(async () => {
      if (f) datos.foto = { base64: await leerFoto(f), mimeType: f.type, fileName: f.name };
      return sys("sysPwaProfile", datos);
    }, { mensajeOk: "Perfil actualizado." });
    if (!r) return;
    u.nombreVisible = String(r.nombreApp || datos.nombreApp || u.nombreVisible || "").trim();
    u.telefono = String(r.telefono ?? datos.telefono);
    if (r.avatar) u.avatar = r.avatar;
    pintarIdentidad();
    cerrarDialogo();
  });
  pintarAvatar($("#pAvatar"), urlImagen(u.avatar || u.foto), n);
}

// ── Avisos y ocupado ─────────────────────────────────────────
let avisoT = null;
function aviso(texto, tipo = "ok") {
  const el = $("#toast");
  el.textContent = texto;
  el.className = `toast ${tipo}`;
  el.hidden = false;
  clearTimeout(avisoT);
  avisoT = setTimeout(() => { el.hidden = true; }, tipo === "bad" ? 6000 : 3200);
}
function ocupado(on) { $("#busy").hidden = !on; }
async function tarea(fn, { mensajeOk = "" } = {}) {
  ocupado(true);
  try {
    const r = await fn();
    if (mensajeOk || r?.mensaje) aviso(mensajeOk || r.mensaje);
    return r;
  } catch (e) {
    if (e instanceof ApiError && e.code === "AUTH_REQUIRED") { pantalla("login"); return null; }
    aviso(e?.message || "Ocurrió un error.", "bad");
    return null;
  } finally { ocupado(false); }
}

// ── Pantallas de acceso ──────────────────────────────────────
function pantalla(tipo, mensaje = "") {
  $("#view").innerHTML = "";
  const g = $("#gate");
  g.hidden = false;
  $("#account").hidden = true;
  $("#modeBand").hidden = true;
  const t = {
    cargando: `<div class="spinner"></div><p>Cargando…</p>`,
    login: `<h1>SCaD Gestión</h1><p>Seguimiento de proyectos y expediente técnico.</p><button class="btn pri lg" id="btnLogin">Iniciar sesión</button>`,
    error: `<h1>No fue posible entrar</h1><p>${esc(mensaje)}</p><button class="btn pri" id="btnRetry">Reintentar</button> <button class="btn" id="btnLogin">Iniciar sesión</button>`,
    sinAcceso: `<h1>Hola, ${esc(nombreMostrar())}</h1><p>Tu cuenta no tiene una vista asignada en SCaD Gestión. Pide al administrador que te asigne un rol en el panel.</p><button class="btn" data-menu="logout">Cerrar sesión</button>`
  }[tipo];
  g.innerHTML = `<div class="gate-card">${t}</div>`;
}

// ── Arranque ─────────────────────────────────────────────────
async function iniciar() {
  $("#ver").textContent = VERSION;
  pintarInstalar();
  captureTokenFromHash();
  if (!hasToken()) { pantalla("login"); return; }
  pantalla("cargando");
  try {
    S.ctx = await contexto();
  } catch (e) {
    if (e.code === "AUTH_REQUIRED") { if (!startLogin()) pantalla("login"); return; }
    pantalla("error", e.message);
    return;
  }
  pintarIdentidad();
  S.modo = resolverModo();
  if (!S.modo) { pantalla("sinAcceso"); return; }
  $("#gate").hidden = true;
  $("#account").hidden = false;
  pintarModo();
  if (!S.ctx.drive?.conectado) $("#driveWarn").hidden = false;
  await cargarLista();
  ruta();
}

async function cargarLista() {
  const r = await tarea(() => api("PROYECTOS", { vista: S.modo }));
  S.proyectos = r ? (r.proyectos || []) : [];
}

function ruta() {
  const m = /^#\/p\/([\w-]+)/.exec(location.hash || "");
  if (m) abrirProyecto(m[1]);
  else { S.det = null; pintarLista(); }
}
window.addEventListener("hashchange", () => { if (S.ctx) ruta(); });

// ── Lista de proyectos (según la vista) ──────────────────────
const enFase = p => S.fase === "ACTIVOS" ? p.fase !== "CERRADO" : p.fase === S.fase;
const responsable = p => p.responsableNombre || p.responsable?.nombre || "";
const otorgantesDe = p => (p.otorgantes?.length ? p.otorgantes.map(o => o.instanciaId) : [p.instanciaOtorganteId]).filter(Boolean);
function coincide(p) {
  if (S.tipo && p.tipoProyectoClave !== S.tipo) return false;
  const q = norm(S.q).trim();
  if (!q) return true;
  const txt = norm([p.folio, p.nombre, tipoPry(p.tipoProyectoClave), ESTATUS[p.estatus], FASES[p.fase], responsable(p),
    ...otorgantesDe(p).flatMap(id => [insEtq(id), ins(id)?.nombre])].join(" "));
  return q.split(/\s+/).every(w => txt.includes(w));
}

function pintarLista() {
  const P = S.proyectos, M = MODOS[S.modo];
  const activos = P.filter(p => p.fase !== "CERRADO");
  const suma = k => activos.reduce((n, p) => n + (p.checklist?.[k] || 0), 0);
  const filtros = [["ACTIVOS", "Activos"], ["PREVISION", "Previsión"], ["INTEGRACION", "Integración"], ["EJECUCION", "Ejecución"], ["CERRADO", "Cerrados"]];
  const tipos = S.ctx.catalogos?.tiposProyecto || [];
  $("#view").innerHTML = `
    <section class="hero">
      <h1>${M.lista}</h1>
      <p class="muted">${M.sub}</p>
      ${S.modo === "INSTANCIA" ? "" : `<div class="kpis">
        <div class="kpi"><b>${activos.length}</b><span>Activos</span></div>
        <div class="kpi warn"><b>${suma("entregados")}</b><span>Por revisar</span></div>
        <div class="kpi bad"><b>${suma("vencidos")}</b><span>Vencidos</span></div>
        <div class="kpi amber"><b>${suma("porVencer")}</b><span>Vencen en ${S.ctx.reglas?.diasRiesgo || 3} días</span></div>
      </div>`}
    </section>
    ${P.length ? `<div class="buscar">
      <input type="search" id="fBuscar" placeholder="Buscar por folio, nombre, instancia${S.modo === "DIRECCION" ? ", responsable" : ""}…" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search">
      ${tipos.length > 1 ? `<select id="fTipo" aria-label="Tipo de proyecto"><option value="">Todos los tipos</option>${tipos.map(t => `<option value="${esc(t.clave)}" ${S.tipo === t.clave ? "selected" : ""}>${esc(t.etiqueta)}</option>`).join("")}</select>` : ""}
    </div>
    <nav class="seg">${filtros.map(([k, t]) => `<button class="${S.fase === k ? "on" : ""}" data-fase="${k}">${t}</button>`).join("")}</nav>` : ""}
    <p id="conteo" class="muted xs"></p>
    <section class="cards" id="cards"></section>`;
  pintarTarjetas();
}

function pintarTarjetas() {
  const P = S.proyectos;
  const enF = P.filter(enFase), lista = enF.filter(coincide);
  const filtrando = !!(S.q.trim() || S.tipo);
  $("#conteo").textContent = filtrando ? `${lista.length} de ${enF.length} proyectos` : "";
  $("#cards").innerHTML = lista.length ? lista.map(tarjetaProyecto).join("")
    : `<div class="empty">${!P.length ? (S.modo === "OPERACION" ? "Aún no tienes proyectos asignados. El administrador te los asigna desde el panel." : "No hay proyectos para mostrar.")
      : filtrando ? "Ningún proyecto coincide con la búsqueda." : "Sin proyectos en este filtro."}</div>`;
}

function tarjetaProyecto(p) {
  const c = p.checklist || {};
  const pct = c.aplicables ? Math.round((c.validados / c.aplicables) * 100) : 0;
  return `<button class="card pry" data-pry="${esc(p.id)}">
    <div class="row"><span class="folio">${esc(p.folio)}</span><span class="dot ${p.semaforo === "ROJO" ? "bad" : p.semaforo === "AMARILLO" ? "amber" : "ok"}" title="Semáforo"></span></div>
    <h3>${esc(p.nombre)}</h3>
    <div class="row wrap"><span class="chip ${p.estatus === "SUSPENDIDO" ? "bad" : "info"}">${esc(ESTATUS[p.estatus] || p.estatus)}</span><span class="muted sm">${esc(FASES[p.fase] || "")}</span>${S.modo === "DIRECCION" && responsable(p) ? `<span class="muted sm">· ${esc(responsable(p))}</span>` : ""}</div>
    ${c.total ? `<div class="bar"><span style="width:${pct}%"></span></div>
      <div class="row sm"><span>${c.validados}/${c.aplicables} validados</span>
      <span class="badges">${c.entregados ? `<span class="chip warn">${c.entregados} por revisar</span>` : ""}${c.vencidos ? `<span class="chip bad">${c.vencidos} vencidos</span>` : ""}${c.observados ? `<span class="chip">${c.observados} observados</span>` : ""}</span></div>` : `<p class="muted sm">${p.fase === "PREVISION" ? "En Previsión: el checklist se genera cuando el ADM valida la viabilidad." : "Sin checklist."}</p>`}
  </button>`;
}

// ── Proyecto ─────────────────────────────────────────────────
async function abrirProyecto(id, { silencioso = false } = {}) {
  if (!silencioso) $("#view").innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await tarea(() => api("PROYECTO", { proyectoId: id }));
  if (!r) { location.hash = "#/"; return; }
  S.det = r;
  const i = S.proyectos.findIndex(p => p.id === id);
  if (i >= 0) S.proyectos[i] = r.proyecto;
  pintarProyecto();
}

// Sólo en la vista Operación se trabaja el checklist; Dirección e Instancia son de consulta.
const editable = () => S.modo === "OPERACION" && S.det?.proyecto?.estatus === "EN_INTEGRACION";

function pintarProyecto() {
  const p = S.det.proyecto;
  const tabs = [["checklist", `Checklist${p.checklist?.entregados ? ` <span class="badge">${p.checklist.entregados}</span>` : ""}`], ["seguimiento", "Seguimiento"], ["ficha", "Ficha"]];
  $("#view").innerHTML = `
    <section class="pry-head">
      <a class="back" href="#/">‹ ${MODOS[S.modo].lista}</a>
      <div class="row"><span class="folio">${esc(p.folio)}</span><span class="chip ${p.estatus === "SUSPENDIDO" ? "bad" : "info"}">${esc(ESTATUS[p.estatus] || p.estatus)}</span></div>
      <h1>${esc(p.nombre)}</h1>
      <p class="muted sm">${esc(FASES[p.fase] || "")} · El momento del proyecto lo valida el administrador en el panel.</p>
    </section>
    <nav class="tabs">${tabs.map(([k, t]) => `<button class="${S.tab === k ? "on" : ""}" data-tab="${k}">${t}</button>`).join("")}</nav>
    <section id="tabBody">${{ checklist: vistaChecklist, seguimiento: vistaSeguimiento, ficha: vistaFicha }[S.tab]()}</section>`;
}

function vistaChecklist() {
  const items = S.det.checklist;
  const p = S.det.proyecto;
  const c = p.checklist || {};
  const pct = c.aplicables ? Math.round((c.validados / c.aplicables) * 100) : 0;
  const filtros = [["TODOS", "Todos"], ["REVISAR", "Por revisar"], ["VENCIDOS", "Vencidos"], ["ABIERTOS", "Sin validar"]];
  const lista = items.filter(x => S.filtroReq === "TODOS" ? true
    : S.filtroReq === "REVISAR" ? x.estado === "ENTREGADO"
    : S.filtroReq === "VENCIDOS" ? x.semaforo === "VENCIDO"
    : !["VALIDADO", "NO_APLICA"].includes(x.estado));
  const banner = S.modo !== "OPERACION" ? "" : !editable() ? `<div class="note-box">${p.fase === "PREVISION" ? "El proyecto está en Previsión. El checklist se genera cuando el administrador valida la viabilidad." : `El checklist sólo se trabaja mientras el proyecto está En integración. Momento actual: <b>${esc(ESTATUS[p.estatus] || p.estatus)}</b>.`}</div>`
    : (c.aplicables && c.validados === c.aplicables ? `<div class="note-box ok">Checklist completo. El administrador puede validar el expediente en el panel.</div>` : "");
  return `${banner}
    ${items.length ? `<div class="progress"><div class="row"><b>${pct}%</b><span class="muted sm">${c.validados} de ${c.aplicables} requerimientos aplicables validados</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>
    <nav class="seg sm">${filtros.map(([k, t]) => `<button class="${S.filtroReq === k ? "on" : ""}" data-freq="${k}">${t}</button>`).join("")}</nav>` : ""}
    <div class="reqs">${lista.map(tarjetaReq).join("") || (items.length ? `<div class="empty">Nada en este filtro.</div>` : "")}</div>
    ${editable() ? `<button class="btn block" data-act="agregar">+ Agregar requerimiento extraordinario</button>` : ""}`;
}

function tarjetaReq(x) {
  const e = ESTADOS[x.estado] || { t: x.estado, c: "" };
  const vig = x.archivos.find(a => a.vigente);
  const trans = editable() ? (S.ctx.reglas?.transiciones?.[x.estado] || []) : [];
  const puedeSubir = editable() && !["VALIDADO", "NO_APLICA"].includes(x.estado);
  return `<article class="req ${x.semaforo === "VENCIDO" ? "vencido" : ""}">
    <div class="row"><h3>${esc(x.etiqueta)}${x.extraordinario ? ` <span class="chip mute">Extra</span>` : ""}</h3><span class="chip ${e.c}">${esc(e.t)}</span></div>
    ${x.descripcion ? `<p class="muted sm">${esc(x.descripcion)}</p>` : ""}
    <div class="meta">
      <span>${esc(insEtq(x.instanciaId) || "Sin instancia")}</span>
      ${x.tipoDocumentoClave ? `<span>${esc(tipoDoc(x.tipoDocumentoClave))}</span>` : ""}
      <span class="${x.semaforo === "VENCIDO" ? "t-bad" : x.semaforo === "POR_VENCER" ? "t-amber" : ""}">Compromiso: ${fecha(x.fechaCompromiso)}${x.semaforo === "VENCIDO" ? " · vencido" : x.semaforo === "POR_VENCER" ? " · por vencer" : ""}</span>
      ${x.observaciones ? `<span>${x.observaciones} ${x.observaciones === 1 ? "observación" : "observaciones"}</span>` : ""}
    </div>
    ${x.estado === "NO_APLICA" && x.justificacionNoAplica ? `<p class="sm"><b>No aplica:</b> ${esc(x.justificacionNoAplica)}</p>` : ""}
    ${vig ? `<div class="file"><span class="ico">📄</span><div><b>${esc(vig.nombre)}</b><span class="muted sm">v${vig.version} · ${tamano(vig.tamano)} · ${fecha(vig.fechaCarga)}${vig.cargadoEnNombreDe ? ` · en nombre de ${esc(vig.cargadoEnNombreDe)}` : ""}</span></div><button class="btn sm" data-ver="${esc(vig.id)}">Ver</button></div>` : ""}
    ${x.archivos.length > 1 ? `<details class="sm"><summary>${x.archivos.length - 1} versión(es) anterior(es)</summary>${x.archivos.filter(a => !a.vigente).map(a => `<div class="row"><span>v${a.version} · ${esc(a.nombre)} · ${fecha(a.fechaCarga)}</span><button class="btn xs" data-ver="${esc(a.id)}">Ver</button></div>`).join("")}</details>` : ""}
    ${x.ultimaActualizacion ? `<p class="muted xs">Última actualización: ${fechaHora(x.ultimaActualizacion)}${x.ultimaActualizacionPorNombre ? ` · ${esc(x.ultimaActualizacionPorNombre)}` : ""}</p>` : ""}
    ${editable() ? `<div class="acts">
      ${puedeSubir ? `<button class="btn sm pri" data-subir="${esc(x.id)}">Subir documento</button>` : ""}
      ${trans.map(t => `<button class="btn sm ${ACCION[t]?.c || ""}" data-estado="${t}" data-req="${esc(x.id)}">${esc(ACCION[t]?.t || t)}</button>`).join("")}
      <button class="btn sm ghost" data-editar="${esc(x.id)}">Editar</button>
      <button class="btn sm ghost" data-anotar="${esc(x.id)}">Anotar</button>
    </div>` : ""}
  </article>`;
}

function vistaSeguimiento() {
  const p = S.det.proyecto;
  const h = S.det.seguimiento;
  const abierto = p.fase !== "CERRADO" && S.modo === "OPERACION";
  return `${abierto ? `<div class="card compose">
      <textarea id="segNota" rows="3" placeholder="Escribe una anotación del proyecto: gestiones, acuerdos, llamadas…"></textarea>
      <div class="row wrap">
        <select id="segReq"><option value="">Proyecto en general</option>${S.det.checklist.map(x => `<option value="${esc(x.id)}">${esc(x.etiqueta)}</option>`).join("")}</select>
        <label class="check"><input type="checkbox" id="segVis"> Visible para la instancia</label>
        <button class="btn pri" data-act="anotarGeneral">Registrar</button>
      </div></div>` : ""}
    <ol class="timeline">${h.map(s => `<li>
      <div class="row"><span class="muted xs">${fechaHora(s.fechaRegistro)} · ${esc(s.autorNombre)}${s.autorTipo === "CLIENTE" ? " (instancia)" : ""}</span>${s.visibleCliente && S.modo !== "INSTANCIA" ? `<span class="chip mute xs">Visible para la instancia</span>` : ""}</div>
      ${s.referenciaEtiqueta ? `<div class="ref">${esc(s.referenciaEtiqueta)}</div>` : ""}
      ${s.tipo === "CAMBIO_ESTADO" && s.estadoNuevo ? `<span class="chip ${(ESTADOS[s.estadoNuevo] || {}).c || "info"}">${esc((ESTADOS[s.estadoNuevo] || {}).t || ESTATUS[s.estadoNuevo] || s.estadoNuevo)}</span>` : ""}
      <p>${esc(s.nota)}</p>
    </li>`).join("") || `<li class="empty">Sin anotaciones.</li>`}</ol>`;
}

function vistaFicha() {
  const p = S.det.proyecto;
  const otorgantes = (p.otorgantes && p.otorgantes.length) ? p.otorgantes : (p.instanciaOtorganteId ? [{ instanciaId: p.instanciaOtorganteId, aportacion: null, resultado: "PENDIENTE" }] : []);
  const bloqueOtorgante = o => {
    const i = ins(o.instanciaId);
    const ef = i?.enlaceFormal;
    const r = RESULTADO[o.resultado] || RESULTADO.PENDIENTE;
    return `<div class="otg">
      <div class="row"><b>${esc(i?.siglas || i?.nombre || "—")}</b><span class="chip ${r.c}">${esc(r.t)}</span></div>
      ${i?.siglas ? `<div class="muted sm">${esc(i.nombre)}</div>` : ""}
      ${o.aportacion !== null && o.aportacion !== undefined ? `<div class="sm">Aportación: ${pesos(o.aportacion)}</div>` : ""}
      ${o.fechaResultado ? `<div class="muted xs">Resultado registrado: ${fecha(o.fechaResultado)}</div>` : ""}
      ${ef?.nombre ? `<div class="sm">Enlace formal: ${esc(ef.nombre)}${ef.cargo ? ` · ${esc(ef.cargo)}` : ""}
        ${ef.telefono ? `<br><a href="tel:${esc(ef.telefono.replace(/[^\d+]/g, ""))}">${esc(ef.telefono)}</a>` : ""}
        ${ef.email ? `<br><a href="mailto:${esc(ef.email)}">${esc(ef.email)}</a>` : ""}</div>` : ""}
    </div>`;
  };
  return `<div class="card ficha">
    ${p.descripcion ? `<p>${esc(p.descripcion)}</p>` : ""}
    <dl>
      <dt>Tipo de proyecto</dt><dd>${esc(tipoPry(p.tipoProyectoClave) || "—")}</dd>
      <dt>Valor</dt><dd>${pesos(p.valor)}</dd>
      <dt>Fase</dt><dd>${esc(FASES[p.fase] || p.fase)}</dd>
      <dt>Momento</dt><dd>${esc(ESTATUS[p.estatus] || p.estatus)}</dd>
      <dt>Alta</dt><dd>${fecha(p.fechaAlta)}</dd>
    </dl>
    <h3 class="sub-h">${otorgantes.length > 1 ? "Instancias otorgantes" : "Instancia otorgante"}</h3>
    <div class="otgs">${otorgantes.map(bloqueOtorgante).join("") || `<p class="muted sm">Sin instancia otorgante.</p>`}</div>
    <p class="muted xs">Los datos del proyecto, sus momentos y el resultado de cada otorgante los registra el ADM en el panel de SCaD Gestión.</p>
  </div>`;
}

// ── Diálogos ─────────────────────────────────────────────────
let alEnviar = null;
function dialogo(html, enviar, { textoBoton = "Guardar", clase = "pri", textoCerrar = "Cancelar" } = {}) {
  $("#dlgBody").innerHTML = `${html}<div class="dlg-acts"><button class="btn" data-dlg="cerrar">${esc(textoCerrar)}</button>${enviar ? `<button class="btn ${clase}" data-dlg="ok">${esc(textoBoton)}</button>` : ""}</div>`;
  alEnviar = enviar;
  $("#dlg").showModal();
}
function cerrarDialogo() { if ($("#dlg").open) $("#dlg").close(); alEnviar = null; }
const reqPorId = id => S.det.checklist.find(x => x.id === id);
const opcionesIntegra = sel => `<option value="">Sin instancia</option>` + (S.ctx.instancias || []).filter(i => i.activo && i.integra).map(i => `<option value="${esc(i.id)}" ${i.id === sel ? "selected" : ""}>${esc(i.siglas || i.nombre)}</option>`).join("");

async function trasCambio(r) {
  if (!r) return;
  cerrarDialogo();
  await abrirProyecto(S.det.proyecto.id, { silencioso: true });
}

function dlgEstado(id, estado) {
  const x = reqPorId(id);
  const obligatoria = ["OBSERVADO", "NO_APLICA"].includes(estado);
  const textos = {
    SOLICITADO: "Confirma que ya solicitaste este requerimiento a la instancia.",
    VALIDADO: "El documento cumple y queda integrado al expediente.",
    OBSERVADO: "Describe lo que falta o se debe corregir. La observación será visible para la instancia.",
    NO_APLICA: "Justifica por qué no aplica. Deja de contar para el avance.",
    PENDIENTE: "El requerimiento vuelve a contar para el avance."
  };
  dialogo(`<h3>${esc(ACCION[estado]?.t || estado)}</h3><p class="muted">${esc(x.etiqueta)}</p><p>${esc(textos[estado] || "")}</p>
    <label class="f">${obligatoria ? "Anotación (obligatoria)" : "Anotación (opcional)"}<textarea id="dNota" rows="3"></textarea></label>
    ${!obligatoria ? `<label class="check"><input type="checkbox" id="dVis"> Visible para la instancia</label>` : ""}`,
  () => tarea(() => api("REQ_ESTADO", { prqId: id, estado, nota: $("#dNota").value, visibleCliente: $("#dVis")?.checked === true })).then(trasCambio),
  { textoBoton: ACCION[estado]?.t || "Guardar", clase: ACCION[estado]?.c === "bad" ? "bad" : "pri" });
}

function dlgEditar(id) {
  const x = reqPorId(id);
  dialogo(`<h3>Editar requerimiento</h3><p class="muted">${esc(x.etiqueta)}</p>
    <label class="f">Fecha compromiso<input type="date" id="dFecha" value="${isoDia(x.fechaCompromiso)}"></label>
    <label class="f">Instancia<select id="dIns">${opcionesIntegra(x.instanciaId)}</select></label>`,
  () => {
    const datos = { prqId: id };
    if ($("#dFecha").value !== isoDia(x.fechaCompromiso)) datos.fechaCompromiso = $("#dFecha").value;
    if ($("#dIns").value !== x.instanciaId) datos.instanciaId = $("#dIns").value;
    return tarea(() => api("REQ_EDITAR", datos)).then(trasCambio);
  });
}

function dlgAgregar() {
  dialogo(`<h3>Requerimiento extraordinario</h3>
    <label class="f">Nombre<input id="dEt" maxlength="160"></label>
    <label class="f">Descripción (opcional)<textarea id="dDes" rows="2"></textarea></label>
    <label class="f">Instancia<select id="dIns">${opcionesIntegra("")}</select></label>
    <label class="f">Tipo de documento<select id="dTd"><option value="">—</option>${(S.ctx.catalogos?.tiposDocumento || []).map(t => `<option value="${esc(t.clave)}">${esc(t.etiqueta)}</option>`).join("")}</select></label>
    <label class="f">Fecha compromiso<input type="date" id="dFecha"></label>
    <label class="f">Motivo (opcional)<textarea id="dNota" rows="2"></textarea></label>`,
  () => tarea(() => api("REQ_AGREGAR", {
    proyectoId: S.det.proyecto.id, etiqueta: $("#dEt").value, descripcion: $("#dDes").value, instanciaId: $("#dIns").value,
    tipoDocumentoClave: $("#dTd").value, fechaCompromiso: $("#dFecha").value, nota: $("#dNota").value
  })).then(trasCambio), { textoBoton: "Agregar" });
}

function dlgAnotar(id) {
  const x = reqPorId(id);
  dialogo(`<h3>Anotar</h3><p class="muted">${esc(x.etiqueta)}</p>
    <label class="f">Anotación<textarea id="dNota" rows="4"></textarea></label>
    <label class="check"><input type="checkbox" id="dVis"> Visible para la instancia</label>`,
  () => tarea(() => api("ANOTAR", { proyectoId: S.det.proyecto.id, prqId: id, nota: $("#dNota").value, visibleCliente: $("#dVis").checked })).then(trasCambio),
  { textoBoton: "Registrar" });
}

function dlgSubir(id) {
  const x = reqPorId(id);
  if (!S.ctx.drive?.conectado) { aviso("El Drive de la EO no está conectado. Pide al administrador principal que lo conecte en el panel.", "bad"); return; }
  const max = S.ctx.reglas?.maxCargaMB || 25;
  const nombreIns = ins(x.instanciaId)?.nombre || "la instancia";
  dialogo(`<h3>Subir documento</h3><p class="muted">${esc(x.etiqueta)}</p>
    <label class="f">Archivo (máximo ${max} MB)<input type="file" id="dFile"></label>
    <label class="check"><input type="checkbox" id="dNom"> La instancia lo entregó por otro medio: registrarlo en nombre de ${esc(nombreIns)}</label>
    <label class="f" id="dMedioBox" hidden>Medio de recepción<select id="dMedio">${Object.entries(MEDIOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
    <label class="f">Anotación (opcional)<textarea id="dNota" rows="2"></textarea></label>
    <div class="upbar" id="dProg" hidden><span></span></div>
    <p class="muted xs">El archivo se guarda en el Drive de la EO, en la carpeta del proyecto, instancia y requerimiento. Queda como Entregado, pendiente de tu validación.</p>`,
  async () => {
    const f = $("#dFile").files?.[0];
    if (!f) { aviso("Elige un archivo.", "bad"); return; }
    if (f.size > max * 1048576) { aviso(`El archivo supera ${max} MB.`, "bad"); return; }
    const enNombreDe = $("#dNom").checked;
    const medio = $("#dMedio").value;
    const nota = $("#dNota").value;
    const btn = /** @type {HTMLButtonElement} */ (document.querySelector('[data-dlg="ok"]'));
    btn.disabled = true;
    const prog = $("#dProg");
    prog.hidden = false;
    try {
      // Si el archivo ya llegó a Drive y sólo falló el registro, se reintenta sólo el registro.
      if (!subido || subido.archivo !== f) {
        const prep = await api("CARGA_PREPARAR", { prqId: id, nombreArchivo: f.name, mimeType: f.type, tamano: f.size });
        const meta = await subirADrive(prep.uploadUrl, f, pct => { prog.firstElementChild.style.width = pct + "%"; });
        subido = { archivo: f, driveFileId: meta.id };
      }
      const r = await api("CARGA_CONFIRMAR", { prqId: id, driveFileId: subido.driveFileId, enNombreDe, medio, nota });
      subido = null;
      aviso(r.mensaje || "Documento cargado.");
      await trasCambio(r);
    } catch (e) {
      aviso(e?.message || "No fue posible subir el documento.", "bad");
      btn.disabled = false;
      if (!subido) prog.hidden = true;
      if (subido) btn.textContent = "Reintentar registro";
    }
  }, { textoBoton: "Subir" });
  let subido = null;
}

async function verArchivo(id) {
  const r = await tarea(() => archivo(id));
  if (!r) return;
  const url = URL.createObjectURL(r.blob);
  dialogo(`<h3>Documento listo</h3><p>${esc(r.nombre)}</p>
    <div class="row wrap"><a class="btn pri" href="${url}" target="_blank" rel="noopener">Abrir</a><a class="btn" href="${url}" download="${esc(r.nombre)}">Descargar</a></div>`, null);
}

// ── Eventos ──────────────────────────────────────────────────
document.addEventListener("click", e => {
  const t = e.target.closest("button, a");
  if (!t || !t.closest("#accountMenu, #account")) cerrarMenu();
  if (!t) return;
  const d = t.dataset;
  if (t.id === "btnLogin") { startLogin(); return; }
  if (t.id === "btnRetry") { iniciar(); return; }
  if (t.id === "installButton") { instalar(); return; }
  if (t.id === "account") { const m = $("#accountMenu"); m.hidden = !m.hidden; t.setAttribute("aria-expanded", String(!m.hidden)); return; }
  if (d.menu === "logout") { logout(); return; }
  if (d.menu === "refresh") { actualizar(); return; }
  if (d.menu === "perfil") { dlgPerfil(); return; }
  if (d.menu === "panel") { abrirPanel(); return; }
  if (d.modo) { cambiarModo(d.modo); return; }
  if (d.foto) { const i = $("#pFoto"); if (d.foto === "camara") i.setAttribute("capture", "user"); else i.removeAttribute("capture"); i.click(); return; }
  if (d.dlg === "cerrar") { cerrarDialogo(); return; }
  if (d.dlg === "ok") { alEnviar && alEnviar(); return; }
  if (d.fase) { S.fase = d.fase; document.querySelectorAll("[data-fase]").forEach(b => b.classList.toggle("on", b === t)); pintarTarjetas(); return; }
  if (d.pry) { S.tab = "checklist"; S.filtroReq = "TODOS"; location.hash = `#/p/${d.pry}`; return; }
  if (d.tab) { S.tab = d.tab; pintarProyecto(); return; }
  if (d.freq) { S.filtroReq = d.freq; pintarProyecto(); return; }
  if (d.estado) { dlgEstado(d.req, d.estado); return; }
  if (d.editar) { dlgEditar(d.editar); return; }
  if (d.anotar) { dlgAnotar(d.anotar); return; }
  if (d.subir) { dlgSubir(d.subir); return; }
  if (d.ver) { verArchivo(d.ver); return; }
  if (d.act === "agregar") { dlgAgregar(); return; }
  if (d.act === "anotarGeneral") {
    tarea(() => api("ANOTAR", { proyectoId: S.det.proyecto.id, prqId: $("#segReq").value, nota: $("#segNota").value, visibleCliente: $("#segVis").checked })).then(trasCambio);
  }
});
document.addEventListener("change", e => {
  if (e.target.id === "dNom") $("#dMedioBox").hidden = !e.target.checked;
  if (e.target.id === "fTipo") { S.tipo = e.target.value; pintarTarjetas(); }
  if (e.target.id === "pFoto") { const f = e.target.files?.[0]; if (f) pintarAvatar($("#pAvatar"), URL.createObjectURL(f), ""); }
});
document.addEventListener("input", e => {
  if (e.target.id === "fBuscar") { S.q = e.target.value; pintarTarjetas(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarMenu(); });
$("#dlg").addEventListener("close", () => { alEnviar = null; $("#dlgBody video")?.pause(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

iniciar();
