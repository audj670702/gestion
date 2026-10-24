// SCaD Gestión · Programación · v0.3.0
// Mismo modelo que NEXUS (schedule.js): las actividades llegan en el contexto SYS
// (`actividades` o `programacion`), las captura el ADM en el panel y aquí son de consulta.
// Vistas Calendario / Lista, filtro por tipo, búsqueda y detalle.

let ctx = null;
let vista = "calendario";
let tipo = "TODAS";
let q = "";
let cursor = new Date();
let caja = null;

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = v => String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
export const actividades = c => Array.isArray(c?.actividades) ? c.actividades : (Array.isArray(c?.programacion) ? c.programacion : []);
const lista = () => actividades(ctx);
export const inicio = a => new Date(a?.inicio || a?.fechaInicio || a?.fecha || a?.start || "");
const fin = a => (a?.fin || a?.fechaFin || a?.end) ? new Date(a.fin || a.fechaFin || a.end) : null;
export const titulo = a => String(a?.titulo || a?.nombre || a?.actividad || "Actividad");
export const tipoDe = a => String(a?.tipoActividad || a?.tipo || a?.categoria || "Actividad").trim() || "Actividad";
const lugar = a => String(a?.ubicacion || a?.lugar || "");
const detalle = a => String(a?.descripcion || a?.detalle || "");
const idDe = (a, i) => String(a?.id || a?._id || i);
const todoDia = a => a?.todoElDia === true || a?.allDay === true;
const diaClave = d => Number.isNaN(d?.getTime?.()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const hora = a => { if (todoDia(a)) return "Todo el día"; const d = inicio(a); return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); };
export function colorTipo(t) { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 58% 42%)`; }

// Actividades que ocurren hoy (también las de varios días que siguen en curso).
export function deHoy(c) {
  const h = new Date(), ini = new Date(h.getFullYear(), h.getMonth(), h.getDate()).getTime(), finDia = ini + 86400000;
  return actividades(c).filter(a => {
    const s = inicio(a).getTime(); if (Number.isNaN(s)) return false;
    const fe = fin(a), f = fe && !Number.isNaN(fe.getTime()) ? fe.getTime() : s;
    return s < finDia && f >= ini;
  }).sort((a, b) => inicio(a) - inicio(b));
}

function filtradas() {
  const n = norm(q);
  return lista().filter(a => (tipo === "TODAS" || tipoDe(a) === tipo) && (!n || norm([titulo(a), tipoDe(a), lugar(a), detalle(a)].join(" ")).includes(n)))
    .slice().sort((a, b) => inicio(a) - inicio(b));
}

function pintarTipos() {
  const tipos = [...new Set(lista().map(tipoDe))].sort((a, b) => a.localeCompare(b, "es"));
  caja.querySelector("#prgTipos").innerHTML = tipos.length < 2 ? "" : ["TODAS", ...tipos].map(t =>
    `<button type="button" class="${tipo === t ? "on" : ""}" data-prg-tipo="${esc(t)}">${t === "TODAS" ? "" : `<i style="--c:${colorTipo(t)}"></i>`}${esc(t === "TODAS" ? "Todos" : t)}</button>`).join("");
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
      `<button type="button" class="prg-ev" style="--c:${colorTipo(tipoDe(a))}" data-prg-id="${esc(idDe(a, lista().indexOf(a)))}"><small>${esc(hora(a))}</small><b>${esc(titulo(a))}</b></button>`).join("")}</div>`);
  }
  return `<div class="prg-mes"><button type="button" class="btn sm" data-prg-mes="-1" aria-label="Mes anterior">‹</button><strong>${esc(primero.toLocaleDateString("es-MX", { month: "long" }).replace(/^./, c => c.toUpperCase()) + " " + y)}</strong><button type="button" class="btn sm" data-prg-mes="1" aria-label="Mes siguiente">›</button></div>
    <div class="prg-sem"><span>LUN</span><span>MAR</span><span>MIÉ</span><span>JUE</span><span>VIE</span><span>SÁB</span><span>DOM</span></div>
    <div class="prg-grid">${celdas.join("")}</div>`;
}

function pintarLista() {
  const L = filtradas();
  if (!L.length) return `<div class="empty">${lista().length ? "No hay actividades para este criterio." : "Aún no hay actividades programadas."}</div>`;
  let ult = "";
  return `<div class="prg-lista">${L.map(a => {
    const d = inicio(a), k = diaClave(d);
    const cab = k !== ult ? (ult = k, `<div class="prg-ldia">${esc(Number.isNaN(d.getTime()) ? "Sin fecha" : d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }))}</div>`) : "";
    return cab + `<button type="button" class="prg-item" data-prg-id="${esc(idDe(a, lista().indexOf(a)))}"><span class="prg-hora">${esc(hora(a))}</span><i style="--c:${colorTipo(tipoDe(a))}"></i><span class="prg-copy"><b>${esc(titulo(a))}</b><span>${esc(tipoDe(a) + (lugar(a) ? " · " + lugar(a) : ""))}</span></span><span class="muted">›</span></button>`;
  }).join("")}</div>`;
}

function pintarDetalle(a) {
  const s = inicio(a), e = fin(a);
  const fila = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : "";
  caja.querySelector("#prgCuerpo").innerHTML = `<button type="button" class="back-btn" data-prg-volver>‹ Volver</button>
    <div class="card ficha"><div class="row"><h3>${esc(titulo(a))}</h3><span class="chip" style="background:color-mix(in srgb,${colorTipo(tipoDe(a))} 14%,#fff);color:${colorTipo(tipoDe(a))}">${esc(tipoDe(a))}</span></div>
    <dl>
      ${fila("Inicio", esc(Number.isNaN(s.getTime()) ? "—" : (todoDia(a) ? s.toLocaleDateString("es-MX", { dateStyle: "full" }) + " · Todo el día" : s.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" }))))}
      ${e && !Number.isNaN(e.getTime()) ? fila("Término", esc(e.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" }))) : ""}
      ${fila("Lugar", esc(lugar(a)))}
      ${fila("Detalle", esc(detalle(a)))}
      ${a?.enlace ? fila("Enlace", `<a href="${esc(a.enlace)}" target="_blank" rel="noopener noreferrer">Abrir ↗</a>`) : ""}
    </dl></div>`;
}

function pintar() {
  pintarTipos();
  caja.querySelectorAll("[data-prg-vista]").forEach(b => b.classList.toggle("on", b.dataset.prgVista === vista));
  caja.querySelector("#prgCuerpo").innerHTML = vista === "calendario" ? pintarCalendario() : pintarLista();
}

// Pinta la sección en el contenedor; `id` abre directo una actividad (p. ej. desde "Hoy").
export function abrirProgramacion(contenedor, contexto, id = "") {
  ctx = contexto; caja = contenedor;
  const h = new Date(); cursor = new Date(h.getFullYear(), h.getMonth(), 1);
  vista = "calendario"; tipo = "TODAS"; q = "";
  caja.innerHTML = `<section class="hero"><h1>Programación</h1><p class="muted">Actividades de la EO.</p></section>
    <div class="buscar"><div class="seg-sw" role="group" aria-label="Vista de programación"><button type="button" data-prg-vista="calendario">Calendario</button><button type="button" data-prg-vista="lista">Lista</button></div>
      <input type="search" id="prgBuscar" placeholder="Buscar actividad, tipo, lugar…" autocomplete="off" enterkeyhint="search"></div>
    <nav class="seg prg-tipos" id="prgTipos" aria-label="Filtrar por tipo"></nav>
    <section id="prgCuerpo"></section>`;
  pintar();
  if (id) { const a = lista().find((x, i) => idDe(x, i) === id); if (a) pintarDetalle(a); }
}

document.addEventListener("click", e => {
  if (!caja || !caja.contains(e.target)) return;
  const t = e.target.closest("button"); if (!t) return;
  const d = t.dataset;
  if (d.prgVista) { vista = d.prgVista; pintar(); }
  else if (d.prgTipo) { tipo = d.prgTipo; pintar(); }
  else if (d.prgMes) { cursor = new Date(cursor.getFullYear(), cursor.getMonth() + Number(d.prgMes), 1); pintar(); }
  else if (d.prgId) { const a = lista().find((x, i) => idDe(x, i) === d.prgId); if (a) pintarDetalle(a); }
  else if ("prgVolver" in d) pintar();
});
document.addEventListener("input", e => {
  if (e.target.id === "prgBuscar") { q = e.target.value; pintar(); }
});
