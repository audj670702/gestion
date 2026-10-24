// SCaD Gestión · Programación · v0.4.0
// Modelo NEXUS (schedule.js) extendido, compatible hacia atrás:
//   origen  ADM (requerida, la captura el ADM)  |  USUARIO (propia del colaborador, ligada a un proyecto)
//   estado  PROGRAMADA | CUMPLIDA   (sin estado = sólo informativa, como en NEXUS)
// Este módulo sólo presenta (calendario, lista, filtros). Al tocar una actividad emite
// data-actividad="<id>"; el detalle y las acciones viven en app.js.

let ctx = null;
let vista = "calendario";
let tipo = "TODAS";
let origen = "TODAS";
let q = "";
let cursor = new Date();
let caja = null;
let opciones = {};

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = v => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const actividades = c => Array.isArray(c?.actividades) ? c.actividades : (Array.isArray(c?.programacion) ? c.programacion : []);
const lista = () => actividades(ctx);
export const inicio = a => new Date(a?.inicio || a?.fechaInicio || a?.fecha || a?.start || "");
export const fin = a => (a?.fin || a?.fechaFin || a?.end) ? new Date(a.fin || a.fechaFin || a.end) : null;
export const titulo = a => String(a?.titulo || a?.nombre || a?.actividad || "Actividad");
export const tipoDe = a => String(a?.tipoActividad || a?.tipo || a?.categoria || "Actividad").trim() || "Actividad";
export const lugar = a => String(a?.ubicacion || a?.lugar || "");
export const detalle = a => String(a?.descripcion || a?.detalle || "");
export const todoDia = a => a?.todoElDia === true || a?.allDay === true;
export const origenDe = a => String(a?.origen || "").toUpperCase() === "USUARIO" ? "USUARIO" : "ADM";
export const cumplida = a => String(a?.estado || "").toUpperCase() === "CUMPLIDA";
export const programada = a => String(a?.estado || "").toUpperCase() === "PROGRAMADA";
// Sin cumplir: programada y ya pasó su término (o su día, si es de todo el día).
export function sinCumplir(a) {
  if (!programada(a)) return false;
  const f = fin(a), s = inicio(a);
  const limite = f && !Number.isNaN(f.getTime()) ? f : (todoDia(a) ? new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1) : s);
  return !Number.isNaN(limite.getTime()) && limite < new Date();
}
export const idDe = a => { const i = lista().indexOf(a); return String(a?.id || a?._id || `i${i}`); };
export const buscarActividad = id => lista().find(a => idDe(a) === String(id)) || null;
const diaClave = d => Number.isNaN(d?.getTime?.()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hora = a => { if (todoDia(a)) return "Todo el día"; const d = inicio(a); return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); };
export function colorTipo(t) { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 58% 42%)`; }
const clases = a => [origenDe(a) === "USUARIO" ? "propia" : "", cumplida(a) ? "hecha" : "", sinCumplir(a) ? "vencida" : ""].join(" ");
const marca = a => cumplida(a) ? `<em class="ok">✓</em>` : sinCumplir(a) ? `<em class="bad">!</em>` : "";

export function setContexto(c) { ctx = c; }

// Actividades que ocurren hoy (también las de varios días que siguen en curso).
export function deHoy(c) {
  const h = new Date(), ini = new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime(), finDia = ini + 86400000;
  return actividades(c).filter(a => {
    const s = inicio(a).getTime(); if (Number.isNaN(s)) return false;
    const fe = fin(a), f = fe && !Number.isNaN(fe.getTime()) ? fe.getTime() : s;
    return s < finDia && f >= ini;
  }).sort((a, b) => inicio(a) - inicio(b));
}

// Lista agrupada por día (sección Programación y agenda del proyecto).
export function listaHtml(L, vacio = "Aún no hay actividades programadas.") {
  if (!L.length) return `<div class="empty">${vacio}</div>`;
  let ult = "";
  return `<div class="prg-lista">${L.map(a => {
    const d = inicio(a), k = diaClave(d);
    const cab = k !== ult ? (ult = k, `<div class="prg-ldia">${esc(Number.isNaN(d.getTime()) ? "Sin fecha" : d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined }))}</div>`) : "";
    const sub = [origenDe(a) === "USUARIO" ? "Propia" : "Requerida", tipoDe(a), a.proyectoFolio, lugar(a)].filter(Boolean).join(" · ");
    return cab + `<button type="button" class="prg-item ${clases(a)}" data-actividad="${esc(idDe(a))}"><span class="prg-hora">${esc(hora(a))}</span><i style="--c:${colorTipo(tipoDe(a))}"></i><span class="prg-copy"><b>${marca(a)}${esc(titulo(a))}</b><span>${esc(sub)}</span></span><span class="muted">›</span></button>`;
  }).join("")}</div>`;
}

function filtradas() {
  const n = norm(q);
  return lista().filter(a => (tipo === "TODAS" || tipoDe(a) === tipo) && (origen === "TODAS" || origenDe(a) === origen)
    && (!n || norm([titulo(a), tipoDe(a), lugar(a), detalle(a), a.proyectoFolio, a.proyectoNombre].join(" ")).includes(n)))
    .slice().sort((a, b) => inicio(a) - inicio(b));
}

function pintarFiltros() {
  const tipos = [...new Set(lista().map(tipoDe))].sort((a, b) => a.localeCompare(b, "es"));
  const hayPropias = lista().some(a => origenDe(a) === "USUARIO");
  caja.querySelector("#prgOrigen").innerHTML = !hayPropias && !opciones.puedeProgramar ? "" : [["TODAS", "Todas"], ["ADM", "Requeridas"], ["USUARIO", "Propias"]].map(([k, t]) =>
    `<button type="button" class="${origen === k ? "on" : ""}" data-prg-origen="${k}">${k === "TODAS" ? "" : `<i class="ori ${k === "USUARIO" ? "propia" : ""}"></i>`}${t}</button>`).join("");
  caja.querySelector("#prgTipos").innerHTML = tipos.length < 2 ? "" : ["TODAS", ...tipos].map(t =>
    `<button type="button" class="${tipo === t ? "on" : ""}" data-prg-tipo="${esc(t)}">${t === "TODAS" ? "" : `<i style="--c:${colorTipo(t)}"></i>`}${esc(t === "TODAS" ? "Todos los tipos" : t)}</button>`).join("");
}

function pintarCalendario() {
  const L = filtradas(), y = cursor.getFullYear(), m = cursor.getMonth(), primero = new Date(y, m, 1);
  const dias = new Date(y, m + 1, 0).getDate(), desfase = (primero.getDay() + 6) % 7, por = new Map();
  L.forEach(a => { const k = diaClave(inicio(a)); if (!k) return; if (!por.has(k)) por.set(k, []); por.get(k).push(a); });
  const celdas = Array.from({ length: desfase }, () => `<div class="prg-dia vacio"></div>`);
  const hoy = diaClave(new Date());
  for (let d = 1; d <= dias; d++) {
    const k = diaClave(new Date(y, m, d)), items = por.get(k) || [];
    celdas.push(`<div class="prg-dia ${k === hoy ? "hoy" : ""}"><span class="prg-num">${d}</span>${items.map(a =>
      `<button type="button" class="prg-ev ${clases(a)}" style="--c:${colorTipo(tipoDe(a))}" data-actividad="${esc(idDe(a))}"><small>${esc(hora(a))}</small><b>${marca(a)}${esc(titulo(a))}</b></button>`).join("")}</div>`);
  }
  return `<div class="prg-mes"><button type="button" class="btn sm" data-prg-mes="-1" aria-label="Mes anterior">‹</button><strong>${esc(primero.toLocaleDateString("es-MX", { month: "long" }).replace(/^./, c => c.toUpperCase()) + " " + y)}</strong><button type="button" class="btn sm" data-prg-mes="1" aria-label="Mes siguiente">›</button></div>
    <div class="prg-sem"><span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span></div>
    <div class="prg-grid">${celdas.join("")}</div>`;
}

function pintar() {
  pintarFiltros();
  caja.querySelectorAll("[data-prg-vista]").forEach(b => b.classList.toggle("on", b.dataset.prgVista === vista));
  caja.querySelector("#prgCuerpo").innerHTML = vista === "calendario" ? pintarCalendario()
    : listaHtml(filtradas(), lista().length ? "No hay actividades para este criterio." : "Aún no hay actividades programadas.");
}

// Pinta la sección en el contenedor. opciones.puedeProgramar muestra «+ Programar» (data-programar).
export function abrirProgramacion(contenedor, contexto, opc = {}) {
  ctx = contexto; caja = contenedor; opciones = opc;
  const h = new Date(); cursor = new Date(h.getFullYear(), h.getMonth(), 1);
  vista = "calendario"; tipo = "TODAS"; origen = "TODAS"; q = "";
  caja.innerHTML = `<section class="hero"><div class="row"><h1>Programación</h1>${opc.puedeProgramar ? `<button type="button" class="btn pri sm" data-programar="">+ Programar</button>` : ""}</div>
      <p class="muted">${esc(opc.subtitulo || "Actividades de la EO.")}</p></section>
    <div class="buscar"><div class="seg-sw" role="group" aria-label="Vista de programación"><button type="button" data-prg-vista="calendario">Calendario</button><button type="button" data-prg-vista="lista">Lista</button></div>
      <input type="search" id="prgBuscar" placeholder="Buscar actividad, tipo, proyecto, lugar…" autocomplete="off" enterkeyhint="search"></div>
    <nav class="seg sm" id="prgOrigen" aria-label="Filtrar por origen"></nav>
    <nav class="seg sm prg-tipos" id="prgTipos" aria-label="Filtrar por tipo"></nav>
    <section id="prgCuerpo"></section>`;
  pintar();
}

// Vuelve a pintar conservando vista, mes y filtros (tras guardar o cumplir).
export function repintarProgramacion(contexto) {
  ctx = contexto;
  if (caja && caja.isConnected && caja.querySelector("#prgCuerpo")) pintar();
}

document.addEventListener("click", e => {
  if (!caja || !caja.contains(e.target)) return;
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.prgVista) { vista = d.prgVista; pintar(); }
  else if (d.prgTipo) { tipo = d.prgTipo; pintar(); }
  else if (d.prgOrigen) { origen = d.prgOrigen; pintar(); }
  else if (d.prgMes) { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + Number(d.prgMes), 1); pintar(); }
});
document.addEventListener("input", e => {
  if (e.target.id === "prgBuscar") { q = e.target.value; pintar(); }
});
