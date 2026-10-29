// SCaD Gestión · App · v0.7.10
// v0.7.10: el responsable agrega requerimientos extraordinarios (categoría 2 o 3) y los edita; la categoría 1 y los validados no se editan.
// v0.7.9: el catálogo de documentos se denomina Tipo de acreditación (la forma de acreditar el cumplimiento).
// v0.7.8: tarjeta de identidad compacta visible en todas las vistas (avatar, nombre, correo, rol y vista activa).
// v0.7.7: seguimiento en tabla (No., columnas elegibles, búsqueda con limpiar, exportación Excel y PDF).
// v0.7.6: Validar (cumplido) sin documento; marca de espera de documento para el responsable.
// v0.7.5: toggle para minimizar los indicadores de avance en la vista del proyecto; se quita el aviso de Previsión sobre el checklist.
// v0.7.4: detalle del requerimiento con barra azul y sólo la X para cerrar; la casilla de visibilidad indica la categoría de la instancia.
// v0.7.3: el registro de seguimiento lo integra el ADM y el responsable, desde la pestaña Seguimiento o desde el requerimiento (misma acción).
// v0.7.2: vista de proyecto a todo el ancho; tabla sin número de fila y categoría como número; detalle del requerimiento con acciones y su seguimiento (anotar desde el requerimiento).
// v0.7.1: folio sólo con el número de registro (001); categoría tomada del requerimiento cuando el renglón no la trae; barra de búsqueda y filtros con diseño de herramienta; tabla con encabezado y columnas ajustadas.
// v0.7.0: checklist en tabla (No., folio de registro, columnas elegibles), búsqueda y filtros (estado, instancia, categoría, plazo), detalle del requerimiento en diálogo con sus acciones, y exportación a Excel y PDF.
// v0.6.16: curva de avance del expediente (planificado vs. real) en el checklist; tooltip y detalle al clic.
// v0.6.15: sin botón de requerimiento extraordinario (el ADM define los requerimientos); el diálogo de requerimiento sólo ajusta la fecha compromiso, obligatoria.
// v0.6.12: barra de vistas con íconos; modo de vista bajo la EO en la barra superior.
// v0.6.10: foto del avatar como imagen en la barra superior, el menú y el perfil.
// v0.6.8: política de privacidad y condiciones del servicio en modal desde el menú de cuenta.
// v0.6.0: pantalla de bienvenida (js/bienvenida.js): visitante con planes; usuario con resumen del día según el rol.
// v0.5.2: inicio con logotipo centrado, zoom y disolución.
// v0.5.1: identidad visual y barra azul de navegación, estilo NEXUS.
// v0.5.0: Programación sobre el núcleo SYS (gestionCore v0.3.0): tipos de actividad del
//         catálogo SYS autorizados por rol; el ADM programa requeridas (de un proyecto o
//         generales de la EO); permisos por actividad desde el backend; vista Instancia.
// v0.4.0: actividades requeridas (ADM) y propias (colaborador, ligadas a un proyecto); alta, edición y
//         baja de propias; cumplimiento desde la actividad o desde Seguimiento (siempre deja anotación);
//         el ADM convierte una propia en requerida; pestaña Agenda en el proyecto.
// v0.3.0: módulo Programación (modelo NEXUS: actividades del contexto SYS, calendario/lista,
//         filtro por tipo, búsqueda, detalle) y bloque "Actividades de hoy" en los listados.
// v0.2.0: menú de cuenta normalizado (avatar + nombre a mostrar), Editar perfil (sysPwaProfile),
//         Instalar app (tutorial en video para iPhone), vistas Dirección / Operación / Instancia
//         (el ADM las alterna desde el menú), Panel de Control sólo ADM, búsqueda y filtro de proyectos.
// v0.1.1: la ficha muestra todas las instancias otorgantes con su aportación y resultado.
// Vistas por rol de la EO (sin roles nuevos): ADM → las tres · EJECUTIVO → Dirección ·
// staff → Operación · CLIENTE → Instancia. Sólo en Operación se trabaja el checklist;
// Dirección e Instancia son de consulta. Los momentos del proyecto los valida el ADM en el panel.
import { captureTokenFromHash, hasToken, startLogin, logout } from "./auth.js";
import { contexto, api, sys, archivo, subirADrive, ApiError } from "./api.js";
import { bienvenidaVisitante, bienvenidaUsuario, detallePlan } from "./bienvenida.js";
import { documentoLegal } from "./legal.js";
import {
  abrirProgramacion, repintarProgramacion, setContexto, actividades, buscarActividad, idDe, listaHtml, deHoy,
  inicio, fin, hora, titulo, tipoDe, lugar, detalle, todoDia, origenDe, cumplida, programada, sinCumplir, colorDe
} from "./programacion.js";

export const VERSION = "GESTION_APP v0.7.10";
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

const S = { indMin: false, segQ: "", segCols: ["fecha", "autor", "tipo", "ref", "nota"], ctx: null, modo: null, proyectos: [], fase: "ACTIVOS", q: "", tipo: "", det: null, tab: "checklist", filtroReq: "TODOS", reqQ: "", reqF: { estado: "", inst: "", cat: "", venc: "" }, reqCols: ["folio", "etiqueta", "instancia", "categoria", "compromiso", "estado", "semaforo"], reqSel: null };

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
  b.hidden = true; // la vista se indica en la barra superior, bajo la EO
  const t = $("#modoTxt");
  t.hidden = !S.modo;
  if (S.modo) { t.textContent = MODOS[S.modo].band; document.body.dataset.modo = S.modo; }
  const ms = modosDisponibles(), box = $("#menuModos");
  box.hidden = ms.length < 2;
  box.innerHTML = ms.length < 2 ? "" : `<span class="menu-sec">VISTA</span>` + ms.map(m =>
    `<button type="button" class="menu-modo ${m === S.modo ? "on" : ""}" data-modo="${m}" data-tone="${m}"><i></i><span>${MODOS[m].t}</span>${m === S.modo ? "<b>✓</b>" : ""}</button>`).join("");
}
async function cambiarModo(m) {
  cerrarMenu();
  if (m === S.modo) return;
  S.modo = m;
  pintarTarjetaIdentidad();
  try { localStorage.setItem(claveModo(), m); } catch (_) { /* sin almacenamiento */ }
  Object.assign(S, { fase: "ACTIVOS", q: "", tipo: "", det: null });
  pintarModo();
  history.replaceState({}, "", "#/inicio");
  marcarSeccion("");
  $("#view").innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  await cargarLista();
  pintarBienvenida();
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
// La foto va como <img> (no como fondo CSS), para que no dependa de reglas de fondo del tema.
function pintarAvatar(el, url, nombre) {
  el.style.backgroundImage = "";
  if (url) { el.textContent = ""; el.innerHTML = `<img src="${esc(url)}" alt="" referrerpolicy="no-referrer">`; }
  else { el.innerHTML = ""; el.textContent = iniciales(nombre); }
}
// Tarjeta de identidad compacta: se ve en cualquier vista (avatar, nombre, correo, rol y vista activa).
const ROL_T = { ADM: "Administrador", OPERACION: "Operación", EJECUTIVO: "Dirección", CLIENTE: "Instancia" };
function asegurarEstiloIdentidad() {
  if (document.getElementById("idBarCss")) return;
  const st = document.createElement("style");
  st.id = "idBarCss";
  st.textContent = `.id-bar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin:0 0 10px}
.id-bar .avatar{flex:0 0 auto;width:36px;height:36px;font-size:13px}
.id-txt{display:flex;flex-direction:column;min-width:0;flex:1 1 200px}
.id-txt b{font-size:14px;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.id-txt span{font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.id-chips{display:flex;gap:6px;flex-wrap:wrap}
.id-chips .chip{font-size:11px}`;
  document.head.appendChild(st);
}
function pintarTarjetaIdentidad() {
  if (!S.ctx) return;
  asegurarEstiloIdentidad();
  let el = document.getElementById("idBar");
  if (!el) { el = document.createElement("div"); el.id = "idBar"; el.className = "id-bar"; $("#view").before(el); }
  const n = nombreMostrar(), foto = urlImagen(usr().avatar || usr().foto);
  const roles = [ROL_T[rolApp()] || rolApp() || "Usuario", usr().admPrincipal ? "Principal" : ""].filter(Boolean);
  el.innerHTML = `<span class="avatar" id="idAvatar"></span>
    <div class="id-txt"><b>${esc(n)}</b><span>${esc(usr().email || S.ctx.email || "")}</span></div>
    <div class="id-chips">${roles.map(r => `<span class="chip">${esc(r)}</span>`).join("")}${S.modo && MODOS[S.modo] ? `<span class="chip info">Vista: ${esc(MODOS[S.modo].t)}</span>` : ""}</div>`;
  pintarAvatar(el.querySelector("#idAvatar"), foto, n);
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
  pintarTarjetaIdentidad();
}
let menuOrigen = null;
function cerrarMenu(devolverFoco = false) {
  $("#accountMenu").hidden = true;
  [$("#account"), $("#navOptions")].forEach(b => b.setAttribute("aria-expanded", "false"));
  if (devolverFoco) menuOrigen?.focus();
}
function alternarMenu(origen) {
  const menu = $("#accountMenu"), abrir = menu.hidden || menuOrigen !== origen;
  cerrarMenu();
  if (!abrir) return;
  menuOrigen = origen;
  menu.classList.toggle("from-nav", origen.id === "navOptions");
  menu.hidden = false;
  [$("#account"), $("#navOptions")].forEach(b => b.setAttribute("aria-expanded", "true"));
  $("#closeOptions").focus();
}
function marcarSeccion(seccion) {
  document.querySelectorAll("[data-sec]").forEach(a => {
    const activa = a.dataset.sec === seccion;
    a.classList.toggle("on", activa);
    if (activa) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
}
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
  setContexto(c);
  pintarIdentidad();
  if (!modosDisponibles().includes(S.modo)) S.modo = resolverModo();
  pintarModo();
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
let tareasPendientes = 0;
function ocupado(on, mensaje = "Procesando solicitud…") {
  tareasPendientes = Math.max(0, tareasPendientes + (on ? 1 : -1));
  const capa = $("#busy");
  capa.hidden = tareasPendientes === 0;
  if (on) $("#busyText").textContent = mensaje;
  document.body.setAttribute("aria-busy", String(tareasPendientes > 0));
}
async function tarea(fn, { mensajeOk = "", mensajeCarga = "Procesando solicitud…" } = {}) {
  ocupado(true, mensajeCarga);
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
  $("#secciones").hidden = true;
  document.body.classList.remove("has-nav");
  cerrarMenu();
  const t = {
    cargando: `<div class="spinner"></div><p>Cargando…</p>`,
    login: `<img class="gate-logo" src="./assets/branding/scad-gestion-completo.png" alt="SCaD GESTIÓN · Organización, Control, Resultados">${bienvenidaVisitante()}`,
    error: `<h1>No fue posible entrar</h1><p>${esc(mensaje)}</p><button class="btn pri" id="btnRetry">Reintentar</button> <button class="btn" id="btnLogin">Iniciar sesión</button>`,
    sinAcceso: bienvenidaVisitante({ sesion: true, nombre: nombreMostrar() })
  }[tipo];
  g.innerHTML = `<div class="gate-card ${tipo === "login" || tipo === "sinAcceso" ? "wide" : ""}">${t}</div>`;
  $("#btnLoginTop").hidden = tipo !== "login";
}

// ── Arranque ─────────────────────────────────────────────────
async function iniciar() {
  $("#ver").textContent = VERSION;
  const splashVer = $("#splashVer");
  if (splashVer) splashVer.textContent = VERSION;
  console.info(VERSION);
  pintarInstalar();
  captureTokenFromHash();
  if (!hasToken()) { pantalla("login"); return; }
  pantalla("cargando");
  try {
    S.ctx = await contexto();
    setContexto(S.ctx);
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
  $("#btnLoginTop").hidden = true;
  $("#secciones").hidden = false;
  document.body.classList.add("has-nav");
  pintarModo();
  if (!location.hash || location.hash === "#/") history.replaceState({}, "", "#/inicio");
  await cargarLista();
  ruta();
}

async function cargarLista() {
  const r = await tarea(() => api("PROYECTOS", { vista: S.modo }));
  S.proyectos = r ? (r.proyectos || []) : [];
}

function ruta() {
  document.querySelector("main")?.classList.toggle("ancho", /^#\/p\//.test(location.hash));
  const h = location.hash || "";
  const prg = /^#\/programacion(?:\/([^/]+))?/.exec(h);
  cerrarMenu();
  marcarSeccion(prg ? "programacion" : "proyectos");
  if (prg) {
    S.det = null;
    abrirProgramacion($("#view"), S.ctx, { puedeProgramar: puedeProgramar(), subtitulo: S.modo === "OPERACION" ? "Actividades requeridas y las tuyas, de tus proyectos." : S.modo === "INSTANCIA" ? "Actividades de los proyectos en los que participa tu instancia." : "Actividades de la EO y de los proyectos." });
    if (prg[1]) dlgActividad(decodeURIComponent(prg[1]));
    return;
  }
  if (h === "#/inicio") { S.det = null; marcarSeccion(""); pintarBienvenida(); return; }
  const m = /^#\/p\/([\w-]+)/.exec(h);
  if (m) abrirProyecto(m[1]);
  else { S.det = null; pintarLista(); }
}
window.addEventListener("hashchange", () => { if (S.ctx) ruta(); });

// ── Bienvenida (usuario) ─────────────────────────────────────
function pintarBienvenida() {
  const u = usr(), n = nombreMostrar();
  const rol = { DIRECCION: "Dirección", OPERACION: "Operación", INSTANCIA: "Instancia" }[S.modo] || "";
  const foto = urlImagen(u.avatar || u.foto);
  $("#view").innerHTML = bienvenidaUsuario({
    ctx: S.ctx, modo: S.modo, proyectos: S.proyectos, esAdm: esAdm(),
    identidad: { nombre: n === "Usuario" ? "" : n, email: u.email || S.ctx.email || "", foto, iniciales: iniciales(n) },
    eoNombre: S.ctx.eo?.nombreMostrar || S.ctx.eo?.nombre || "",
    rolEtiqueta: esAdm() ? "Administrador" + (rol ? " · " + rol : "") : rol
  });
}

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
    ${bloqueHoy()}
    <div class="buscar">
      ${P.length ? `<input type="search" id="fBuscar" placeholder="Buscar folio, nombre, instancia${S.modo === "DIRECCION" ? ", responsable" : ""}…" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search" aria-label="Buscar proyectos">
      ${tipos.length > 1 ? `<select id="fTipo" aria-label="Tipo de proyecto"><option value="">Todos los tipos</option>${tipos.map(t => `<option value="${esc(t.clave)}" ${S.tipo === t.clave ? "selected" : ""}>${esc(t.etiqueta)}</option>`).join("")}</select>` : ""}` : ""}
      <span id="conteo" class="conteo" aria-live="polite"></span>
    </div>
    ${P.length ? `<nav class="seg">${filtros.map(([k, t]) => `<button class="${S.fase === k ? "on" : ""}" data-fase="${k}">${t}</button>`).join("")}</nav>` : ""}
    <section class="cards" id="cards"></section>`;
  pintarTarjetas();
}

// Actividades de hoy (Programación), como en NEXUS.
function bloqueHoy() {
  const hoy = deHoy(S.ctx);
  if (!hoy.length) return "";
  return `<section class="hoy"><div class="row"><h3>Actividades de hoy</h3><a href="#/programacion" class="sm">Ver programación ›</a></div>
    ${hoy.slice(0, 4).map(a => `<a class="hoy-item ${origenDe(a) === "USUARIO" ? "propia" : ""}" href="#/programacion/${encodeURIComponent(idDe(a))}"><span class="prg-hora">${esc(hora(a))}</span><i style="--c:${colorDe(a)}"></i><span class="prg-copy"><b>${cumplida(a) ? "✓ " : ""}${esc(titulo(a))}</b><span>${esc([origenDe(a) === "USUARIO" ? "Propia" : "Requerida", tipoDe(a), a.proyectoFolio].filter(Boolean).join(" · "))}</span></span></a>`).join("")}
    ${hoy.length > 4 ? `<p class="muted xs">y ${hoy.length - 4} más</p>` : ""}</section>`;
}

function pintarTarjetas() {
  const P = S.proyectos;
  const enF = P.filter(enFase), lista = enF.filter(coincide);
  const filtrando = !!(S.q.trim() || S.tipo);
  $("#conteo").textContent = filtrando ? `${lista.length} de ${enF.length} proyectos` : `${enF.length} proyecto${enF.length === 1 ? "" : "s"}`;
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
  const r = await tarea(() => api("PROYECTO", { proyectoId: id, vista: S.modo }));
  if (!r) { location.hash = "#/"; return; }
  S.det = r;
  const i = S.proyectos.findIndex(p => p.id === id);
  if (i >= 0) S.proyectos[i] = r.proyecto;
  pintarProyecto();
}

// Sólo en la vista Operación se trabaja el checklist; Dirección e Instancia son de consulta.
const editable = () => S.modo === "OPERACION" && S.det?.proyecto?.estatus === "EN_INTEGRACION";
// Registrar seguimiento: el responsable (Operación) y el ADM, en cualquier momento salvo proyecto cerrado.
const puedeAnotar = () => (S.modo === "OPERACION" || esAdm()) && S.det?.proyecto?.fase !== "CERRADO";

function pintarProyecto() {
  const p = S.det.proyecto;
  const tabs = [["checklist", `Checklist${p.checklist?.entregados ? ` <span class="badge">${p.checklist.entregados}</span>` : ""}`], ["seguimiento", "Seguimiento"], ["agenda", `Agenda${pendientesAgenda(p.id) ? ` <span class="badge">${pendientesAgenda(p.id)}</span>` : ""}`], ["ficha", "Ficha"]];
  $("#view").innerHTML = `
    <section class="pry-head">
      <a class="back" href="#/">‹ ${MODOS[S.modo].lista}</a>
      <div class="row"><span class="folio">${esc(p.folio)}</span><span class="chip ${p.estatus === "SUSPENDIDO" ? "bad" : "info"}">${esc(ESTATUS[p.estatus] || p.estatus)}</span></div>
      <h1>${esc(p.nombre)}</h1>
      <p class="muted sm">${esc(FASES[p.fase] || "")} · El momento del proyecto lo valida el administrador en el panel.</p>
    </section>
    <nav class="tabs">${tabs.map(([k, t]) => `<button class="${S.tab === k ? "on" : ""}" data-tab="${k}">${t}</button>`).join("")}</nav>
    <section id="tabBody">${{ checklist: vistaChecklist, seguimiento: vistaSeguimiento, agenda: vistaAgenda, ficha: vistaFicha }[S.tab]()}</section>`;
}

// ── Curva de avance del expediente ───────────────────────────
// Planificada: requerimientos aplicables acumulados por fecha compromiso.
// Real: requerimientos validados acumulados por fecha de validación.
// Sólo ve el alcance que ya trae S.det.checklist (el servidor filtra por rol).
const DIA_MS = 86400000;
const diaDe = v => { const d = new Date(v); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
const CURVA = { d: null, sel: null, pid: null };

function curvaDatos(items, fechaProy) {
  const aplic = items.filter(x => x.estado !== "NO_APLICA");
  const N = aplic.length;
  if (!N) return null;
  const plan = aplic.filter(x => x.fechaCompromiso).map(x => diaDe(x.fechaCompromiso));
  const real = aplic.filter(x => x.estado === "VALIDADO" && x.fechaValidacion).map(x => diaDe(x.fechaValidacion));
  const hoy = diaDe(new Date());
  const pf = fechaProy ? diaDe(fechaProy) : null;
  const todas = [...plan, ...real, hoy, ...(pf ? [pf] : [])];
  const ini = Math.min(...todas), fin = Math.max(...todas);
  const paso = Math.max(DIA_MS, Math.ceil((fin - ini) / 60 / DIA_MS) * DIA_MS);
  const ts = [];
  for (let t = ini; t <= fin; t += paso) ts.push(t);
  if (ts[ts.length - 1] !== fin) ts.push(fin);
  const cuenta = (lista, t) => lista.filter(v => v <= t).length;
  const serie = ts.map(t => ({ t, plan: cuenta(plan, t), real: t <= hoy ? cuenta(real, t) : null }));
  return { N, ini, fin, hoy, pf, serie, items: aplic, W: 640, H: 210, L: 36, R: 12, T: 14, B: 26 };
}

function curvaHTML(items, p) {
  if (CURVA.pid !== p.id) { CURVA.pid = p.id; CURVA.sel = null; }
  const c = curvaDatos(items, p.fechaCompromiso);
  if (!c) return "";
  CURVA.d = c;
  const X = t => c.L + (t - c.ini) / Math.max(1, c.fin - c.ini) * (c.W - c.L - c.R);
  const Y = n => c.H - c.B - (n / c.N) * (c.H - c.B - c.T);
  const ruta = k => {
    let d = "", abre = false;
    for (const s of c.serie) {
      if (s[k] === null) break;
      d += `${abre ? "L" : "M"}${X(s.t).toFixed(1)},${Y(s[k]).toFixed(1)} `;
      abre = true;
    }
    return d;
  };
  const yArriba = c.H - c.B, xDer = c.W - c.R;
  const banda = c.pf ? (() => {
    const x0 = X(Math.max(c.ini, c.pf - 15 * DIA_MS)), x1 = X(c.pf);
    return `<rect x="${x0.toFixed(1)}" y="${c.T}" width="${Math.max(0, x1 - x0).toFixed(1)}" height="${yArriba - c.T}" fill="rgba(201,138,18,.14)"/>`;
  })() : "";
  const linea = c.pf ? `<line x1="${X(c.pf).toFixed(1)}" x2="${X(c.pf).toFixed(1)}" y1="${c.T}" y2="${yArriba}" stroke="#15253d" stroke-dasharray="4 3"/>
    <text x="${(X(c.pf) - 4).toFixed(1)}" y="${c.T + 10}" text-anchor="end" font-size="10" fill="#15253d">Expediente ${esc(fecha(p.fechaCompromiso))}</text>` : "";
  const hoyX = X(c.hoy).toFixed(1);
  const ejes = [0, c.N / 2, c.N].map(n => `<line x1="${c.L}" x2="${xDer}" y1="${Y(n).toFixed(1)}" y2="${Y(n).toFixed(1)}" stroke="#e9eef5"/>
    <text x="${c.L - 6}" y="${(Y(n) + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="#748096">${Math.round(n)}</text>`).join("");
  const etqX = `<text x="${c.L}" y="${c.H - 8}" font-size="10" fill="#748096">${esc(fecha(c.ini))}</text>
    <text x="${xDer}" y="${c.H - 8}" text-anchor="end" font-size="10" fill="#748096">${esc(fecha(c.fin))}</text>`;
  const pct = Math.round(c.serie[c.serie.length - 1].real / c.N * 100);
  return `<div class="curva-box">
    <div class="row"><b>Avance del expediente</b><span class="muted sm">Planificado vs. real · ${c.N} requerimientos aplicables</span></div>
    <div class="curva-wrap" id="curvaWrap">
      <svg viewBox="0 0 ${c.W} ${c.H}" class="curva" role="img" aria-label="Curva de avance">
        ${ejes}${banda}${linea}
        <line x1="${hoyX}" x2="${hoyX}" y1="${c.T}" y2="${yArriba}" stroke="#748096" stroke-width=".8"/>
        <path d="${ruta("plan")}" fill="none" stroke="#748096" stroke-width="1.6" stroke-dasharray="5 4"/>
        <path d="${ruta("real")}" fill="none" stroke="#2478d2" stroke-width="2.4"/>
        ${etqX}
        <rect x="${c.L}" y="${c.T}" width="${c.W - c.L - c.R}" height="${yArriba - c.T}" fill="transparent" style="cursor:pointer" onpointermove="curvaMover(event)" onpointerdown="curvaClic(event)" onpointerleave="curvaSalir()"/>
      </svg>
      <div class="curva-tip" id="curvaTip" hidden></div>
    </div>
    <div class="curva-leyenda sm muted"><span><i class="sw sw-plan"></i>Planificado (fecha compromiso)</span><span><i class="sw sw-real"></i>Real (fecha de validación)</span><span><i class="sw sw-exp"></i>Expediente (${esc(fecha(p.fechaCompromiso))})</span><span>${pct}% validado hoy</span></div>
    <div id="curvaDet">${curvaDetalle()}</div>
  </div>`;
}

function curvaPunto(e) {
  const c = CURVA.d, svg = e.currentTarget.ownerSVGElement, r = svg.getBoundingClientRect();
  const px = (e.clientX - r.left) / r.width * c.W;
  const t = c.ini + (px - c.L) / Math.max(1, c.W - c.L - c.R) * Math.max(1, c.fin - c.ini);
  let s = c.serie[0];
  for (const q of c.serie) if (Math.abs(q.t - t) < Math.abs(s.t - t)) s = q;
  return s;
}
function curvaMover(e) {
  const c = CURVA.d, s = curvaPunto(e), tip = $("#curvaTip"), w = $("#curvaWrap").getBoundingClientRect();
  tip.hidden = false;
  tip.innerHTML = `<b>${esc(fecha(s.t))}</b><br>Planificado: ${s.plan} de ${c.N}${s.real !== null ? `<br>Validado: ${s.real} de ${c.N}` : ""}`;
  tip.style.left = `${Math.min(w.width - 170, Math.max(0, e.clientX - w.left + 10))}px`;
}
function curvaSalir() { const tip = $("#curvaTip"); if (tip) tip.hidden = true; }
function curvaClic(e) {
  const s = curvaPunto(e);
  curvaMover(e);
  CURVA.sel = CURVA.sel === s.t ? null : s.t;
  const el = $("#curvaDet"); if (el) el.innerHTML = curvaDetalle();
}
function curvaDetalle() {
  if (!CURVA.d || CURVA.sel === null) return "";
  const c = CURVA.d, t = CURVA.sel;
  const pend = c.items
    .filter(x => x.estado !== "VALIDADO" && x.fechaCompromiso && diaDe(x.fechaCompromiso) <= t)
    .sort((a, b) => diaDe(a.fechaCompromiso) - diaDe(b.fechaCompromiso));
  return `<div class="curva-det"><b>Al ${esc(fecha(t))}: ${pend.length} sin validar</b>
    ${pend.length ? `<ul>${pend.map(x => `<li><b>${esc(x.etiqueta)}</b> <span class="muted sm">· ${esc(insEtq(x.instanciaId) || "Sin instancia")} · compromiso ${esc(fecha(x.fechaCompromiso))} · ${esc(ESTADOS[x.estado]?.t || x.estado)}</span></li>`).join("")}</ul>` : `<p class="muted sm">Nada pendiente a esa fecha.</p>`}
  </div>`;
}

// ── Checklist · tabla con detalle (v0.7.0) ───────────────────
// Folio de registro: sólo el número (001); el folio del proyecto ya identifica el expediente.
const folioRegistro = (f, i) => { const m = /(\d+)$/.exec(String(f || "")); return (m ? m[1] : String(i + 1)).padStart(3, "0"); };
const COLS_REQ = [
  { id: "folio", t: "Folio", v: (x, i) => folioRegistro(x.folio, i) },
  { id: "etiqueta", t: "Requerimiento", v: x => x.etiqueta },
  { id: "instancia", t: "Instancia", v: x => insEtq(x.instanciaId) || "Sin instancia" },
  { id: "categoria", t: "Cat.", v: x => x.categoria ? String(x.categoria) : "—", n: true },
  { id: "documento", t: "Tipo de acreditación", v: x => x.tipoDocumentoClave ? tipoDoc(x.tipoDocumentoClave) : "—" },
  { id: "compromiso", t: "Compromiso", v: x => fecha(x.fechaCompromiso) },
  { id: "estado", t: "Estado", v: x => (ESTADOS[x.estado] || { t: x.estado }).t },
  { id: "semaforo", t: "Plazo", v: x => x.semaforo === "VENCIDO" ? "Vencido" : x.semaforo === "POR_VENCER" ? "Por vencer" : "En tiempo" },
  { id: "obs", t: "Obs.", v: x => String(x.observaciones || 0), n: true },
  { id: "actualiza", t: "Última actualización", v: x => fechaHora(x.ultimaActualizacion) }
];

function reqFiltrados(items) {
  const q = norm(S.reqQ || "").trim();
  const f = S.reqF || {};
  return items.filter(x => {
    if (S.filtroReq === "REVISAR" && x.estado !== "ENTREGADO") return false;
    if (S.filtroReq === "VENCIDOS" && x.semaforo !== "VENCIDO") return false;
    if (S.filtroReq === "ABIERTOS" && ["VALIDADO", "NO_APLICA"].includes(x.estado)) return false;
    if (f.estado && x.estado !== f.estado) return false;
    if (f.inst && x.instanciaId !== f.inst) return false;
    if (f.cat && String(x.categoria || "") !== f.cat) return false;
    if (f.venc && x.semaforo !== f.venc) return false;
    if (q && !norm(COLS_REQ.map(c => c.v(x, 0)).join(" ")).includes(q)) return false;
    return true;
  });
}
const textoFiltroReq = () => {
  const f = S.reqF || {}, p = [];
  if (S.reqQ) p.push(`Búsqueda: ${S.reqQ}`);
  if (f.estado) p.push(`Estado: ${ESTADOS[f.estado]?.t || f.estado}`);
  if (f.inst) p.push(`Instancia: ${insEtq(f.inst)}`);
  if (f.cat) p.push(`Categoría ${f.cat}`);
  if (f.venc) p.push(f.venc === "VENCIDO" ? "Vencidos" : "Por vencer");
  return p.join(" · ");
};

function tablaReq() {
  const items = S.det.checklist;
  const lista = reqFiltrados(items);
  const cols = COLS_REQ.filter(c => S.reqCols.includes(c.id));
  if (!lista.length) return `<div class="empty">Nada con este filtro.</div>`;
  const clasesCelda = (c, x) => [
    c.n ? "num" : "",
    c.id === "folio" ? "t-folio" : "",
    c.id === "etiqueta" ? "t-req" : "",
    ["compromiso", "actualiza", "folio", "categoria", "obs"].includes(c.id) ? "t-nw" : "",
    c.id === "semaforo" && x.semaforo === "VENCIDO" ? "t-bad" : "",
    c.id === "semaforo" && x.semaforo === "POR_VENCER" ? "t-amber" : ""
  ].filter(Boolean).join(" ");
  const filas = lista.map((x, i) => `<tr data-rq="${esc(x.id)}" class="${x.semaforo === "VENCIDO" ? "vencido" : ""}${S.reqSel === x.id ? " sel" : ""}">
    ${cols.map(c => c.id === "estado"
      ? `<td class="t-nw"><span class="chip ${(ESTADOS[x.estado] || {}).c || ""}">${esc(c.v(x, i))}</span></td>`
      : `<td class="${clasesCelda(c, x)}">${esc(c.v(x, i))}</td>`).join("")}
  </tr>`).join("");
  return `<div class="rtable"><table><thead><tr>${cols.map(c => `<th class="${c.n ? "num" : ""}${c.id === "folio" ? " t-folio" : ""}">${esc(c.t)}</th>`).join("")}</tr></thead><tbody>${filas}</tbody></table></div>
    <p class="rt-pie">${lista.length} de ${items.length} requerimientos · clic en una fila para ver el detalle y las acciones</p>`;
}
function pintarReqTabla() { const el = $("#reqTabla"); if (el) el.innerHTML = tablaReq(); }

function vistaChecklist() {
  const items = S.det.checklist;
  const p = S.det.proyecto;
  const c = p.checklist || {};
  const pct = c.aplicables ? Math.round((c.validados / c.aplicables) * 100) : 0;
  const filtros = [["TODOS", "Todos"], ["REVISAR", "Por revisar"], ["VENCIDOS", "Vencidos"], ["ABIERTOS", "Sin validar"]];
  const banner = S.modo !== "OPERACION" ? "" : !editable() ? (p.fase === "PREVISION" ? "" : `<div class="note-box">El checklist sólo se trabaja mientras el proyecto está En integración. Momento actual: <b>${esc(ESTATUS[p.estatus] || p.estatus)}</b>.</div>`)
    : (c.aplicables && c.validados === c.aplicables ? `<div class="note-box ok">Checklist completo. El administrador puede validar el expediente en el panel.</div>` : "");
  if (!items.length) return `${banner}<div class="empty">Sin requerimientos en la parrilla.</div>`;
  const f = S.reqF;
  const instancias = [...new Set(items.map(x => x.instanciaId).filter(Boolean))];
  const cols = COLS_REQ.map(c => `<label class="check"><input type="checkbox" data-rcol="${c.id}" ${S.reqCols.includes(c.id) ? "checked" : ""}> ${esc(c.t)}</label>`).join("");
  const indicadores = S.indMin
    ? `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin-bottom:10px"><span class="sm"><b>${pct}%</b> <span class="muted">· ${c.validados} de ${c.aplicables} validados</span></span><div class="bar" style="flex:1;min-width:140px;margin:0"><span style="width:${pct}%"></span></div><button class="btn sm ghost" data-indmin="0">Mostrar indicadores</button></div>`
    : `<div style="display:flex;justify-content:flex-end;margin-bottom:4px"><button class="btn sm ghost" data-indmin="1">Ocultar indicadores</button></div>
    ${curvaHTML(items, p)}
    <div class="progress"><div class="row"><b>${pct}%</b><span class="muted sm">${c.validados} de ${c.aplicables} requerimientos aplicables validados</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>`;
  return `${banner}
    ${indicadores}
    <nav class="seg sm">${filtros.map(([k, t]) => `<button class="${S.filtroReq === k ? "on" : ""}" data-freq="${k}">${t}</button>`).join("")}</nav>
    <div class="rt-bar">
      <label class="rt-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 14l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" id="reqQ" placeholder="Buscar folio, requerimiento o instancia" value="${esc(S.reqQ || "")}"></label>
      <div class="rt-filtros">
        <select data-rf="estado" class="rt-sel" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${f.estado === k ? "selected" : ""}>${esc(v.t)}</option>`).join("")}</select>
        <select data-rf="inst" class="rt-sel" aria-label="Instancia"><option value="">Todas las instancias</option>${instancias.map(id => `<option value="${esc(id)}" ${f.inst === id ? "selected" : ""}>${esc(insEtq(id))}</option>`).join("")}</select>
        <select data-rf="cat" class="rt-sel" aria-label="Categoría"><option value="">Todas las categorías</option>${[1, 2, 3].map(n => `<option value="${n}" ${f.cat === String(n) ? "selected" : ""}>Categoría ${n}</option>`).join("")}</select>
        <select data-rf="venc" class="rt-sel" aria-label="Plazo"><option value="">Cualquier plazo</option><option value="VENCIDO" ${f.venc === "VENCIDO" ? "selected" : ""}>Vencidos</option><option value="POR_VENCER" ${f.venc === "POR_VENCER" ? "selected" : ""}>Por vencer</option></select>
      </div>
      <div class="rt-acc">
        ${editable() ? `<button class="rt-btn" data-nuevoreq>Agregar requerimiento</button>` : ""}
        <button class="rt-btn" data-rcols>Columnas</button>
        <button class="rt-btn" data-rexp="xls">Excel</button>
        <button class="rt-btn rt-pri" data-rexp="pdf">PDF</button>
      </div>
    </div>
    <div class="rcols" id="rcols" hidden>${cols}</div>
    <div id="reqTabla">${tablaReq()}</div>`;
}

function detalleReqHTML(x) {
  const e = ESTADOS[x.estado] || { t: x.estado, c: "" };
  const vig = x.archivos.find(a => a.vigente);
  const trans = editable() ? (S.ctx.reglas?.transiciones?.[x.estado] || []) : [];
  const puedeSubir = editable() && !["VALIDADO", "NO_APLICA"].includes(x.estado);
  const i = S.det.checklist.indexOf(x);
  const folio = folioRegistro(x.folio, i);
  const plazo = x.semaforo === "VENCIDO" ? "Vencido" : x.semaforo === "POR_VENCER" ? "Por vencer" : "En tiempo";
  const seg = (S.det.seguimiento || []).filter(s => s.referenciaId === x.id);
  const acciones = editable() ? `<div class="req-acc">
      ${puedeSubir ? `<button class="btn sm pri" data-subir="${esc(x.id)}">Subir documento</button>` : ""}
      ${trans.map(t => `<button class="btn sm ${ACCION[t]?.c || ""}" data-estado="${t}" data-req="${esc(x.id)}">${esc(ACCION[t]?.t || t)}</button>`).join("")}
      <button class="btn sm ${x.esperaDocumento ? "" : "ghost"}" data-espera="${x.esperaDocumento ? "0" : "1"}" data-req="${esc(x.id)}">${x.esperaDocumento ? "Quitar espera de documento" : "Espera documento"}</button>
      <button class="btn sm ghost" data-editar="${esc(x.id)}">Editar</button>
    </div>` : `<p class="muted sm">Consulta. Las acciones se hacen desde Operación, con el proyecto En integración.</p>`;
  const anotar = puedeAnotar() ? `<div class="req-nota">
      <textarea id="rqNota" rows="2" placeholder="Anotación sobre este requerimiento…"></textarea>
      <div class="req-nota-pie"><label class="check"><input type="checkbox" id="rqVis"> ${esc(etiquetaVisible(x.id))}</label>
      <button class="btn sm pri" data-regnota="${esc(x.id)}">Registrar</button></div>
    </div>` : "";
  const hist = seg.map(s => `<li><span class="muted xs">${fechaHora(s.fechaRegistro)} · ${esc(s.autorNombre)}${s.autorTipo === "CLIENTE" ? " (instancia)" : ""}${s.registradoEnNombreDe ? ` · en nombre de ${esc(s.registradoEnNombreDe)}` : ""}</span>${s.estadoNuevo ? ` <span class="chip ${(ESTADOS[s.estadoNuevo] || {}).c || "info"}">${esc((ESTADOS[s.estadoNuevo] || {}).t || s.estadoNuevo)}</span>` : ""}<p>${esc(s.nota)}</p></li>`).join("");
  return `<header class="req-top">
      <span class="req-top-meta">${esc(folio)} · ${esc(insEtq(x.instanciaId) || "Sin instancia")}${x.categoria ? ` · Cat. ${x.categoria}` : ""}</span>
      <h3>${esc(x.etiqueta)}</h3>
      <span class="chip">${esc(e.t)}</span>
    </header>
    <div class="req-body">
    ${acciones}
    <div class="req-cols">
      <dl class="kv">
        <dt>Compromiso</dt><dd>${fecha(x.fechaCompromiso)} · ${esc(plazo)}</dd>
        ${x.esperaDocumento ? `<dt>Carga</dt><dd><span class="chip warn">Espera carga de documento</span></dd>` : ""}
        <dt>Tipo de acreditación</dt><dd>${esc(x.tipoDocumentoClave ? tipoDoc(x.tipoDocumentoClave) : "—")}</dd>
        <dt>Observaciones</dt><dd>${x.observaciones || 0}</dd>
        <dt>Última actualización</dt><dd>${x.ultimaActualizacion ? `${esc(fechaHora(x.ultimaActualizacion))}${x.ultimaActualizacionPorNombre ? ` · ${esc(x.ultimaActualizacionPorNombre)}` : ""}` : "—"}</dd>
        ${x.descripcion ? `<dt>Descripción</dt><dd>${esc(x.descripcion)}</dd>` : ""}
        ${x.estado === "NO_APLICA" && x.justificacionNoAplica ? `<dt>No aplica</dt><dd>${esc(x.justificacionNoAplica)}</dd>` : ""}
      </dl>
      <div class="req-doc">
        ${vig ? `<div class="file"><span class="ico">📄</span><div><b>${esc(vig.nombre)}</b><span class="muted sm">v${vig.version} · ${tamano(vig.tamano)} · ${fecha(vig.fechaCarga)}${vig.cargadoEnNombreDe ? ` · en nombre de ${esc(vig.cargadoEnNombreDe)}` : ""}</span></div><button class="btn sm" data-ver="${esc(vig.id)}">Ver</button></div>` : `<p class="muted sm">Sin documento cargado.</p>`}
        ${x.archivos.length > 1 ? `<details class="sm"><summary>${x.archivos.length - 1} versión(es) anterior(es)</summary>${x.archivos.filter(a => !a.vigente).map(a => `<div class="row"><span>v${a.version} · ${esc(a.nombre)} · ${fecha(a.fechaCarga)}</span><button class="btn xs" data-ver="${esc(a.id)}">Ver</button></div>`).join("")}</details>` : ""}
      </div>
    </div>
    <div class="req-seg">
      <h4>Seguimiento del requerimiento</h4>
      ${anotar}
      <ul class="pro-hist">${hist || `<li class="muted sm">Sin anotaciones todavía.</li>`}</ul>
    </div>
    </div>`;
}
const TIPO_INS_CAT = { 1: "que otorga", 2: "intermedia", 3: "gestora" };
function etiquetaVisible(prqId) {
  const x = prqId ? reqPorId(prqId) : null;
  const i = x ? ins(x.instanciaId) : null;
  const c = Number(i?.categoria);
  return TIPO_INS_CAT[c] ? `Visible para la instancia ${TIPO_INS_CAT[c]} (Cat. ${c})` : "Visible para la instancia";
}
function dlgDetalleReq(id) {
  const x = reqPorId(id);
  if (!x) return;
  S.reqSel = id;
  pintarReqTabla();
  $("#dlg").classList.add("req");
  dialogo(detalleReqHTML(x), null, { sinPie: true });
}
async function anotarReq(id) {
  const nota = ($("#rqNota")?.value || "").trim();
  if (!nota) { aviso("Escribe la anotación.", "bad"); return; }
  const r = await tarea(() => api("ANOTAR", { proyectoId: S.det.proyecto.id, prqId: id, nota, visibleCliente: $("#rqVis")?.checked === true }));
  if (!r) return;
  aviso(r.mensaje || "Anotación registrada.");
  await abrirProyecto(S.det.proyecto.id, { silencioso: true });
  dlgDetalleReq(id);
}

// ── Exportar requerimientos (Excel y PDF) ────────────────────
function descargarArchivo(blob, nombre) {
  const u = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = u; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
const hoyYmd = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; };
function matrizReq() {
  const cols = COLS_REQ.filter(c => S.reqCols.includes(c.id));
  const lista = reqFiltrados(S.det.checklist);
  return { cols, headers: cols.map(c => c.t), rows: lista.map((x, i) => cols.map(c => String(c.v(x, i)))) };
}
async function cargarJsPdfApp() {
  if (window.jspdf?.jsPDF?.API?.autoTable) return window.jspdf.jsPDF;
  const js = src => new Promise((ok, mal) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => mal(new Error("No fue posible cargar el generador PDF.")); document.head.appendChild(s); });
  if (!window.jspdf?.jsPDF) await js("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js");
  await js("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.4/dist/jspdf.plugin.autotable.min.js");
  return window.jspdf.jsPDF;
}
async function exportarReq(tipo) {
  const m = matrizReq();
  if (!m.rows.length) { aviso("No hay requerimientos para exportar.", "bad"); return; }
  const p = S.det.proyecto;
  const titulo = `Requerimientos · ${p.folio} · ${p.nombre}`;
  const filtros = textoFiltroReq();
  const base = `Requerimientos_${p.folio}_${hoyYmd()}`;
  if (tipo === "xls") {
    const n = m.headers.length;
    const tr = r => `<tr>${r.map((v, k) => `<td${m.cols[k].n ? ' style="text-align:right"' : ""}>${esc(v)}</td>`).join("")}</tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>
      <tr><th colspan="${n}" style="font-size:14pt;text-align:left">${esc(titulo)}</th></tr>
      <tr><td colspan="${n}">Generado por ${esc(usr().nombreVisible || usr().nombre || "")} · ${esc(new Date().toLocaleString("es-MX"))}</td></tr>
      <tr><td colspan="${n}">${esc(filtros || "Sin filtros")}</td></tr>
      <tr>${m.headers.map(h => `<th style="background:#15253d;color:#fff">${esc(h)}</th>`).join("")}</tr>${m.rows.map(tr).join("")}</table></body></html>`;
    descargarArchivo(new Blob(["", html], { type: "application/vnd.ms-excel;charset=utf-8" }), `${base}.xls`);
    return;
  }
  try {
    const JsPDF = await cargarJsPdfApp();
    const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    doc.setTextColor(21, 37, 61); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(titulo, 14, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`Generado por ${usr().nombreVisible || usr().nombre || ""} · ${new Date().toLocaleString("es-MX")}`, 14, 21);
    if (filtros) doc.text(filtros, 14, 25);
    doc.autoTable({
      head: [m.headers], body: m.rows, startY: filtros ? 29 : 25, margin: { left: 14, right: 14 }, theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak", lineColor: [226, 232, 240] },
      headStyles: { fillColor: [21, 37, 61], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      didDrawPage: () => { doc.setFontSize(7); doc.setTextColor(150); doc.text(`SCaD Gestión · Página ${doc.internal.getNumberOfPages()}`, W - 14, doc.internal.pageSize.getHeight() - 7, { align: "right" }); }
    });
    doc.save(`${base}.pdf`);
  } catch (e) { aviso(e.message || "No fue posible generar el PDF.", "bad"); }
}

const SEG_TIPO = { ANOTACION: "Anotación", CAMBIO_ESTADO: "Cambio de estado", ACTIVIDAD_CUMPLIDA: "Actividad cumplida", RESULTADO_OTORGANTE: "Resultado" };
const SEG_COLS = [
  { id: "fecha", t: "Fecha", v: s => fechaHora(s.fechaRegistro) },
  { id: "autor", t: "Autor", v: s => `${s.autorNombre || ""}${s.autorTipo === "CLIENTE" ? " (instancia)" : ""}` },
  { id: "tipo", t: "Tipo", v: s => s.tipo === "CAMBIO_ESTADO" && s.estadoNuevo ? `Cambio de estado: ${(ESTADOS[s.estadoNuevo] || {}).t || s.estadoNuevo}` : (SEG_TIPO[s.tipo] || s.tipo || "") },
  { id: "ref", t: "Referencia", v: s => s.referenciaEtiqueta || "Proyecto en general" },
  { id: "actividad", t: "Actividad", v: s => s.actividadEtiqueta || "" },
  { id: "visible", t: "Visible para instancia", v: s => s.visibleCliente ? "Sí" : "No" },
  { id: "nota", t: "Anotación", v: s => s.nota || "" }
];
function segFiltrados(lista) {
  const q = norm(S.segQ || "").trim();
  return q ? lista.filter(s => norm(SEG_COLS.map(c => c.v(s)).join(" ")).includes(q)) : lista;
}
function tablaSeg() {
  const h = S.det.seguimiento || [];
  if (!h.length) return `<div class="empty">Sin anotaciones.</div>`;
  const lista = segFiltrados(h);
  if (!lista.length) return `<div class="empty">Ninguna anotación coincide con la búsqueda.</div>`;
  const cols = SEG_COLS.filter(c => S.segCols.includes(c.id));
  const filas = lista.map((s, i) => `<tr><td style="width:40px;text-align:center;color:#9aa6b6;font-size:11px;font-weight:400;font-variant-numeric:tabular-nums">${i + 1}</td>${cols.map(c => `<td class="${c.id === "fecha" ? "t-nw" : ""}${c.id === "nota" ? " t-req" : ""}">${esc(c.v(s))}</td>`).join("")}</tr>`).join("");
  return `<div class="rtable"><table><thead><tr><th style="width:40px;text-align:center;color:#9aa6b6;font-weight:400;font-size:11px">No.</th>${cols.map(c => `<th>${esc(c.t)}</th>`).join("")}</tr></thead><tbody>${filas}</tbody></table></div>
    <p class="rt-pie">${lista.length} de ${h.length} anotaciones</p>`;
}
function pintarSegTabla() { const el = $("#segTabla"); if (el) el.innerHTML = tablaSeg(); }
function barraSeg() {
  const cols = SEG_COLS.map(c => `<label class="check"><input type="checkbox" data-scol="${c.id}" ${S.segCols.includes(c.id) ? "checked" : ""}> ${esc(c.t)}</label>`).join("");
  return `<div class="rt-bar">
      <label class="rt-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 14l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" id="segQ" placeholder="Buscar en el seguimiento" value="${esc(S.segQ || "")}"><button type="button" data-segx aria-label="Limpiar búsqueda" title="Limpiar" ${S.segQ ? "" : "hidden"} style="flex:0 0 auto;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:#eef2f7;color:#5b6b80;font-size:15px;line-height:22px;cursor:pointer">×</button></label>
      <div class="rt-acc">
        <button class="rt-btn" data-scols>Columnas</button>
        <button class="rt-btn" data-sexp="xls">Excel</button>
        <button class="rt-btn rt-pri" data-sexp="pdf">PDF</button>
      </div>
    </div>
    <div class="rcols" id="scols" hidden>${cols}</div>`;
}
function matrizSeg() {
  const lista = segFiltrados(S.det.seguimiento || []);
  const cols = SEG_COLS.filter(c => S.segCols.includes(c.id));
  return { cols, headers: ["No.", ...cols.map(c => c.t)], rows: lista.map((s, i) => [String(i + 1), ...cols.map(c => String(c.v(s)))]) };
}
async function exportarSeg(tipo) {
  const m = matrizSeg();
  if (!m.rows.length) { aviso("No hay anotaciones para exportar.", "bad"); return; }
  const p = S.det.proyecto;
  const titulo = `Seguimiento · ${p.folio} · ${p.nombre}`;
  const filtros = S.segQ ? `Búsqueda: ${S.segQ}` : "";
  const base = `Seguimiento_${p.folio}_${hoyYmd()}`;
  if (tipo === "xls") {
    const n = m.headers.length;
    const tr = r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>
      <tr><th colspan="${n}" style="font-size:14pt;text-align:left">${esc(titulo)}</th></tr>
      <tr><td colspan="${n}">Generado por ${esc(usr().nombreVisible || usr().nombre || "")} · ${esc(new Date().toLocaleString("es-MX"))}</td></tr>
      <tr><td colspan="${n}">${esc(filtros || "Sin filtros")}</td></tr>
      <tr>${m.headers.map(h => `<th style="background:#15253d;color:#fff">${esc(h)}</th>`).join("")}</tr>${m.rows.map(tr).join("")}</table></body></html>`;
    descargarArchivo(new Blob(["", html], { type: "application/vnd.ms-excel;charset=utf-8" }), `${base}.xls`);
    return;
  }
  try {
    const JsPDF = await cargarJsPdfApp();
    const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
    const W = doc.internal.pageSize.getWidth();
    doc.setTextColor(21, 37, 61); doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.text(titulo, 14, 15);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`Generado por ${usr().nombreVisible || usr().nombre || ""} · ${new Date().toLocaleString("es-MX")}`, 14, 21);
    if (filtros) doc.text(filtros, 14, 25);
    doc.autoTable({
      head: [m.headers], body: m.rows, startY: filtros ? 29 : 25, margin: { left: 14, right: 14 }, theme: "grid",
      styles: { fontSize: 7.5, cellPadding: 1.6, overflow: "linebreak", lineColor: [226, 232, 240] },
      headStyles: { fillColor: [21, 37, 61], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 249, 252] },
      columnStyles: { 0: { halign: "center", cellWidth: 12, textColor: [150, 160, 175] } },
      didDrawPage: () => { doc.setFontSize(7); doc.setTextColor(150); doc.text(`SCaD Gestión · Página ${doc.internal.getNumberOfPages()}`, W - 14, doc.internal.pageSize.getHeight() - 7, { align: "right" }); }
    });
    doc.save(`${base}.pdf`);
  } catch (e) { aviso(e.message || "No fue posible generar el PDF.", "bad"); }
}

function vistaSeguimiento() {
  const p = S.det.proyecto;
  const h = S.det.seguimiento;
  const abierto = puedeAnotar();
  return `${abierto ? `<div class="card compose">
      <textarea id="segNota" rows="3" placeholder="Escribe una anotación del proyecto: gestiones, acuerdos, llamadas…"></textarea>
      <div class="row wrap">
        <select id="segReq"><option value="">Proyecto en general</option>${S.det.checklist.map(x => `<option value="${esc(x.id)}">${esc(x.etiqueta)}</option>`).join("")}</select>
        ${actsDe(p.id).length ? `<select id="segAct"><option value="">Sin relacionar con actividad</option>${actsDe(p.id).map(a => `<option value="${esc(idDe(a))}" data-cumplible="${puedeCumplir(a) ? 1 : ""}">${esc(fechaCorta(a))} · ${esc(titulo(a))}${cumplida(a) ? " (cumplida)" : ""}</option>`).join("")}</select>` : ""}
      </div>
      <div class="row wrap">
        <label class="check" id="segCumpleBox" hidden><input type="checkbox" id="segCumple"> Da por cumplida la actividad</label>
        <label class="check"><input type="checkbox" id="segVis"> <span id="segVisTxt">${esc(etiquetaVisible(""))}</span></label>
        <button class="btn pri" data-act="anotarGeneral">Registrar</button>
      </div></div>` : ""}
    ${barraSeg()}
    <div id="segTabla">${tablaSeg()}</div>`;
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

// ── Actividades: requeridas (ADM) y propias (colaborador) ────
// Los permisos por actividad (puedeEditar / puedeCumplir / puedePromover) los decide el backend.
const flag = (a, k) => a?.[k] === true;
const enEscritura = () => S.modo !== "INSTANCIA";
const misProyectos = () => (S.modo === "OPERACION" || (esAdm() && S.modo === "DIRECCION")) ? S.proyectos.filter(p => p.fase !== "CERRADO") : [];
const tiposActividad = () => S.ctx?.catalogos?.tiposActividad || [];
const puedeProgramar = () => enEscritura() && S.ctx?.programacion?.puedeProgramar === true && (esAdm() || misProyectos().length > 0);
const puedeEditar = a => enEscritura() && !cumplida(a) && flag(a, "puedeEditar");
const puedeCumplir = a => enEscritura() && programada(a) && flag(a, "puedeCumplir");
const puedePromover = a => enEscritura() && esAdm() && origenDe(a) === "USUARIO" && flag(a, "puedePromover");
const actsDe = pid => actividades(S.ctx).filter(a => a.proyectoId === pid).sort((x, y) => inicio(x) - inicio(y));
const pendientesAgenda = pid => actsDe(pid).filter(sinCumplir).length;
const fechaCorta = a => { const d = inicio(a); return isNaN(d) ? "Sin fecha" : d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" }) + (todoDia(a) ? "" : " " + hora(a)); };
const pryEtq = a => { const p = S.proyectos.find(x => x.id === a.proyectoId); return a.proyectoFolio || p?.folio ? `${a.proyectoFolio || p.folio} · ${a.proyectoNombre || p?.nombre || ""}` : (a.proyectoNombre || ""); };

async function recargarActividades() {
  try { const c = await contexto(); S.ctx = c; setContexto(c); } catch (_) { /* se conserva lo que había */ }
  repintarProgramacion(S.ctx);
}
async function trasActividad(r) {
  if (!r) return;
  cerrarDialogo();
  await recargarActividades();
  if (S.det) await abrirProyecto(S.det.proyecto.id, { silencioso: true });
  else if (!/^#\/programacion/.test(location.hash)) pintarLista();
}

function vistaAgenda() {
  const p = S.det.proyecto;
  const L = actsDe(p.id);
  const puede = puedeProgramar() && p.fase !== "CERRADO" && misProyectos().some(x => x.id === p.id);
  return `<div class="row agenda-head"><p class="muted sm">Requeridas por el administrador y propias del equipo del proyecto.</p>${puede ? `<button type="button" class="btn pri sm" data-programar="${esc(p.id)}">+ Programar actividad</button>` : ""}</div>
    ${listaHtml(L, "Sin actividades para este proyecto.")}`;
}

function dlgActividad(id) {
  const a = buscarActividad(id);
  if (!a) { aviso("La actividad ya no está disponible.", "bad"); return; }
  const s = inicio(a), e = fin(a), propia = origenDe(a) === "USUARIO";
  const cuando = isNaN(s) ? "—" : todoDia(a) ? s.toLocaleDateString("es-MX", { dateStyle: "full" }) + " · Todo el día" : s.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" });
  const fila = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  const estado = cumplida(a) ? `<span class="chip ok">Cumplida</span>` : sinCumplir(a) ? `<span class="chip bad">Sin cumplir</span>` : programada(a) ? `<span class="chip info">Programada</span>` : "";
  const acciones = [
    puedeCumplir(a) ? `<button class="btn pri" data-act-accion="cumplir" data-act-id="${esc(idDe(a))}">Marcar cumplida</button>` : "",
    puedeEditar(a) ? `<button class="btn" data-act-accion="editar" data-act-id="${esc(idDe(a))}">Editar</button>` : "",
    puedeEditar(a) ? `<button class="btn bad" data-act-accion="eliminar" data-act-id="${esc(idDe(a))}">Eliminar</button>` : "",
    puedePromover(a) ? `<button class="btn" data-act-accion="promover" data-act-id="${esc(idDe(a))}">Convertir en requerida</button>` : "",
    a.proyectoId && S.proyectos.some(p => p.id === a.proyectoId) && S.det?.proyecto?.id !== a.proyectoId ? `<button class="btn ghost" data-act-accion="proyecto" data-act-id="${esc(idDe(a))}">Ver proyecto</button>` : ""
  ].filter(Boolean).join("");
  dialogo(`<div class="row wrap"><span class="chip ${propia ? "propia" : "req"}">${propia ? "Propia" : "Requerida"}</span><span class="chip" style="background:color-mix(in srgb,${colorDe(a)} 14%,#fff);color:${colorDe(a)}">${esc(tipoDe(a))}</span>${estado}</div>
    <h3>${esc(titulo(a))}</h3>
    <dl class="act-dl">
      ${fila("Proyecto", esc(pryEtq(a)) || (propia ? "" : "General de la EO"))}
      ${fila("Inicio", esc(cuando))}
      ${e && !isNaN(e) && !todoDia(a) ? fila("Término", esc(e.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" }))) : ""}
      ${fila("Lugar", esc(lugar(a)))}
      ${fila("Detalle", esc(detalle(a)))}
      ${a.enlace ? fila("Enlace", `<a href="${esc(a.enlace)}" target="_blank" rel="noopener noreferrer">Abrir ↗</a>`) : ""}
      ${fila(propia ? "Programó" : "Capturó", esc(a.creadoPorNombre || ""))}
      ${propia && a.visibleCliente && S.modo !== "INSTANCIA" ? fila("Visibilidad", "Visible para la instancia") : ""}
      ${cumplida(a) ? fila("Cumplimiento", esc([fecha(a.fechaCumplimiento), a.cumplidaPorNombre].filter(x => x && x !== "—").join(" · ")) + (a.notaCumplimiento ? `<br><span class="muted">${esc(a.notaCumplimiento)}</span>` : "")) : ""}
    </dl>

    ${acciones ? `<div class="act-acciones">${acciones}</div>` : ""}`, null, { textoCerrar: "Cerrar" });
}

function accionActividad(accion, id) {
  const a = buscarActividad(id);
  if (!a) return;
  if (accion === "cumplir") return dlgCumplir(a);
  if (accion === "editar") return dlgProgramar(a);
  if (accion === "proyecto") { cerrarDialogo(); S.tab = "agenda"; location.hash = `#/p/${a.proyectoId}`; return; }
  if (accion === "eliminar") return dialogo(`<h3>Eliminar actividad</h3><p>${esc(titulo(a))}</p><p class="muted sm">Se elimina de la programación. Esta acción no se puede deshacer.</p>`,
    () => tarea(() => api("ACT_ELIMINAR", { actividadId: a.id }), { mensajeOk: "Actividad eliminada." }).then(trasActividad), { textoBoton: "Eliminar", clase: "bad" });
  if (accion === "promover") return dialogo(`<h3>Convertir en requerida</h3><p>${esc(titulo(a))}</p><p class="muted sm">La actividad pasa a ser requerida para el proceso del proyecto: su autor ya no podrá editarla ni eliminarla y su cumplimiento corresponde al responsable.</p>`,
    () => tarea(() => api("ACT_PROMOVER", { actividadId: a.id }), { mensajeOk: "La actividad ahora es requerida." }).then(trasActividad), { textoBoton: "Convertir" });
}

function dlgCumplir(a) {
  dialogo(`<h3>Marcar cumplida</h3><p class="muted">${esc(titulo(a))} · ${esc(fechaCorta(a))}</p>
    <label class="f">Anotación (opcional)<textarea id="cNota" rows="3" placeholder="Resultado, acuerdos, asistentes…"></textarea></label>
    <label class="check"><input type="checkbox" id="cVis"> Visible para la instancia</label>
    <p class="muted xs">Queda registrada en el Seguimiento del proyecto.</p>`,
  () => tarea(() => api("ACT_CUMPLIR", { actividadId: a.id, nota: $("#cNota").value, visibleCliente: $("#cVis").checked }), { mensajeOk: "Actividad cumplida." }).then(trasActividad),
  { textoBoton: "Marcar cumplida" });
}

const hhmm = d => isNaN(d) ? "" : `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
function dlgProgramar(a = null, proyectoId = "") {
  const P = misProyectos();
  const tipos = tiposActividad();
  if (!a && !puedeProgramar()) { aviso("Sólo puedes programar actividades en proyectos que tienes asignados.", "bad"); return; }
  if (!tipos.length) { aviso("No tienes tipos de actividad autorizados. El administrador los configura en Programación del panel.", "bad"); return; }
  const adm = esAdm();
  const pid = a ? (a.proyectoId || "") : (proyectoId || (P.length === 1 && !adm ? P[0].id : ""));
  const s = a ? inicio(a) : null, e = a ? fin(a) : null;
  const tipoSel = a ? tipoDe(a) : "";
  dialogo(`<h3>${a ? "Editar actividad" : "Programar actividad"}</h3>
    <p class="muted xs">${adm ? "Como administrador, la actividad queda como <b>requerida</b>." : "Actividad propia: organiza tu trabajo en el proyecto. Las requeridas las programa el administrador."}</p>
    <label class="f">Proyecto<select id="aPry" ${a ? "disabled" : ""}>${adm ? `<option value="">General de la EO (sin proyecto)</option>` : `<option value="">Elige un proyecto</option>`}${P.map(p => `<option value="${esc(p.id)}" ${p.id === pid ? "selected" : ""}>${esc(p.folio)} · ${esc(p.nombre)}</option>`).join("")}${a && a.proyectoId && !P.some(p => p.id === a.proyectoId) ? `<option selected>${esc(a.proyectoFolio || "Proyecto")}</option>` : ""}</select></label>
    <label class="f">Actividad<input id="aTit" maxlength="180" value="${esc(a ? titulo(a) : "")}" placeholder="Ej. Llamada con el enlace de SIOP"></label>
    <label class="f">Tipo<select id="aTipo">${tipos.map(t => `<option value="${esc(t.id)}" ${t.etiqueta === tipoSel ? "selected" : ""}>${esc(t.etiqueta)}</option>`).join("")}</select></label>
    <div class="grid3">
      <label class="f">Fecha<input type="date" id="aFecha" value="${s ? isoDia(s) : ""}"></label>
      <label class="f">Inicio<input type="time" id="aHoraIni" value="${s && !todoDia(a) ? hhmm(s) : ""}" ${a && todoDia(a) ? "disabled" : ""}></label>
      <label class="f">Término<input type="time" id="aHoraFin" value="${e && !todoDia(a) ? hhmm(e) : ""}" ${a && todoDia(a) ? "disabled" : ""}></label>
    </div>
    <label class="check"><input type="checkbox" id="aTodo" ${a && todoDia(a) ? "checked" : ""}> Todo el día</label>
    <label class="f">Lugar (opcional)<input id="aLugar" maxlength="240" value="${esc(a ? lugar(a) : "")}"></label>
    <label class="f">Detalle (opcional)<textarea id="aDet" rows="2">${esc(a ? detalle(a) : "")}</textarea></label>
    <label class="f">Enlace (opcional)<input id="aEnl" type="url" maxlength="500" value="${esc(a?.enlace || "")}" placeholder="https://"></label>
    <label class="check"><input type="checkbox" id="aVis" ${a?.visibleCliente ? "checked" : ""}> Visible para la instancia</label>`,
  () => {
    const fechaV = $("#aFecha").value, todo = $("#aTodo").checked, hi = $("#aHoraIni").value, hf = $("#aHoraFin").value;
    const datos = {
      actividadId: a?.id || "", proyectoId: a ? (a.proyectoId || "") : $("#aPry").value, titulo: $("#aTit").value.trim(), tipoId: $("#aTipo").value,
      todoElDia: todo, lugar: $("#aLugar").value.trim(), descripcion: $("#aDet").value.trim(), enlace: $("#aEnl").value.trim(), visibleCliente: $("#aVis").checked
    };
    if (!adm && !datos.proyectoId) { aviso("Elige el proyecto.", "bad"); return; }
    if (!datos.titulo) { aviso("Escribe el nombre de la actividad.", "bad"); return; }
    if (!fechaV || (!todo && !hi)) { aviso(todo ? "Indica la fecha." : "Indica la fecha y la hora de inicio.", "bad"); return; }
    if (datos.enlace && !/^https?:\/\//i.test(datos.enlace)) { aviso("El enlace debe iniciar con https://", "bad"); return; }
    const ini = new Date(`${fechaV}T${todo ? "00:00" : hi}`);
    const fn = !todo && hf ? new Date(`${fechaV}T${hf}`) : null;
    if (fn && fn <= ini) { aviso("La hora de término debe ser posterior al inicio.", "bad"); return; }
    datos.inicio = ini.toISOString();
    datos.fin = fn ? fn.toISOString() : "";
    return tarea(() => api("ACT_GUARDAR", datos), { mensajeOk: a ? "Actividad actualizada." : "Actividad programada." }).then(trasActividad);
  }, { textoBoton: a ? "Guardar" : "Programar" });
}

// ── Diálogos ─────────────────────────────────────────────────
let alEnviar = null;
function dialogo(html, enviar, { textoBoton = "Guardar", clase = "pri", textoCerrar = "Cancelar", sinPie = false } = {}) {
  $("#dlgBody").innerHTML = sinPie ? html : `${html}<div class="dlg-acts"><button class="btn" data-dlg="cerrar">${esc(textoCerrar)}</button>${enviar ? `<button class="btn ${clase}" data-dlg="ok">${esc(textoBoton)}</button>` : ""}</div>`;
  alEnviar = enviar;
  if (!$("#dlg").open) $("#dlg").showModal();
  $("#dlgBody").scrollTop = 0;
}
function cerrarDialogo() { if ($("#dlg").open) $("#dlg").close(); $("#dlg").classList.remove("req"); alEnviar = null; }
const reqPorId = id => S.det.checklist.find(x => x.id === id);

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
    VALIDADO: "Marca el requisito como cumplido. No requiere documento; si no hay documento, conviene dejar la razón en el seguimiento.",
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

const instanciasActivas = () => (S.ctx?.instancias || []).filter(i => i.activo !== false);
const etiquetaIns = i => i.siglas ? `${i.siglas} · ${i.nombre}` : (i.nombre || "");
const opcionesIns = (sel, vacio) => (vacio ? `<option value="">${esc(vacio)}</option>` : "") +
  instanciasActivas().map(i => `<option value="${esc(i.id)}" ${i.id === sel ? "selected" : ""}>${esc(etiquetaIns(i))}</option>`).join("");

function dlgEditar(id) {
  const x = reqPorId(id);
  const cat1 = x.categoria === 1;
  const validado = x.estado === "VALIDADO";
  const bloqueado = cat1 || validado;
  const aviso = cat1 ? "Los requerimientos de categoría 1 los administra el administrador." : validado ? "El requerimiento ya está validado. Márcalo como Observado para corregirlo." : "";
  const dis = bloqueado ? "disabled" : "";
  dialogo(`<h3>Editar requerimiento</h3><p class="muted">${esc(x.etiqueta)}</p>
    ${aviso ? `<p class="sm t-bad">${esc(aviso)}</p>` : ""}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label class="f">Resp. de cumplimiento<select id="dResp" ${dis}>${opcionesIns(x.instanciaId)}</select></label>
      <label class="f">Instancia solicitante<select id="dSol" ${dis}>${opcionesIns(x.instanciaSolicitanteId)}</select></label>
      <label class="f">Fecha compromiso (obligatoria)<input type="date" id="dFecha" ${dis} value="${isoDia(x.fechaCompromiso)}"></label>
      <label class="f">Categoría<select id="dCat" ${dis}><option value="2" ${x.categoria === 2 ? "selected" : ""}>2 · Instancia intermedia</option><option value="3" ${x.categoria === 3 ? "selected" : ""}>3 · Instancia gestora</option></select></label>
    </div>
    <p class="sm t-bad" id="dErr"></p>`,
  bloqueado ? null : () => {
    const f = $("#dFecha").value;
    if (!f) { $("#dErr").textContent = "La fecha compromiso es obligatoria."; return Promise.resolve(); }
    const cambios = {};
    if (f !== isoDia(x.fechaCompromiso)) cambios.fechaCompromiso = f;
    if ($("#dResp").value !== x.instanciaId) cambios.instanciaId = $("#dResp").value;
    if ($("#dSol").value !== x.instanciaSolicitanteId) cambios.instanciaSolicitanteId = $("#dSol").value;
    if (Number($("#dCat").value) !== x.categoria) cambios.categoria = Number($("#dCat").value);
    if (!Object.keys(cambios).length) return Promise.resolve();
    return tarea(() => api("REQ_EDITAR", { prqId: id, ...cambios })).then(trasCambio);
  });
}

function dlgNuevoReq() {
  const tipos = (S.ctx?.catalogos?.tiposDocumento || []).filter(x => x.activo !== false);
  dialogo(`<h3>Agregar requerimiento</h3>
    <p class="muted sm">Se agrega como extraordinario a la parrilla de este proyecto. Solo categoría 2 o 3.</p>
    <label class="f">Nombre<input id="nNom" maxlength="160"></label>
    <label class="f">Descripción<textarea id="nDes" rows="2" maxlength="1000"></textarea></label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <label class="f">Tipo de acreditación<select id="nTipo"><option value="">— Sin especificar —</option>${tipos.map(t => `<option value="${esc(t.clave)}">${esc(t.etiqueta)}</option>`).join("")}</select></label>
      <label class="f">Categoría<select id="nCat"><option value="2">2 · Instancia intermedia</option><option value="3" selected>3 · Instancia gestora</option></select></label>
      <label class="f">Resp. de cumplimiento<select id="nResp">${opcionesIns("", "— Elige —")}</select></label>
      <label class="f">Instancia solicitante<select id="nSol">${opcionesIns("", "— Elige —")}</select></label>
      <label class="f">Fecha compromiso<input type="date" id="nFecha"></label>
    </div>
    <p class="sm t-bad" id="dErr"></p>`,
  () => {
    const v = { etiqueta: $("#nNom").value.trim(), descripcion: $("#nDes").value, tipoDocumentoClave: $("#nTipo").value, categoria: Number($("#nCat").value), instanciaId: $("#nResp").value, instanciaSolicitanteId: $("#nSol").value, fechaCompromiso: $("#nFecha").value };
    if (!v.etiqueta) { $("#dErr").textContent = "Escribe el nombre del requerimiento."; return Promise.resolve(); }
    if (!v.instanciaId || !v.instanciaSolicitanteId || !v.fechaCompromiso) { $("#dErr").textContent = "Elige las dos instancias y la fecha compromiso."; return Promise.resolve(); }
    return tarea(() => api("REQ_NUEVO", { proyectoId: S.det.proyecto.id, ...v })).then(trasCambio);
  }, { textoBoton: "Agregar" });
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
  const r = await tarea(() => archivo(id, S.modo));
  if (!r) return;
  const url = URL.createObjectURL(r.blob);
  dialogo(`<h3>Documento listo</h3><p>${esc(r.nombre)}</p>
    <div class="row wrap"><a class="btn pri" href="${url}" target="_blank" rel="noopener">Abrir</a><a class="btn" href="${url}" download="${esc(r.nombre)}">Descargar</a></div>`, null);
}

// ── Eventos ──────────────────────────────────────────────────
document.addEventListener("click", e => {
  const fila = e.target.closest("tr[data-rq]");
  if (fila && !e.target.closest("button, select, input, label, a")) { dlgDetalleReq(fila.dataset.rq); return; }
  if (e.target.closest("[data-rcols]")) { const r = $("#rcols"); if (r) r.hidden = !r.hidden; return; }
  if (e.target.closest("[data-segx]")) { S.segQ = ""; const q = $("#segQ"); if (q) { q.value = ""; q.focus(); } const x = document.querySelector("[data-segx]"); if (x) x.hidden = true; pintarSegTabla(); return; }
  if (e.target.closest("[data-scols]")) { const r = $("#scols"); if (r) r.hidden = !r.hidden; return; }
  const sx = e.target.closest("[data-sexp]"); if (sx) { exportarSeg(sx.dataset.sexp); return; }
  const rx = e.target.closest("[data-rexp]"); if (rx) { exportarReq(rx.dataset.rexp); return; }
  const t = e.target.closest("button, a");
  if (!t || !t.closest("#accountMenu, #account, #navOptions")) cerrarMenu();
  if (!t) return;
  const d = t.dataset;
  if (t.id === "btnLogin" || t.id === "btnLoginTop") { startLogin(); return; }
  if (d.plan) { dialogo(detallePlan(d.plan), null, { textoCerrar: "Cerrar" }); return; }
  if (t.id === "btnRetry") { iniciar(); return; }
  if (t.id === "installButton") { instalar(); return; }
  if (t.id === "account" || t.id === "navOptions") { alternarMenu(t); return; }
  if (t.id === "closeOptions") { cerrarMenu(true); return; }
  if (d.menu === "logout") { logout(); return; }
  if (d.menu === "privacidad" || d.menu === "condiciones") { cerrarMenu(); dialogo(documentoLegal(d.menu), null, { textoCerrar: "Cerrar" }); return; }
  if (d.menu === "refresh") { actualizar(); return; }
  if (d.menu === "perfil") { dlgPerfil(); return; }
  if (d.menu === "panel") { abrirPanel(); return; }
  if (d.modo) { cambiarModo(d.modo); return; }
  if (d.bien === "panel") { abrirPanel(); return; }
  if (d.bien) { location.hash = d.bien; return; }
  if (d.actividad) { e.preventDefault(); dlgActividad(d.actividad); return; }
  if ("programar" in d) { cerrarDialogo(); dlgProgramar(null, d.programar || S.det?.proyecto?.id || ""); return; }
  if (d.actAccion) { accionActividad(d.actAccion, d.actId); return; }
  if (d.foto) { const i = $("#pFoto"); if (d.foto === "camara") i.setAttribute("capture", "user"); else i.removeAttribute("capture"); i.click(); return; }
  if (d.regnota) { anotarReq(d.regnota); return; }
  if (d.dlg === "cerrar") { cerrarDialogo(); return; }
  if (d.dlg === "ok") { alEnviar && alEnviar(); return; }
  if (d.fase) { S.fase = d.fase; document.querySelectorAll("[data-fase]").forEach(b => b.classList.toggle("on", b === t)); pintarTarjetas(); return; }
  if (d.pry) { S.tab = "checklist"; S.filtroReq = "TODOS"; location.hash = `#/p/${d.pry}`; return; }
  if (d.tab) { S.tab = d.tab; pintarProyecto(); return; }
  if (d.freq) { S.filtroReq = d.freq; pintarProyecto(); return; }
  if (d.indmin !== undefined) { S.indMin = d.indmin === "1"; pintarProyecto(); return; }
  if (d.estado) { dlgEstado(d.req, d.estado); return; }
  if (d.espera !== undefined) { tarea(() => api("REQ_ESPERA_DOC", { prqId: d.req, espera: d.espera === "1" })).then(trasCambio); return; }
  if (d.editar) { dlgEditar(d.editar); return; }
  if ("nuevoreq" in d) { dlgNuevoReq(); return; }
  if (d.anotar) { dlgAnotar(d.anotar); return; }
  if (d.subir) { dlgSubir(d.subir); return; }
  if (d.ver) { verArchivo(d.ver); return; }
  if (d.act === "anotarGeneral") {
    const actividadId = $("#segAct")?.value || "", cumpleActividad = !!actividadId && $("#segCumple").checked;
    tarea(() => api("ANOTAR", { proyectoId: S.det.proyecto.id, prqId: $("#segReq").value, nota: $("#segNota").value, visibleCliente: $("#segVis").checked, actividadId, cumpleActividad }))
      .then(async r => { if (r && cumpleActividad) await recargarActividades(); return trasCambio(r); });
  }
});
document.addEventListener("change", e => {
  if (e.target.dataset && e.target.dataset.scol) {
    const on = new Set(S.segCols), id = e.target.dataset.scol;
    e.target.checked ? on.add(id) : on.delete(id);
    S.segCols = SEG_COLS.map(c => c.id).filter(x => on.has(x));
    pintarSegTabla(); return;
  }
  if (e.target.dataset.rf) { S.reqF[e.target.dataset.rf] = e.target.value; pintarReqTabla(); return; }
  if (e.target.dataset.rcol) {
    const on = new Set(S.reqCols), id = e.target.dataset.rcol;
    e.target.checked ? on.add(id) : on.delete(id);
    S.reqCols = COLS_REQ.map(c => c.id).filter(x => on.has(x));
    pintarReqTabla(); return;
  }
  if (e.target.id === "dNom") $("#dMedioBox").hidden = !e.target.checked;
  if (e.target.id === "segReq") $("#segVisTxt").textContent = etiquetaVisible(e.target.value);
  if (e.target.id === "segAct") $("#segCumpleBox").hidden = !e.target.selectedOptions[0]?.dataset.cumplible;
  if (e.target.id === "aTodo") { $("#aHoraIni").disabled = $("#aHoraFin").disabled = e.target.checked; }
  if (e.target.id === "fTipo") { S.tipo = e.target.value; pintarTarjetas(); }
  if (e.target.id === "pFoto") { const f = e.target.files?.[0]; if (f) pintarAvatar($("#pAvatar"), URL.createObjectURL(f), ""); }
});
document.addEventListener("input", e => {
  if (e.target.id === "reqQ") { S.reqQ = e.target.value; pintarReqTabla(); }
  if (e.target.id === "segQ") { S.segQ = e.target.value; const x = document.querySelector("[data-segx]"); if (x) x.hidden = !S.segQ; pintarSegTabla(); }
  if (e.target.id === "fBuscar") { S.q = e.target.value; pintarTarjetas(); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarMenu(true); });
$("#dlg").addEventListener("close", () => { alEnviar = null; $("#dlgBody video")?.pause(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

iniciar().finally(() => window.dispatchEvent(new Event("gestion:ready")));
