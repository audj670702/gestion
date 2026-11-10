// SCaD Gestión · App · v0.13.20
// v0.11.0: banderita roja de relevancia en el registro de seguimiento (marcable por el ADM y el responsable).
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
// Dirección e Instancia son de consulta. El estatus se actualiza en el panel.
import { captureTokenFromHash, hasToken, startLogin, logout } from "./auth.js";
import { contexto, api, sys, subirADrive, ApiError } from "./api.js?v=0.11.0";
import { bienvenidaVisitante, bienvenidaUsuario, detallePlan } from "./bienvenida.js?v=0.13.11";
import { prepararDocumento } from "./documentos.js?v=0.11.0";
import { documentoLegal } from "./legal.js";
import {
  abrirProgramacion, repintarProgramacion, setContexto, actividades, buscarActividad, idDe, listaHtml, deHoy,
  inicio, fin, hora, titulo, tipoDe, lugar, detalle, todoDia, origenDe, cumplida, programada, sinCumplir, colorDe
} from "./programacion.js?v=0.11.0";

export const VERSION = "GESTION_APP v0.13.20";
const PANEL_URL = "https://www.scad.mx/panel-gestion";

const ESTATUS = {
  PREVISION: "Previsión", AUTORIZADO: "Autorizado", EN_PROCESO: "En proceso",
  PAUSADO: "Pausado", CONCLUIDO: "Concluido", CANCELADO: "Cancelado"
};
const etiquetaEstatus = p => ESTATUS[p.estatus] || "Sin asignar";
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

const S = { indMin: false, segQ: "", segBandera: "", segCols: ["bandera", "fecha", "autor", "ref", "nota"], ctx: null, modo: null, proyectos: [], estatus: "TODOS", resumen: "proyectos", q: "", tipo: "", det: null, tab: "checklist", filtroReq: "TODOS", reqQ: "", reqF: { estado: "", inst: "", cat: "", venc: "", bandera: "" }, reqCols: ["folio", "bandera", "etiqueta", "instancia", "categoria", "compromiso", "estado", "semaforo"], reqSel: null };

const ins = id => (S.ctx?.instancias || []).find(i => i.id === id) || null;
const insEtq = id => { const i = ins(id); return i ? (i.siglas || i.nombre) : ""; };
const tipoDoc = k => (S.ctx?.catalogos?.tiposDocumento || []).find(x => x.clave === k)?.etiqueta || "";
const tipoPry = k => (S.ctx?.catalogos?.tiposProyecto || []).find(x => x.clave === k)?.etiqueta || "";
const norm = v => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// ── Vistas (modo) ────────────────────────────────────────────
const MODOS = {
  DIRECCION: { t: "Dirección", band: "MODO DIRECCIÓN", lista: "Proyectos", sub: "Cartera de proyectos de la EO." },
  OPERACION: { t: "Operación", band: "MODO OPERACIÓN", lista: "Mis proyectos" },
  INSTANCIA: { t: "Instancia", band: "MODO INSTANCIA", lista: "Proyectos" }
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
  Object.assign(S, { estatus: "TODOS", resumen: "proyectos", q: "", tipo: "", det: null });
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
    abrirProgramacion($("#view"), S.ctx, { puedeProgramar: puedeProgramar() });
    montarGoogleCalendar(h);
    if (prg[1]) dlgActividad(decodeURIComponent(prg[1]));
    return;
  }
  if (h === "#/inicio") { S.det = null; marcarSeccion(""); pintarBienvenida(); return; }
  const m = /^#\/p\/([\w-]+)/.exec(h);
  if (m) abrirProyecto(m[1]).then(() => {
    const req = new URLSearchParams(h.split("?")[1] || "").get("req");
    if (req && S.det?.checklist?.some(x => x.id === req)) dlgDetalleReq(req);
  });
  else { S.det = null; pintarLista(); }
}
function montarGoogleCalendar(hash) {
  const cabecera = $("#view .hero .row");
  if (!cabecera) return;

  const parametros = new URLSearchParams(hash.slice("#/programacion?".length));
  const retorno = hash.startsWith("#/programacion?") ? parametros.get("gcal") : null;
  const codigo = parametros.get("gcalCode") || "";
  if (retorno !== null) {
    parametros.delete("gcal");
    parametros.delete("gcalCode");
    const consulta = parametros.toString();
    history.replaceState(history.state, "", "#/programacion" + (consulta ? "?" + consulta : ""));
  }

  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn sm";
  cabecera.append(boton);

  let conectado = null;
  function mostrarEstado(estado) {
    conectado = estado;
    boton.textContent = estado === null
      ? "Revisar conexión con Google Calendar"
      : estado ? "Desconectar Google Calendar" : "Conectar Google Calendar";
  }

  async function consultarEstado() {
    boton.disabled = true;
    boton.textContent = "Consultando Google Calendar…";
    try {
      const resultado = await api("GCAL_ESTADO");
      mostrarEstado(resultado.conectado === true);
      return conectado;
    } catch (error) {
      mostrarEstado(null);
      if (boton.isConnected) aviso(error.message || "No se pudo consultar la conexión con Google Calendar.", "bad");
      return null;
    } finally {
      boton.disabled = false;
    }
  }

  async function desconectar() {
    if (boton.disabled) return;
    boton.disabled = true;
    try {
      const resultado = await tarea(() => api("GCAL_DESCONECTAR"));
      if (!resultado) return;
      mostrarEstado(resultado.conectado === true);
      cerrarDialogo();
      if (!conectado) aviso("Google Calendar desconectado.");
    } finally {
      boton.disabled = false;
    }
  }

  boton.addEventListener("click", async () => {
    if (conectado === null) {
      await consultarEstado();
      return;
    }
    if (conectado) {
      dialogo(
        "<h3>Desconectar Google Calendar</h3><p>Se desconectará para este contexto. El calendario y sus eventos se conservarán en Google.</p>",
        desconectar, { textoBoton: "Desconectar", clase: "bad" }
      );
      return;
    }

    boton.disabled = true;
    try {
      const resultado = await api("GCAL_CONECTAR");
      if (resultado.conectado === true) {
        mostrarEstado(true);
        aviso("Google Calendar ya está conectado.");
        return;
      }
      const url = new URL(resultado.url);
      if (url.origin !== "https://accounts.google.com" || url.pathname !== "/o/oauth2/v2/auth") {
        throw new Error("La dirección de autorización de Google no es válida.");
      }
      location.assign(url.href);
    } catch (error) {
      aviso(error.message || "No se pudo abrir Google Calendar.", "bad");
    } finally {
      boton.disabled = false;
    }
  });

  consultarEstado().then(estado => {
    if (!boton.isConnected) return;
    if (retorno === "conectado" && estado === true) {
      aviso("Google Calendar conectado.");
    } else if (retorno === "conectado" && estado === false) {
      aviso("La conexión con Google Calendar no se pudo confirmar. Puedes reintentar.", "bad");
    } else if (retorno === "cancelado") {
      aviso("Autorización de Google Calendar cancelada.");
    } else if (retorno === "error") {
      const detalle = /^(GCAL_[A-Z_]{1,50}|WDE\d{4})$/.test(codigo) ? " (" + codigo + ")" : "";
      aviso("No se pudo conectar Google Calendar" + detalle + ". Puedes reintentar.", "bad");
    }
  });
}
window.addEventListener("hashchange", () => { if (S.ctx) ruta(); });

// ── Bienvenida (usuario) ─────────────────────────────────────
function pintarBienvenida() {
  const u = usr(), n = nombreMostrar();
  const rol = { DIRECCION: "Dirección", OPERACION: "Operación", INSTANCIA: "Instancia" }[S.modo] || "";
  const foto = urlImagen(u.avatar || u.foto);
  $("#view").innerHTML = bienvenidaUsuario({
    ctx: S.ctx, modo: S.modo, proyectos: S.proyectos, esAdm: esAdm(), resumenProyectos: resumenProyectos(true),
    identidad: { nombre: n === "Usuario" ? "" : n, email: u.email || S.ctx.email || "", foto, iniciales: iniciales(n) },
    eoNombre: S.ctx.eo?.nombreMostrar || S.ctx.eo?.nombre || "",
    rolEtiqueta: esAdm() ? "Administrador" + (rol ? " · " + rol : "") : rol
  });
}

// ── Lista de proyectos (según la vista) ──────────────────────
const enEstatus = p => S.estatus === "TODOS" || (p.estatus || "SIN_ASIGNAR") === S.estatus;
const enResumen = p => S.resumen === "proyectos" || p.checklist?.[S.resumen] > 0;
const responsable = p => p.responsableNombre || p.responsable?.nombre || "";
const otorgantesDe = p => (p.otorgantes?.length ? p.otorgantes.map(o => o.instanciaId) : [p.instanciaOtorganteId]).filter(Boolean);
function coincide(p) {
  if (S.tipo && p.tipoProyectoClave !== S.tipo) return false;
  const q = norm(S.q).trim();
  if (!q) return true;
  const txt = norm([p.folio, p.nombre, tipoPry(p.tipoProyectoClave), etiquetaEstatus(p), responsable(p),
    ...otorgantesDe(p).flatMap(id => [insEtq(id), ins(id)?.nombre])].join(" "));
  return q.split(/\s+/).every(w => txt.includes(w));
}

function resumenProyectos(desdeInicio = false) {
  const P = S.proyectos;
  const suma = k => P.reduce((n, p) => n + (p.checklist?.[k] || 0), 0);
  const indicadores = [
    ["proyectos", "Proyectos", P.length, ""],
    ["entregados", "Por revisar", suma("entregados"), "warn"],
    ["vencidos", "Vencidos", suma("vencidos"), "bad"],
    ["porVencer", `Vencen en ${S.ctx.reglas?.diasRiesgo || 3} días`, suma("porVencer"), "amber"]
  ];
  return `<div class="kpis" role="group" aria-label="Filtrar proyectos por resumen">
    ${indicadores.map(([clave, etiqueta, total, clase]) => `<button type="button" class="kpi ${clase}" data-resumen="${clave}"
      ${desdeInicio ? "" : `aria-pressed="${S.resumen === clave}" aria-controls="cards"`}><b>${total}</b><span>${etiqueta}</span></button>`).join("")}
  </div>`;
}

function pintarLista() {
  const P = S.proyectos, M = MODOS[S.modo];
  const filtros = [["TODOS", "Todos"], ...Object.entries(ESTATUS), ["SIN_ASIGNAR", "Sin asignar"]];
  const tipos = S.ctx.catalogos?.tiposProyecto || [];
  $("#view").innerHTML = `
    <section class="hero">
      <h1>${M.lista}</h1>
      ${M.sub ? `<p class="muted">${M.sub}</p>` : ""}
      ${resumenProyectos()}
    </section>
    ${bloqueHoy()}
    <div class="buscar">
      ${P.length ? `<input type="search" id="fBuscar" placeholder="Buscar folio, nombre, instancia${S.modo === "DIRECCION" ? ", responsable" : ""}…" value="${esc(S.q)}" autocomplete="off" enterkeyhint="search" aria-label="Buscar proyectos">
      <select id="fEstatus" aria-label="Estatus del proyecto">
        ${filtros.map(([k, t]) => `<option value="${esc(k)}" ${S.estatus === k ? "selected" : ""}>${esc(t)}</option>`).join("")}
      </select>
      ${tipos.length > 1 ? `<select id="fTipo" aria-label="Tipo de proyecto"><option value="">Todos los tipos</option>${tipos.map(t => `<option value="${esc(t.clave)}" ${S.tipo === t.clave ? "selected" : ""}>${esc(t.etiqueta)}</option>`).join("")}</select>` : ""}` : ""}
      <span id="conteo" class="conteo" aria-live="polite"></span>
    </div>
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
  const enF = P.filter(p => enEstatus(p) && enResumen(p)), lista = enF.filter(coincide);
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
    <div class="row wrap"><span class="chip ${["PAUSADO", "CANCELADO"].includes(p.estatus) ? "bad" : "info"}">${esc(etiquetaEstatus(p))}</span>${S.modo === "DIRECCION" && responsable(p) ? `<span class="muted sm">· ${esc(responsable(p))}</span>` : ""}</div>
    ${c.total ? `<div class="bar"><span style="width:${pct}%"></span></div>
      <div class="row sm"><span>${c.validados}/${c.aplicables} validados</span>
      <span class="badges">${c.entregados ? `<span class="chip warn">${c.entregados} por revisar</span>` : ""}${c.vencidos ? `<span class="chip bad">${c.vencidos} vencidos</span>` : ""}${c.observados ? `<span class="chip">${c.observados} observados</span>` : ""}</span></div>` : `<p class="muted sm">Sin checklist.</p>`}
  </button>`;
}

// ── Proyecto ─────────────────────────────────────────────────
async function abrirProyecto(id, { silencioso = false } = {}) {
  if (!silencioso) $("#view").innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const r = await tarea(() => api("PROYECTO", { proyectoId: id, vista: S.modo }));
  if (!r) { location.hash = "#/"; return; }
  prepararTablasProyecto(r.proyecto.id);
  S.det = r;
  const i = S.proyectos.findIndex(p => p.id === id);
  if (i >= 0) S.proyectos[i] = r.proyecto;
  pintarProyecto();
}

// Sólo en la vista Operación se trabaja el checklist; Dirección e Instancia son de consulta.
const editable = () => S.modo === "OPERACION";
// Registrar seguimiento: el responsable (Operación) y el ADM, con el permiso habitual.
const puedeAnotar = () => (S.modo === "OPERACION" || esAdm());

function pintarProyecto() {
  const p = S.det.proyecto;
  const tabs = [["checklist", `Checklist${p.checklist?.entregados ? ` <span class="badge">${p.checklist.entregados}</span>` : ""}`], ["seguimiento", "Seguimiento"], ["agenda", `Agenda${pendientesAgenda(p.id) ? ` <span class="badge">${pendientesAgenda(p.id)}</span>` : ""}`], ["ficha", "Ficha"]];
  $("#view").innerHTML = `
    <section class="pry-head">
      <a class="back" href="#/">‹ ${MODOS[S.modo].lista}</a>
      <div class="row"><span class="folio">${esc(p.folio)}</span><span class="chip ${["PAUSADO", "CANCELADO"].includes(p.estatus) ? "bad" : "info"}">${esc(etiquetaEstatus(p))}</span></div>
      <h1>${esc(p.nombre)}</h1>
      <p class="muted sm">El administrador actualiza el estatus en el panel.</p>
    </section>
    ${vistaHitos()}
    <nav class="tabs">${tabs.map(([k, t]) => `<button class="${S.tab === k ? "on" : ""}" data-tab="${k}">${t}</button>`).join("")}</nav>
    <section id="tabBody">${{ checklist: vistaChecklist, seguimiento: vistaSeguimiento, agenda: vistaAgenda, ficha: vistaFicha }[S.tab]()}</section>`;
  actualizarCasillaCabecera($("#tabBody"));
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

// ── Controles compartidos de las tablas del proyecto ─────────
const VISTAS_SELECCION = { "": "Todos los registros", seleccionados: "Seleccionados", restantes: "No seleccionados" };
const FILTROS_RAPIDOS_REQ = { TODOS: "Todos", REVISAR: "Por revisar", VENCIDOS: "Vencidos", ABIERTOS: "Sin validar" };
const TABLAS = { req: {}, seg: {} };
const ordenTexto = new Intl.Collator("es-MX", { numeric: true, sensitivity: "base" });
let contextoTablas;

function prepararTablasProyecto(id) {
  const contexto = JSON.stringify([S.modo, id]);
  if (contexto === contextoTablas) return;
  contextoTablas = contexto;
  for (const tabla of Object.values(TABLAS)) {
    Object.assign(tabla, { ids: new Set(), vista: "", columna: "", sentido: 1 });
  }
}
function filtroSeleccionHTML(tipo) {
  return `<select class="rt-sel" data-tabla-vista="${tipo}" aria-label="Filtrar por selección">${Object.entries(VISTAS_SELECCION).map(([valor, texto]) =>
    `<option value="${valor}" ${TABLAS[tipo].vista === valor ? "selected" : ""}>${texto}</option>`).join("")}</select>`;
}
function filasTabla(tipo, registros, columnas, valor) {
  const { ids, vista, columna, sentido } = TABLAS[tipo];
  const visibles = registros.filter(x => !vista || ids.has(x.id) === (vista === "seleccionados"));
  const criterio = columnas.find(c => c.id === columna);
  if (!criterio) return visibles;
  return visibles.map(registro => ({
    registro, clave: (criterio.orden ? criterio.orden(registro) : valor(criterio, registro)) ?? ""
  })).sort((a, b) => sentido * (criterio.orden ? a.clave - b.clave : ordenTexto.compare(a.clave, b.clave)))
    .map(x => x.registro);
}
function fechaOrden(valor) { return Date.parse(valor) || 0; }

function cabeceraTabla(tipo, cols, detalle = "") {
  const { columna, sentido } = TABLAS[tipo];
  return `<thead><tr><th scope="col" class="rt-casilla"><input type="checkbox" data-tabla-todas="${tipo}" aria-label="Seleccionar o deseleccionar los registros visibles"></th>
    <th scope="col" class="rt-numero">No.</th>
    ${cols.map(c => {
      const activa = columna === c.id;
      const asc = sentido === 1;
      const direccion = activa && asc ? "Z a A" : "A a Z";
      return `<th scope="col" class="${c.n ? "num" : ""}" ${activa ? `aria-sort="${asc ? "ascending" : "descending"}"` : ""}>
        <button type="button" class="rt-orden" data-tabla-orden="${tipo}" data-columna="${c.id}" aria-label="${esc(c.t)}. Ordenar de ${direccion}" title="Ordenar de ${direccion}">${esc(c.t)} <span aria-hidden="true">${activa ? (asc ? "↑" : "↓") : "↕"}</span></button>
      </th>`;
    }).join("")}${detalle ? `<th scope="col">${detalle}</th>` : ""}</tr></thead>`;
}
function celdasSeleccion(tipo, id, indice, nombre) {
  return `<td class="rt-casilla"><input type="checkbox" data-tabla-fila="${tipo}" value="${esc(id)}" aria-label="Seleccionar ${esc(nombre)}" ${TABLAS[tipo].ids.has(id) ? "checked" : ""}></td>
    <td class="rt-numero">${indice + 1}</td>`;
}
function actualizarCasillaCabecera(contenedor) {
  const todas = contenedor.querySelector("[data-tabla-todas]");
  if (!todas) return;
  const filas = [...contenedor.querySelectorAll("[data-tabla-fila]")];
  todas.checked = filas.every(fila => fila.checked);
  todas.indeterminate = !todas.checked && filas.some(fila => fila.checked);
}
function repintarTabla(tipo, html) {
  const el = $(`#${tipo}Tabla`);
  if (!el) return;
  const scroll = el.querySelector(".rtable")?.scrollLeft || 0;
  el.innerHTML = html();
  const tabla = el.querySelector(".rtable");
  if (tabla) tabla.scrollLeft = scroll;
  actualizarCasillaCabecera(el);
}

// ── Checklist · tabla con detalle (v0.7.0) ───────────────────
// Folio de registro: sólo el número (001); el folio del proyecto ya identifica el expediente.
const folioRegistro = (f, i) => { const m = /(\d+)$/.exec(String(f || "")); return (m ? m[1] : String(i + 1)).padStart(3, "0"); };
const COLS_REQ = [
  { id: "folio", t: "Folio", v: (x, i) => folioRegistro(x.folio, i) },
  { id: "bandera", t: "Bandera", v: (x, i, bandera) => SEG_BANDERAS[bandera].nombre },
  { id: "etiqueta", t: "Requerimiento", v: x => x.etiqueta },
  { id: "instancia", t: "Instancia", v: x => insEtq(x.instanciaId) || "Sin instancia" },
  { id: "categoria", t: "Cat.", v: x => x.categoria ? String(x.categoria) : "—", n: true },
  { id: "documento", t: "Tipo de acreditación", v: x => x.tipoDocumentoClave ? tipoDoc(x.tipoDocumentoClave) : "—" },
  { id: "compromiso", t: "Compromiso", v: x => fecha(x.fechaCompromiso), orden: x => fechaOrden(x.fechaCompromiso) },
  { id: "estado", t: "Estado", v: x => (ESTADOS[x.estado] || { t: x.estado }).t },
  { id: "semaforo", t: "Plazo", v: x => x.semaforo === "VENCIDO" ? "Vencido" : x.semaforo === "POR_VENCER" ? "Por vencer" : "En tiempo" },
  { id: "obs", t: "Obs.", v: x => String(x.observaciones || 0), n: true },
  { id: "actualiza", t: "Última actualización", v: x => fechaHora(x.ultimaActualizacion), orden: x => fechaOrden(x.ultimaActualizacion) }
];

function banderasReq() {
  const banderas = new Map();
  for (const anotacion of anotacionesSeg()) {
    if (!anotacion.referenciaId) continue;
    const bandera = banderaSeg(anotacion);
    if (bandera === "DIFICULTAD" || (bandera === "ATENCION" && !banderas.has(anotacion.referenciaId))) {
      banderas.set(anotacion.referenciaId, bandera);
    }
  }
  return banderas;
}

function reqFiltrados(items, banderas) {
  const q = norm(S.reqQ || "").trim();
  const f = S.reqF || {};
  return items.filter((x, i) => {
    if (S.filtroReq === "REVISAR" && x.estado !== "ENTREGADO") return false;
    if (S.filtroReq === "VENCIDOS" && x.semaforo !== "VENCIDO") return false;
    if (S.filtroReq === "ABIERTOS" && ["VALIDADO", "NO_APLICA"].includes(x.estado)) return false;
    if (f.estado && x.estado !== f.estado) return false;
    if (f.inst && x.instanciaId !== f.inst) return false;
    if (f.cat && String(x.categoria || "") !== f.cat) return false;
    if (f.venc && x.semaforo !== f.venc) return false;
    const bandera = banderas.get(x.id) || "NORMAL";
    if (f.bandera && bandera !== f.bandera) return false;
    if (q && !norm(COLS_REQ.map(c => c.v(x, i, bandera)).join(" ")).includes(q)) return false;
    return true;
  });
}
function datosTablaReq(items) {
  const banderas = banderasReq();
  const indices = new Map(items.map((x, i) => [x.id, i]));
  const cols = COLS_REQ.filter(c => S.reqCols.includes(c.id));
  const valor = (c, x) => c.v(x, indices.get(x.id), banderas.get(x.id) || "NORMAL");
  return { cols, valor, banderas, lista: filasTabla("req", reqFiltrados(items, banderas), cols, valor) };
}
const textoFiltroReq = () => {
  const f = S.reqF || {}, p = [];
  if (S.filtroReq !== "TODOS") p.push(FILTROS_RAPIDOS_REQ[S.filtroReq]);
  if (TABLAS.req.vista) p.push(VISTAS_SELECCION[TABLAS.req.vista]);
  if (S.reqQ) p.push(`Búsqueda: ${S.reqQ}`);
  if (f.estado) p.push(`Estado: ${ESTADOS[f.estado]?.t || f.estado}`);
  if (f.inst) p.push(`Instancia: ${insEtq(f.inst)}`);
  if (f.cat) p.push(`Categoría ${f.cat}`);
  if (f.venc) p.push(f.venc === "VENCIDO" ? "Vencidos" : "Por vencer");
  if (f.bandera) p.push(`Bandera: ${SEG_BANDERAS[f.bandera].nombre}`);
  return p.join(" · ");
};

function tablaReq() {
  const items = S.det.checklist;
  const { cols, valor, banderas, lista } = datosTablaReq(items);
  if (!lista.length) return `<div class="empty">Nada con este filtro.</div>`;
  const clasesCelda = (c, x) => [
    c.n ? "num" : "",
    c.id === "folio" ? "t-folio" : "",
    c.id === "etiqueta" ? "t-req" : "",
    ["compromiso", "actualiza", "folio", "bandera", "categoria", "obs"].includes(c.id) ? "t-nw" : "",
    c.id === "semaforo" && x.semaforo === "VENCIDO" ? "t-bad" : "",
    c.id === "semaforo" && x.semaforo === "POR_VENCER" ? "t-amber" : ""
  ].filter(Boolean).join(" ");
  const filas = lista.map((x, i) => {
    const bandera = banderas.get(x.id) || "NORMAL";
    return `<tr data-rq="${esc(x.id)}" class="${x.semaforo === "VENCIDO" ? "vencido" : ""}${S.reqSel === x.id ? " sel" : ""}">
    ${celdasSeleccion("req", x.id, i, x.etiqueta)}
    ${cols.map(c => c.id === "estado"
      ? `<td class="t-nw"><span class="chip ${(ESTADOS[x.estado] || {}).c || ""}">${esc(valor(c, x))}</span></td>`
      : `<td class="${clasesCelda(c, x)}">${c.id === "bandera"
        ? `<span class="seg-flag ${SEG_BANDERAS[bandera].clase}" role="img" aria-label="${esc(valor(c, x))}" title="${esc(valor(c, x))}">${iconoBandera}</span>` : esc(valor(c, x))}</td>`).join("")}
  </tr>`;
  }).join("");
  return `<div class="rtable"><table>${cabeceraTabla("req", cols)}<tbody>${filas}</tbody></table></div>
    <p class="rt-pie">${lista.length} de ${items.length} requerimientos · clic en una fila para ver el detalle y las acciones</p>`;
}
function pintarReqTabla() { repintarTabla("req", tablaReq); }

function botonesExportar(atributo) {
  const formatos = [
    { id: "xls", nombre: "Excel", color: "#1d7a46", marca: '<rect x="2" y="9" width="12" height="10" rx="1.5" fill="currentColor"/><path d="m5 12 5 4m0-4-5 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>' },
    { id: "pdf", nombre: "PDF", color: "#c2413a", marca: '<rect x="1" y="9" width="15" height="8" rx="1.5" fill="currentColor"/><text x="8.5" y="14.9" font-size="5.7" font-family="Arial,sans-serif" font-weight="700" text-anchor="middle" fill="#fff">PDF</text>' }
  ];
  return formatos.map(({ id, nombre, color, marca }) => `<button type="button" class="rt-btn rt-exportar" ${atributo}="${id}"
    aria-label="Exportar a ${nombre}" title="Exportar a ${nombre}">
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" color="${color}">
      <path d="M6 2h8l5 5v15H6z" fill="#fff" stroke="currentColor" stroke-width="1.6"/>
      <path d="M14 2v5h5" fill="none" stroke="currentColor" stroke-width="1.6"/>${marca}
    </svg></button>`).join("");
}

function vistaChecklist() {
  const items = S.det.checklist;
  const p = S.det.proyecto;
  const c = p.checklist || {};
  const pct = c.aplicables ? Math.round((c.validados / c.aplicables) * 100) : 0;
  const banner = editable() && c.aplicables && c.validados === c.aplicables ? `<div class="note-box ok">Checklist completo.</div>` : "";
  if (!items.length) return `${banner}<div class="empty">Sin requerimientos en la parrilla.</div>`;
  const f = S.reqF;
  const instancias = [...new Set(items.map(x => x.instanciaId).filter(Boolean))];
  const cols = COLS_REQ.map(c => `<label class="check"><input type="checkbox" data-rcol="${c.id}" ${S.reqCols.includes(c.id) ? "checked" : ""}> ${esc(c.t)}</label>`).join("");
  const indicadores = S.indMin
    ? `<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin-bottom:10px"><span class="sm"><b>${pct}%</b> <span class="muted">· ${c.validados} de ${c.aplicables} validados</span></span><div class="bar" style="flex:1;min-width:140px;margin:0"><span style="width:${pct}%"></span></div><button class="btn sm ghost" data-indmin="0">Mostrar gráfica</button></div>`
    : `<div style="display:flex;justify-content:flex-end;margin-bottom:4px"><button class="btn sm ghost" data-indmin="1">Ocultar gráfica</button></div>
    ${curvaHTML(items, p)}
    <div class="progress"><div class="row"><b>${pct}%</b><span class="muted sm">${c.validados} de ${c.aplicables} requerimientos aplicables validados</span></div><div class="bar"><span style="width:${pct}%"></span></div></div>`;
  return `${banner}
    ${indicadores}
    <div class="rt-bar">
      <div class="rt-busqueda-rapida"><label class="rt-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 14l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" id="reqQ" placeholder="Buscar folio, requerimiento o instancia" value="${esc(S.reqQ || "")}"></label>
        <select id="filtroReqRapido" class="rt-sel" aria-label="Filtro rápido de requerimientos">${Object.entries(FILTROS_RAPIDOS_REQ).map(([k, t]) =>
          `<option value="${k}" ${S.filtroReq === k ? "selected" : ""}>${t}</option>`).join("")}</select>
      </div>
      <div class="rt-filtros">
        ${filtroSeleccionHTML("req")}
        <select data-rf="estado" class="rt-sel" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(ESTADOS).map(([k, v]) => `<option value="${k}" ${f.estado === k ? "selected" : ""}>${esc(v.t)}</option>`).join("")}</select>
        <select data-rf="inst" class="rt-sel" aria-label="Instancia"><option value="">Todas las instancias</option>${instancias.map(id => `<option value="${esc(id)}" ${f.inst === id ? "selected" : ""}>${esc(insEtq(id))}</option>`).join("")}</select>
        <select data-rf="cat" class="rt-sel" aria-label="Categoría"><option value="">Todas las categorías</option>${[1, 2, 3].map(n => `<option value="${n}" ${f.cat === String(n) ? "selected" : ""}>Categoría ${n}</option>`).join("")}</select>
        ${filtroBanderaHTML("requerimientos", f.bandera)}
        <select data-rf="venc" class="rt-sel" aria-label="Plazo"><option value="">Cualquier plazo</option><option value="VENCIDO" ${f.venc === "VENCIDO" ? "selected" : ""}>Vencidos</option><option value="POR_VENCER" ${f.venc === "POR_VENCER" ? "selected" : ""}>Por vencer</option></select>
      </div>
      <div class="rt-acc">
        ${editable() ? `<button class="rt-btn" data-nuevoreq>Agregar requerimiento</button>` : ""}
        <button class="rt-btn" data-rcols>Columnas</button>
        ${botonesExportar("data-rexp")}
      </div>
    </div>
    <div class="rcols" id="rcols" hidden>${cols}</div>
    <div id="reqTabla">${tablaReq()}</div>`;
}

function detalleReqHTML(x) {
  const e = ESTADOS[x.estado] || { t: x.estado, c: "" };
  const documentos = x.archivos || [];
  const trans = editable() ? (S.ctx.reglas?.transiciones?.[x.estado] || []) : [];
  const puedeSubir = (editable() || esAdm()) && !["VALIDADO", "NO_APLICA"].includes(x.estado);
  const i = S.det.checklist.indexOf(x);
  const folio = folioRegistro(x.folio, i);
  const plazo = x.semaforo === "VENCIDO" ? "Vencido" : x.semaforo === "POR_VENCER" ? "Por vencer" : "En tiempo";
  const seg = anotacionesSeg().filter(s => s.referenciaId === x.id);
  const acciones = editable() ? `<div class="req-acc">
      ${trans.map(t => `<button class="btn sm ${ACCION[t]?.c || ""}" data-estado="${t}" data-req="${esc(x.id)}">${esc(ACCION[t]?.t || t)}</button>`).join("")}
      <button class="btn sm ${x.esperaDocumento ? "" : "ghost"}" data-espera="${x.esperaDocumento ? "0" : "1"}" data-req="${esc(x.id)}">${x.esperaDocumento ? "Quitar espera de documento" : "Espera documento"}</button>
      <button class="btn sm ghost" data-editar="${esc(x.id)}">Editar</button>
    </div>` : (esAdm() ? "" : `<p class="muted sm">Vista de consulta.</p>`);
  const anotar = puedeAnotar() ? `<div class="req-nota">
      <textarea id="rqNota" rows="2" placeholder="Anotación sobre este requerimiento…"></textarea>
      <div class="req-nota-pie"><label class="check"><input type="checkbox" id="rqVis"> ${esc(etiquetaVisible(x.id))}</label>
      <button class="btn sm pri" data-regnota="${esc(x.id)}">Registrar</button></div>
    </div>` : "";
  const hist = seg.map(s => `<li><div class="row wrap req-seg-meta"><span class="muted xs">${fechaHora(s.fechaRegistro)} · ${esc(s.autorNombre)}${s.autorTipo === "CLIENTE" ? " (instancia)" : ""}${s.registradoEnNombreDe ? ` · en nombre de ${esc(s.registradoEnNombreDe)}` : ""}</span>${controlBandera(s)}</div><p>${esc(s.nota)}</p></li>`).join("");
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
        ${x.especificaciones ? `<dt>Especificaciones del proyecto</dt><dd>${esc(x.especificaciones)}</dd>` : ""}
        ${x.estado === "NO_APLICA" && x.justificacionNoAplica ? `<dt>No aplica</dt><dd>${esc(x.justificacionNoAplica)}</dd>` : ""}
      </dl>
      <div class="req-doc">
        <div class="row wrap"><h4>Documentos del requerimiento (${documentos.length})</h4>${puedeSubir ? `<button class="btn sm pri" data-subir="${esc(x.id)}">Subir documento</button>` : ""}</div>
        ${documentos.length ? `<p class="muted xs">Algunos formatos requieren una aplicación compatible.</p>` : ""}
        ${documentos.length ? documentos.map(a => `<div class="file"><span class="ico">📄</span><div><b>${esc(a.nombre)}</b><span class="muted sm">${tamano(a.tamano)} · ${fecha(a.fechaCarga)}${a.cargadoPorNombre ? ` · ${esc(a.cargadoPorNombre)}` : ""}</span>${a.nombreOriginal && a.nombreOriginal !== a.nombre ? `<span class="muted xs">Original: ${esc(a.nombreOriginal)}</span>` : ""}</div><div class="row wrap"><button class="btn sm" data-ver="${esc(a.id)}">Visualizar</button><button class="btn sm" data-descargar="${esc(a.id)}">Descargar</button></div></div>`).join("") : `<p class="muted sm">Sin documentos cargados.</p>`}
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
  a.href = u; a.download = nombre; const contenedor = document.querySelector('dialog[open] #dlgBody') || document.body; contenedor.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 2000);
}
const hoyYmd = () => { const d = new Date(); return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`; };
function matrizReq() {
  const { cols, valor, lista } = datosTablaReq(S.det.checklist);
  return { cols, headers: ["No.", ...cols.map(c => c.t)], rows: lista.map((x, i) =>
    [String(i + 1), ...cols.map(c => String(valor(c, x)))]) };
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
    const tr = r => `<tr>${r.map((v, k) => `<td${(k === 0 || m.cols[k - 1]?.n) ? ' style="text-align:right"' : ""}>${esc(v)}</td>`).join("")}</tr>`;
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

const MOVIMIENTOS_PROYECTO = {
  PROYECTO_ESTATUS: "Estatus del proyecto actualizado",
  HITO_ALTA: "Hito agregado",
  HITO_EDICION: "Hito editado",
  HITO_BAJA: "Hito retirado",
  HITO_ORDEN: "Hitos reordenados",
  HITO_PERMISO: "Permiso de hitos actualizado",
  CAMBIO_ESTADO: "Cambio de estado",
  ACTIVIDAD_CUMPLIDA: "Actividad cumplida",
  RESULTADO_OTORGANTE: "Resultado de instancia actualizado"
};
const tituloMovimiento = s => s.tipo === "HITO_MARCA"
  ? (s.estadoNuevo === "CUMPLIDO" ? "Hito marcado como cumplido" : "Hito desmarcado")
  : (MOVIMIENTOS_PROYECTO[s.tipo] || "Actualización registrada");

// Algunos movimientos anteriores se guardaron con el mismo tipo que las notas libres.
function esAnotacionSeg(s) {
  const nota = s.nota || "";
  if (s.tipo === "ACTIVIDAD_CUMPLIDA") return !!nota && nota !== `Actividad cumplida: ${s.actividadEtiqueta}.`;
  if (s.tipo !== "ANOTACION") return false;
  if (s.referenciaEtiqueta && nota.startsWith(`${s.referenciaEtiqueta}: se actualizó `)) return false;
  return !/^(?:Valor del proyecto: .* → |Fecha compromiso del expediente: .* → |Instancias otorgantes: (?:se agrega |se retira |aportación de )|Responsable reasignado de .* a |Requerimiento quitado de la parrilla: |Requerimiento extraordinario agregado por el responsable: |Actividad convertida en requerida: )/.test(nota);
}
const anotacionesSeg = () => (S.det.seguimiento || []).filter(esAnotacionSeg);
const autorSeg = s => [
  (s.autorNombre || "—") + (s.autorTipo === "CLIENTE" ? " (instancia)" : ""),
  s.registradoEnNombreDe && `en nombre de ${s.registradoEnNombreDe}`
].filter(Boolean).join(" · ");

const SEG_BANDERAS = {
  NORMAL: { nombre: "Normal", clase: "normal" },
  ATENCION: { nombre: "Atención", clase: "atencion" },
  DIFICULTAD: { nombre: "Dificultad", clase: "dificultad" }
};
const banderaSeg = s => Object.hasOwn(SEG_BANDERAS, s.bandera) ? s.bandera : (s.relevante ? "DIFICULTAD" : "NORMAL");
const iconoBandera = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 3v18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M5 4h12l-2.5 4L17 12H5z" fill="currentColor"/></svg>';
const SEG_COLS = [
  { id: "bandera", t: "Bandera", v: s => SEG_BANDERAS[banderaSeg(s)].nombre },
  { id: "fecha", t: "Fecha", v: s => fechaHora(s.fechaRegistro), orden: s => fechaOrden(s.fechaRegistro) },
  { id: "autor", t: "Autor", v: autorSeg },
  { id: "ref", t: "Referencia", v: s => s.referenciaEtiqueta || "Proyecto en general" },
  { id: "actividad", t: "Actividad", v: s => s.actividadEtiqueta || "" },
  { id: "visible", t: "Visible para instancia", v: s => s.visibleCliente ? "Sí" : "No" },
  { id: "nota", t: "Anotación", v: s => s.nota || "" }
];
function datosTablaSeg(registros) {
  const cols = SEG_COLS.filter(c => S.segCols.includes(c.id));
  return { cols, lista: filasTabla("seg", segFiltrados(registros), cols, (c, s) => c.v(s)) };
}
function segFiltrados(lista) {
  const q = norm(S.segQ || "").trim();
  return lista.filter(s => (!S.segBandera || banderaSeg(s) === S.segBandera)
    && (!q || norm(SEG_COLS.map(c => c.v(s)).join(" ")).includes(q)));
}
function controlBandera(registro, { soloIcono = false } = {}) {
  const { nombre, clase } = SEG_BANDERAS[banderaSeg(registro)];
  const icono = `<span class="seg-flag-icon" aria-hidden="true">${iconoBandera}</span>`;
  const contenido = soloIcono ? icono : `${icono}<span>${nombre}</span>`;
  const titulo = soloIcono ? ` title="${nombre}"` : "";
  return (S.det.puedeMarcarBanderas ?? puedeAnotar())
    ? `<button type="button" class="seg-flag ${clase}" data-segrel="${esc(registro.id)}"${titulo}
        aria-haspopup="dialog" aria-label="Cambiar bandera: ${nombre}">${contenido}</button>`
    : `<span class="seg-flag ${clase}"${soloIcono ? ` role="img" aria-label="${nombre}"${titulo}` : ""}>${contenido}</span>`;
}
function tablaSeg() {
  const h = anotacionesSeg();
  if (!h.length) return `<div class="empty">Sin anotaciones.</div>`;
  const { cols, lista } = datosTablaSeg(h);
  if (!lista.length) return `<div class="empty">Ninguna anotación coincide con los filtros.</div>`;
  const filas = lista.map((s, i) => `<tr data-segdetalle="${esc(s.id)}">${celdasSeleccion("seg", s.id, i, `anotación ${i + 1}`)}
    ${cols.map(c => `<td class="${c.id === "fecha" ? "t-nw" : ""}${c.id === "nota" ? " t-req" : ""}">${c.id === "bandera" ? controlBandera(s, { soloIcono: true })
      : c.id === "nota" ? `<span class="seg-resumen">${esc(c.v(s))}</span>` : esc(c.v(s))}</td>`).join("")}
    <td><button type="button" class="btn sm t-nw" data-ver-anotacion="${esc(s.id)}" aria-haspopup="dialog">Ver detalle</button></td></tr>`).join("");
  return `<div class="rtable"><table>${cabeceraTabla("seg", cols, "Detalle")}<tbody>${filas}</tbody></table></div>
    <p class="rt-pie">${lista.length} de ${h.length} anotaciones</p>`;
}
function pintarSegTabla() { repintarTabla("seg", tablaSeg); }
function etiquetaFiltroBandera(clave) {
  const bandera = SEG_BANDERAS[clave];
  return bandera
    ? `<span class="seg-flag ${bandera.clase}">${iconoBandera}<span>${bandera.nombre}</span></span>`
    : `<span class="seg-flag normal">Todas las banderas</span>`;
}

function filtroBanderaHTML(ambito, seleccionada) {
  return `<details class="seg-filtro" data-filtro-bandera="${ambito}">
    <summary><span class="seg-filtro-valor">${etiquetaFiltroBandera(seleccionada)}</span></summary>
    <div class="seg-filtro-opciones" role="group" aria-label="Filtrar por bandera">
      ${["", ...Object.keys(SEG_BANDERAS)].map(clave => `<button type="button" data-seg-filtro="${clave}"
        aria-pressed="${seleccionada === clave}">${etiquetaFiltroBandera(clave)}</button>`).join("")}
    </div>
  </details>`;
}

function barraSeg() {
  const cols = SEG_COLS.map(c => `<label class="check"><input type="checkbox" data-scol="${c.id}" ${S.segCols.includes(c.id) ? "checked" : ""}> ${esc(c.t)}</label>`).join("");
  return `<div class="rt-bar">
      <label class="rt-search"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M14 14l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><input type="search" id="segQ" placeholder="Buscar en el seguimiento" value="${esc(S.segQ || "")}"><button type="button" data-segx aria-label="Limpiar búsqueda" title="Limpiar" ${S.segQ ? "" : "hidden"} style="flex:0 0 auto;width:22px;height:22px;padding:0;border:0;border-radius:50%;background:#eef2f7;color:#5b6b80;font-size:15px;line-height:22px;cursor:pointer">×</button></label>
      ${filtroBanderaHTML("seguimiento", S.segBandera)}
      ${filtroSeleccionHTML("seg")}
      <div class="rt-acc">
        <button class="rt-btn" data-scols>Columnas</button>
        ${botonesExportar("data-sexp")}
      </div>
    </div>
    <div class="rcols" id="scols" hidden>${cols}</div>`;
}
function matrizSeg() {
  const { cols, lista } = datosTablaSeg(anotacionesSeg());
  return { cols, headers: ["No.", ...cols.map(c => c.t)], rows: lista.map((s, i) => [String(i + 1), ...cols.map(c => String(c.v(s)))]) };
}
async function exportarSeg(tipo) {
  const m = matrizSeg();
  if (!m.rows.length) { aviso("No hay anotaciones para exportar.", "bad"); return; }
  const p = S.det.proyecto;
  const titulo = `Seguimiento · ${p.folio} · ${p.nombre}`;
  const filtros = [S.segQ && `Búsqueda: ${S.segQ}`,
    S.segBandera && `Bandera: ${SEG_BANDERAS[S.segBandera].nombre}`,
    TABLAS.seg.vista && VISTAS_SELECCION[TABLAS.seg.vista]].filter(Boolean).join(" · ");
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

const diaHitoMX = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" });
const fechaHito = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", timeZone: "UTC" });

function estadoHito(hito, hoy) {
  const { fechaCompromiso, fechaCumplimiento, cumplido } = hito;
  if (cumplido) {
    if (fechaCompromiso && fechaCumplimiento > fechaCompromiso) return ["aviso", "Cumplido tarde"];
    return ["ok", "Cumplido"];
  }
  if (!fechaCompromiso) return ["neutro", "Sin fecha"];
  if (fechaCompromiso < hoy) return ["vencido", "Vencido"];
  if (fechaCompromiso === hoy) return ["aviso", "Vence hoy"];
  return ["previsto", "Programado"];
}

function vistaHitos() {
  const hitos = S.det.hitos || [];
  if (!hitos.length) return "";
  const hoy = diaHitoMX.format(new Date());
  const filas = hitos.map(hito => {
    const [color, estado] = estadoHito(hito, hoy);
    const { id, nombre, cumplido, fechaCompromiso, fechaCumplimiento } = hito;
    const marca = cumplido ? "✓" : "";
    const detalle = [nombre, estado, fechaCompromiso && `Fecha compromiso ${fechaCompromiso}`,
      fechaCumplimiento && `Cumplido el ${fechaCumplimiento}`].filter(Boolean).join(". ");
    const control = S.det.puedeMarcarHitos
      ? `<button type="button" class="hito-marca" role="checkbox" aria-checked="${Boolean(cumplido)}"
          aria-label="${esc(nombre)}" data-hito="${esc(id)}" data-on="${cumplido ? 0 : 1}">${marca}</button>`
      : `<span class="hito-marca" aria-hidden="true">${marca}</span>`;
    const fecha = fechaCompromiso ? `<time datetime="${esc(fechaCompromiso)}">${fechaHito.format(new Date(fechaCompromiso + "T00:00:00Z"))}</time>` : "";
    return `<li class="hito-paso hito-${color}" title="${esc(detalle)}">${control}
      <span class="hito-titulo">${esc(nombre)}</span>
      <small>${fecha ? fecha + " · " : ""}${estado}</small>
    </li>`;
  }).join("");
  return `<section class="card hitos-avance" aria-labelledby="tituloHitos">
    <h3 id="tituloHitos">Hitos</h3>
    <div class="hitos-desplazable" tabindex="0" role="region" aria-label="Secuencia de hitos">
      <ol class="hitos-linea">${filas}</ol>
    </div>
  </section>`;
}

function historialProyecto() {
  const movimientos = (S.det.seguimiento || []).filter(s => !esAnotacionSeg(s));
  if (!movimientos.length) return "";
  return `<details class="card historial-proyecto">
    <summary>Historial del proyecto (${movimientos.length})</summary>
    <ul class="pro-hist">${movimientos.map(s => `<li>
      <b>${esc(tituloMovimiento(s))}</b>
      <div class="muted xs">${esc(fechaHora(s.fechaRegistro))} · ${esc(autorSeg(s))}${s.referenciaEtiqueta ? ` · ${esc(s.referenciaEtiqueta)}` : ""}</div>
      ${s.nota ? `<p class="seg-texto">${esc(s.nota)}</p>` : ""}
    </li>`).join("")}</ul>
  </details>`;
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
      <dt>Estatus</dt><dd>${esc(etiquetaEstatus(p))}</dd>
      <dt>Alta</dt><dd>${fecha(p.fechaAlta)}</dd>
    </dl>
    <h3 class="sub-h">${otorgantes.length > 1 ? "Instancias otorgantes" : "Instancia otorgante"}</h3>
    <div class="otgs">${otorgantes.map(bloqueOtorgante).join("") || `<p class="muted sm">Sin instancia otorgante.</p>`}</div>
    <p class="muted xs">Los datos del proyecto, su estatus y el resultado de cada otorgante los registra el ADM en el panel de SCaD Gestión.</p>
  </div>${historialProyecto()}`;
}

// ── Actividades: requeridas (ADM) y propias (colaborador) ────
// Los permisos por actividad (puedeEditar / puedeCumplir / puedePromover) los decide el backend.
const flag = (a, k) => a?.[k] === true;
const enEscritura = () => S.modo !== "INSTANCIA";
const misProyectos = () => (S.modo === "INSTANCIA" || S.modo === "OPERACION" || (esAdm() && S.modo === "DIRECCION")) ? S.proyectos : [];
const tiposActividad = () => S.ctx?.catalogos?.tiposActividad || [];
const puedeProgramar = () => S.modo === "INSTANCIA"
  ? S.ctx?.programacion?.puedeProgramarEnInstancia === true && misProyectos().length > 0
  : S.ctx?.programacion?.puedeProgramar === true && (esAdm() || misProyectos().length > 0);
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
  const puede = puedeProgramar() && misProyectos().some(x => x.id === p.id);
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
  const requiereProyecto = !adm || S.modo === "INSTANCIA";
  const puedeCompartir = rolApp() !== "CLIENTE";
  const pid = a ? (a.proyectoId || "") : (proyectoId || (P.length === 1 && requiereProyecto ? P[0].id : ""));
  const s = a ? inicio(a) : null, e = a ? fin(a) : null;
  const tipoSel = a ? tipoDe(a) : "";
  dialogo(`<h3>${a ? "Editar actividad" : "Programar actividad"}</h3>
    <p class="muted xs">${adm ? "Como administrador, la actividad queda como <b>requerida</b>." : "Actividad propia: organiza tu trabajo en el proyecto. Las requeridas las programa el administrador."}</p>
    <label class="f">Proyecto<select id="aPry" ${a ? "disabled" : ""}>${requiereProyecto ? `<option value="">Elige un proyecto</option>` : `<option value="">General de la EO (sin proyecto)</option>`}${P.map(p => `<option value="${esc(p.id)}" ${p.id === pid ? "selected" : ""}>${esc(p.folio)} · ${esc(p.nombre)}</option>`).join("")}${a && a.proyectoId && !P.some(p => p.id === a.proyectoId) ? `<option selected>${esc(a.proyectoFolio || "Proyecto")}</option>` : ""}</select></label>
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
    ${puedeCompartir ? `<label class="check"><input type="checkbox" id="aVis" ${a?.visibleCliente ? "checked" : ""}> Visible para la instancia</label>` : ""}`,
  () => {
    const fechaV = $("#aFecha").value, todo = $("#aTodo").checked, hi = $("#aHoraIni").value, hf = $("#aHoraFin").value;
    const datos = {
      actividadId: a?.id || "", proyectoId: a ? (a.proyectoId || "") : $("#aPry").value, titulo: $("#aTit").value.trim(), tipoId: $("#aTipo").value,
      todoElDia: todo, lugar: $("#aLugar").value.trim(), descripcion: $("#aDet").value.trim(), enlace: $("#aEnl").value.trim(),
      vista: S.modo, visibleCliente: $("#aVis")?.checked === true
    };
    if (requiereProyecto && !datos.proyectoId) { aviso("Elige el proyecto.", "bad"); return; }
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

function dlgDetalleSeg(id) {
  const nota = anotacionesSeg().find(s => s.id === id);
  if (!nota) return;
  dialogo(`<section class="seg-detalle">
    <h3>Detalle de la anotación</h3>
    <dl class="kv">
      <dt>Fecha y hora</dt><dd>${esc(fechaHora(nota.fechaRegistro))}</dd>
      <dt>Autor</dt><dd>${esc(autorSeg(nota))}</dd>
      <dt>Referencia</dt><dd>${esc(nota.referenciaEtiqueta || "Proyecto en general")}</dd>
      ${nota.actividadEtiqueta ? `<dt>Actividad</dt><dd>${esc(nota.actividadEtiqueta)}</dd>` : ""}
      <dt>Visible para instancia</dt><dd>${nota.visibleCliente ? "Sí" : "No"}</dd>
      <dt>Bandera</dt><dd>${controlBandera(nota)}</dd>
    </dl>
    <h4>Anotación</h4><p class="seg-texto">${esc(nota.nota || "—")}</p>
  </section>`, null, { textoCerrar: "Cerrar" });
}

function dlgBandera(boton) {
  const detalle = S.det;
  if (!detalle || !(detalle.puedeMarcarBanderas ?? puedeAnotar())) return;
  const id = boton.dataset.segrel;
  const registro = detalle.seguimiento.find(s => s.id === id);
  if (!registro) return;
  const actual = banderaSeg(registro);
  const admiteAtencion = Object.hasOwn(SEG_BANDERAS, registro.bandera);
  const opciones = Object.entries(SEG_BANDERAS).map(([clave, { nombre, clase }]) => `
    <label class="seg-opcion ${clase}">
      <input type="radio" name="banderaSeguimiento" value="${clave}" ${clave === actual ? "checked" : ""}
        ${clave === "ATENCION" && !admiteAtencion ? "disabled" : ""}>
      ${iconoBandera}<span>${nombre}</span>
    </label>`).join("");
  // Un diálogo separado conserva la ficha del requerimiento y su anotación en edición.
  const modal = document.createElement("dialog");
  modal.setAttribute("aria-label", "Bandera de seguimiento");
  modal.innerHTML = `<form method="dialog" class="seg-dialogo">
    <h3>Bandera de seguimiento</h3>
    <fieldset class="seg-opciones"><legend>Elige un estado</legend>${opciones}</fieldset>
    <p class="seg-error" role="alert" hidden></p>
    <div class="dlg-acts"><button class="btn" value="cancelar">Cancelar</button>
      <button class="btn pri" value="guardar">Guardar</button></div>
  </form>`;
  const form = modal.querySelector("form");
  const guardar = form.querySelector('[value="guardar"]');
  const error = form.querySelector(".seg-error");
  form.addEventListener("submit", async e => {
    if (e.submitter?.value === "cancelar") return;
    e.preventDefault();
    const bandera = form.elements.banderaSeguimiento.value;
    if (!bandera || bandera === actual) { modal.close(); return; }
    if (guardar.disabled) return;
    guardar.disabled = true;
    error.hidden = true;
    const r = await tarea(() => api("SEG_RELEVANCIA", {
      segId: id, bandera, relevante: bandera === "DIFICULTAD", vista: S.modo
    }));
    guardar.disabled = false;
    if (!r) {
      error.textContent = "No se pudo guardar la bandera. Inténtalo de nuevo.";
      error.hidden = false;
      return;
    }
    if (S.det === detalle) {
      registro.relevante = bandera === "DIFICULTAD";
      if (admiteAtencion) registro.bandera = r.bandera || bandera;
      if (boton.isConnected && boton.closest(".req-seg, .seg-detalle")) boton.outerHTML = controlBandera(registro);
      pintarSegTabla();
      pintarReqTabla();
    }
    modal.close();
    document.querySelector(`[data-segrel="${CSS.escape(id)}"]:is(.req-seg *, .seg-detalle *, #segTabla *)`)?.focus({ preventScroll: true });
  });
  modal.addEventListener("close", () => modal.remove(), { once: true });
  document.body.append(modal);
  modal.showModal();
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
  const max = S.ctx.reglas?.maxCargaMB || 1024;
  const limite = max >= 1024 ? `${max / 1024} GB` : `${max} MB`;
  const nombreIns = ins(x.instanciaId)?.nombre || "la instancia";
  dialogo(`<h3>Subir documento</h3><p class="muted">${esc(x.etiqueta)}</p>
    <label class="f">Archivo · Cualquier formato · Máximo ${limite}<input type="file" id="dFile"></label>
    <label class="check"><input type="checkbox" id="dNom"> La instancia lo entregó por otro medio: registrarlo en nombre de ${esc(nombreIns)}</label>
    <label class="f" id="dMedioBox" hidden>Medio de recepción<select id="dMedio">${Object.entries(MEDIOS).map(([k, t]) => `<option value="${k}">${t}</option>`).join("")}</select></label>
    <label class="f">Anotación (opcional)<textarea id="dNota" rows="2"></textarea></label>
    <div class="upbar" id="dProg" hidden><span></span></div>
    <p class="muted xs">El archivo se guarda en la carpeta de Drive configurada para el proyecto. Recibe un nombre con folio de proyecto, requerimiento y consecutivo. Se conservan todos los documentos; el requerimiento queda Entregado, pendiente de validación.</p>`,
  async () => {
    const f = $("#dFile").files?.[0];
    if (!f) { aviso("Elige un archivo.", "bad"); return; }
    if (!f.size) { aviso("El archivo está vacío.", "bad"); return; }
    if (f.size > max * 1048576) { aviso(`El archivo supera ${limite}.`, "bad"); return; }
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
        subido = { archivo: f, driveFileId: meta.id, cargaId: prep.cargaId };
      }
      const r = await api("CARGA_CONFIRMAR", { prqId: id, driveFileId: subido.driveFileId, cargaId: subido.cargaId, enNombreDe, medio, nota });
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

async function consultarArchivo(id, accion) {
  const ventana = accion === 'visualizar' ? window.open('about:blank', '_blank') : null;
  if (ventana) { ventana.opener = null; ventana.document.body.textContent = 'Preparando documento…'; }
  try {
    const r = await prepararDocumento(id, S.modo, accion);
    if (r.sinVista) {
      ventana?.close();
      dialogo(`<h3>Sin vista previa</h3><p class="muted">Este formato requiere una aplicación compatible. Puedes descargarlo.</p><button class="btn pri" data-descargar="${esc(id)}">Descargar</button>`, null);
      return;
    }
    if (accion === 'visualizar') {
      if (ventana) ventana.location.replace(r.url);
      else dialogo(`<h3>Documento listo</h3><p class="muted xs">La visualización depende del formato y del dispositivo.</p><a class="btn pri" href="${esc(r.url)}" target="_blank" rel="noopener">Abrir visor</a>`, null);
    } else {
      if (r.tamano <= 16 * 1024 * 1024) {
        const respuesta = await fetch(r.url, { cache: 'no-store' });
        if (!respuesta.ok) throw new Error(await respuesta.text() || 'No se pudo descargar el documento.');
        const url = URL.createObjectURL(await respuesta.blob());
        const a = document.createElement('a'); a.href = url; a.download = r.nombre;
        const contenedor = document.querySelector('dialog[open] #dlgBody') || document.body;
        contenedor.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else {
        const frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'Descarga de documento'; frame.src = r.url; document.body.appendChild(frame);
      }
      aviso('Descarga iniciada. Algunos formatos requieren una aplicación compatible.');
    }
  } catch (error) { ventana?.close(); aviso(error.message || 'No se pudo consultar el documento.', 'bad'); }
}

// ── Eventos ──────────────────────────────────────────────────
document.addEventListener("click", e => {
  const ordenar = e.target.closest("[data-tabla-orden]");
  if (ordenar) {
    const { tablaOrden: tipo, columna } = ordenar.dataset;
    const tabla = TABLAS[tipo];
    tabla.sentido = tabla.columna === columna ? -tabla.sentido : 1;
    tabla.columna = columna;
    (tipo === "req" ? pintarReqTabla : pintarSegTabla)();
    $(`[data-tabla-orden="${tipo}"][data-columna="${columna}"]`)?.focus({ preventScroll: true });
    return;
  }
  const fila = e.target.closest("tr[data-rq]");
  if (fila && !e.target.closest("button, select, input, label, a, .rt-casilla")) { dlgDetalleReq(fila.dataset.rq); return; }
  if (e.target.closest("[data-rcols]")) { const r = $("#rcols"); if (r) r.hidden = !r.hidden; return; }
  const filtroBandera = e.target.closest("[data-filtro-bandera]");
  document.querySelectorAll("[data-filtro-bandera][open]").forEach(filtro => {
    if (filtro !== filtroBandera) filtro.open = false;
  });
  const opcionBandera = e.target.closest("[data-seg-filtro]");
  if (opcionBandera && filtroBandera) {
    const clave = opcionBandera.dataset.segFiltro;
    const esChecklist = filtroBandera.dataset.filtroBandera === "requerimientos";
    if (esChecklist) S.reqF.bandera = clave;
    else S.segBandera = clave;
    filtroBandera.querySelector(".seg-filtro-valor").innerHTML = etiquetaFiltroBandera(clave);
    filtroBandera.querySelectorAll("[data-seg-filtro]").forEach(b => b.setAttribute("aria-pressed", String(b === opcionBandera)));
    filtroBandera.open = false;
    filtroBandera.querySelector("summary").focus();
    if (esChecklist) pintarReqTabla();
    else pintarSegTabla();
    return;
  }
  const sr = e.target.closest("[data-segrel]");
  if (sr) { dlgBandera(sr); return; }
  const verNota = e.target.closest("[data-ver-anotacion]");
  if (verNota) { dlgDetalleSeg(verNota.dataset.verAnotacion); return; }
  const filaNota = e.target.closest("tr[data-segdetalle]");
  if (filaNota && !e.target.closest("button, a, .rt-casilla")) { dlgDetalleSeg(filaNota.dataset.segdetalle); return; }
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
  if (d.resumen) {
    S.resumen = d.resumen;
    if (location.hash === "#/inicio") {
      Object.assign(S, { estatus: "TODOS", q: "", tipo: "" });
      location.hash = "#/";
      return;
    }
    document.querySelectorAll("[data-resumen]").forEach(b => b.setAttribute("aria-pressed", String(b === t)));
    pintarTarjetas();
    return;
  }
  if (d.pry) { S.tab = "checklist"; S.filtroReq = "TODOS"; location.hash = `#/p/${d.pry}`; return; }
  if (d.hito && S.det?.puedeMarcarHitos) {
    const proyectoId = S.det.proyecto.id;
    const linea = t.closest(".hitos-desplazable");
    t.disabled = true;
    tarea(() => api("HITO_MARCA", { proyectoId, hitoId: d.hito, valor: d.on === "1", solicitudId: crypto.randomUUID() }))
      .then(async r => {
        if (!r || S.det?.proyecto?.id !== proyectoId || !linea.isConnected) return;
        const scroll = linea.scrollLeft;
        await trasCambio(r);
        if (S.det?.proyecto?.id !== proyectoId) return;
        const actual = $(".hitos-desplazable");
        if (actual) actual.scrollLeft = scroll;
        actual?.querySelector(`[data-hito="${CSS.escape(d.hito)}"]`)?.focus({ preventScroll: true });
      })
      .finally(() => { t.disabled = false; });
    return;
  }
  if (d.tab) { S.tab = d.tab; pintarProyecto(); return; }
  if (d.indmin !== undefined) { S.indMin = d.indmin === "1"; pintarProyecto(); return; }
  if (d.estado) { dlgEstado(d.req, d.estado); return; }
  if (d.espera !== undefined) { tarea(() => api("REQ_ESPERA_DOC", { prqId: d.req, espera: d.espera === "1" })).then(trasCambio); return; }
  if (d.editar) { dlgEditar(d.editar); return; }
  if ("nuevoreq" in d) { dlgNuevoReq(); return; }
  if (d.anotar) { dlgAnotar(d.anotar); return; }
  if (d.subir) { dlgSubir(d.subir); return; }
  if (d.ver) { consultarArchivo(d.ver, "visualizar"); return; }
  if (d.descargar) { consultarArchivo(d.descargar, "descargar"); return; }
  if (d.act === "anotarGeneral") {
    const actividadId = $("#segAct")?.value || "", cumpleActividad = !!actividadId && $("#segCumple").checked;
    tarea(() => api("ANOTAR", { proyectoId: S.det.proyecto.id, prqId: $("#segReq").value, nota: $("#segNota").value, visibleCliente: $("#segVis").checked, actividadId, cumpleActividad }))
      .then(async r => { if (r && cumpleActividad) await recargarActividades(); return trasCambio(r); });
  }
});
document.addEventListener("change", e => {
  const control = e.target;
  const { tablaVista, tablaFila, tablaTodas } = control.dataset;
  if (tablaVista) {
    TABLAS[tablaVista].vista = control.value;
    (tablaVista === "req" ? pintarReqTabla : pintarSegTabla)();
    return;
  }
  const tipo = tablaFila || tablaTodas;
  if (tipo) {
    const contenedor = $(`#${tipo}Tabla`);
    const { ids, vista } = TABLAS[tipo];
    const filas = tablaTodas ? contenedor.querySelectorAll("[data-tabla-fila]") : [control];
    for (const fila of filas) {
      fila.checked = control.checked;
      if (fila.checked) ids.add(fila.value);
      else ids.delete(fila.value);
    }
    if (vista) {
      (tipo === "req" ? pintarReqTabla : pintarSegTabla)();
      $(`[data-tabla-vista="${tipo}"]`)?.focus({ preventScroll: true });
    } else {
      actualizarCasillaCabecera(contenedor);
    }
    return;
  }
  if (control.id === "filtroReqRapido") { S.filtroReq = control.value; pintarReqTabla(); return; }
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
  if (e.target.id === "fEstatus") { S.estatus = e.target.value; pintarTarjetas(); }
  if (e.target.id === "fTipo") { S.tipo = e.target.value; pintarTarjetas(); }
  if (e.target.id === "pFoto") { const f = e.target.files?.[0]; if (f) pintarAvatar($("#pAvatar"), URL.createObjectURL(f), ""); }
});
document.addEventListener("input", e => {
  if (e.target.id === "reqQ") { S.reqQ = e.target.value; pintarReqTabla(); }
  if (e.target.id === "segQ") { S.segQ = e.target.value; const x = document.querySelector("[data-segx]"); if (x) x.hidden = !S.segQ; pintarSegTabla(); }
  if (e.target.id === "fBuscar") { S.q = e.target.value; pintarTarjetas(); }
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const filtro = e.target.closest?.("[data-filtro-bandera][open]");
  if (filtro) {
    e.preventDefault();
    filtro.open = false;
    filtro.querySelector("summary").focus();
    return;
  }
  cerrarMenu(true);
});
$("#dlg").addEventListener("close", () => { alEnviar = null; $("#dlgBody video")?.pause(); });

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("./sw.js").catch(() => {}); });
}

iniciar().finally(() => window.dispatchEvent(new Event("gestion:ready")));

