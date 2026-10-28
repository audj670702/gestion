// SCaD Gestión · Bienvenida · v0.6.0
// Pantalla de bienvenida. Usa sólo datos ya cargados por app.js (contexto y proyectos de la vista):
// no hace consultas nuevas. Visitante: presentación y planes. Usuario: resumen del día según el rol.
import { deHoy, cumplida, sinCumplir, titulo, hora, tipoDe, origenDe, colorDe, idDe } from "./programacion.js";

// Liga de compra de planes (Wix Pricing Plans). Pendiente: definir la URL pública de la página de planes.
// Mientras esté vacía, el botón de compra no se muestra.
export const PLANES_URL = "";

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PLANES = [
  { clave: "BASICO", nombre: "Básico", proyectos: 5, usuarios: 10, precio: 590, img: "./css/plan_basico_1.png", id: "46323474-9680-40f1-9bbc-c4913d4355f4" },
  { clave: "ESTANDAR", nombre: "Estándar", proyectos: 15, usuarios: 30, precio: 1299, img: "./css/plan_estandar_1.png", id: "618b8e77-7b16-4513-bc18-44be04c87fca" },
  { clave: "PRO", nombre: "PRO", proyectos: 30, usuarios: 50, precio: 2690, img: "./css/plan_pro_1.png", id: "e9500305-eeb2-46ee-ac6d-033e085d3b66" }
];

// ── Visitante (sin sesión, o con sesión sin vista asignada) ──
export function bienvenidaVisitante({ sesion = false, nombre = "" } = {}) {
  const planes = PLANES.map(p => `
    <figure class="plan plan-${p.clave.toLowerCase()}" data-plan="${p.id}">
      <img src="${p.img}" alt="Plan ${p.nombre} GESTIÓN" loading="lazy">
      <figcaption>
        <b>${p.nombre}</b>
        <span>$${p.precio.toLocaleString("es-MX")} MXN al mes</span>
        <span>Hasta ${p.proyectos} proyectos · ${p.usuarios} usuarios</span>
        <span class="prueba">14 días de prueba</span>
      </figcaption>
    </figure>`).join("");
  const compra = PLANES_URL ? `<a class="btn pri lg block" href="${esc(PLANES_URL)}" target="_blank" rel="noopener">Ver planes y comprar</a>` : "";
  const cabecera = sesion
    ? `<h1>Hola, ${esc(nombre)}</h1><p>Tu cuenta no tiene una vista asignada en SCaD Gestión. Si ya compraste un plan, regístrate en la página de tu empresa o pide al administrador que te asigne un rol.</p>`
    : `<h1 class="sr-only">SCaD GESTIÓN</h1><p class="bien-lead">Seguimiento de proyectos y expediente técnico, con el checklist de integración y la programación de cada proyecto.</p>`;
  const pie = sesion
    ? `<button class="btn" data-menu="logout">Cerrar sesión</button>`
    : `<button class="btn" id="btnLogin">Iniciar sesión</button>`;
  return `${cabecera}
    <div class="bien-planes" aria-label="Planes">${planes}</div>
    <p class="muted sm">Más de 30 proyectos o 50 usuarios: atención por contacto.</p>
    ${compra}
    <div class="bien-pie">${pie}</div>`;
}

// ── Usuario (sesión y vista asignada) ──
// ctx: contexto SYS/GESTIÓN ya cargado. modo: vista activa. proyectos: lista de la vista activa.
export function bienvenidaUsuario({ ctx, modo, proyectos, esAdm, nombre, eoNombre, rolEtiqueta }) {
  const activos = (proyectos || []).filter(p => p.fase !== "CERRADO");
  const suma = k => activos.reduce((n, p) => n + (p.checklist?.[k] || 0), 0);
  const hoy = deHoy(ctx);
  const pendientesHoy = hoy.filter(a => !cumplida(a) && !sinCumplir(a));
  const vencidasHoy = hoy.filter(a => sinCumplir(a));
  const mostrarChecklist = modo !== "INSTANCIA";

  const resumen = [
    `<div class="kpi"><b>${activos.length}</b><span>Proyectos activos</span></div>`,
    mostrarChecklist ? `<div class="kpi warn"><b>${suma("entregados")}</b><span>Por revisar</span></div>` : "",
    mostrarChecklist ? `<div class="kpi bad"><b>${suma("vencidos")}</b><span>Vencidos</span></div>` : "",
    `<div class="kpi"><b>${hoy.length}</b><span>Actividades hoy</span></div>`
  ].join("");

  const actividades = hoy.length
    ? `<div class="bien-hoy">${hoy.slice(0, 4).map(a => `
        <a class="hoy-item ${origenDe(a) === "USUARIO" ? "propia" : ""}" href="#/programacion/${encodeURIComponent(idDe(a))}">
          <span class="prg-hora">${esc(hora(a))}</span><i style="--c:${colorDe(a)}"></i>
          <span class="prg-copy"><b>${cumplida(a) ? "✓ " : sinCumplir(a) ? "⚠ " : ""}${esc(titulo(a))}</b>
          <span>${esc([origenDe(a) === "USUARIO" ? "Propia" : "Requerida", tipoDe(a), a.proyectoFolio].filter(Boolean).join(" · "))}</span></span>
        </a>`).join("")}
        ${hoy.length > 4 ? `<p class="muted xs">y ${hoy.length - 4} más</p>` : ""}</div>`
    : `<p class="muted">Hoy no tienes actividades programadas.</p>`;

  const avisos = [
    vencidasHoy.length ? `<span class="chip bad">${vencidasHoy.length} actividad${vencidasHoy.length > 1 ? "es" : ""} sin cumplir</span>` : "",
    mostrarChecklist && suma("vencidos") ? `<span class="chip bad">${suma("vencidos")} documentos vencidos</span>` : "",
    mostrarChecklist && suma("entregados") ? `<span class="chip warn">${suma("entregados")} por revisar</span>` : "",
    pendientesHoy.length && !vencidasHoy.length ? `<span class="chip info">${pendientesHoy.length} pendiente${pendientesHoy.length > 1 ? "s" : ""} de hoy</span>` : ""
  ].filter(Boolean).join("");

  // Acciones según el alcance del rol (mismas vistas que el menú de cuenta).
  const accesos = [];
  accesos.push(`<button class="bien-acc" data-bien="#/"><b>${modo === "OPERACION" ? "Mis proyectos" : "Proyectos"}</b><span>${esc(rolEtiqueta)}</span></button>`);
  accesos.push(`<button class="bien-acc" data-bien="#/programacion"><b>Programación</b><span>Actividades y calendario</span></button>`);
  if (esAdm) {
    ["DIRECCION", "OPERACION", "INSTANCIA"].filter(m => m !== modo).forEach(m => {
      const et = { DIRECCION: "Dirección", OPERACION: "Operación", INSTANCIA: "Instancia" }[m];
      accesos.push(`<button class="bien-acc" data-modo="${m}"><b>Vista ${et}</b><span>Cambiar de vista</span></button>`);
    });
    accesos.push(`<button class="bien-acc" data-bien="panel"><b>Panel de Control</b><span>Administración de la EO</span></button>`);
  }

  return `
    <section class="bien-head">
      <span class="kicker">${esc(eoNombre || "SCaD Gestión")} · ${esc(rolEtiqueta)}</span>
      <h1>Hola, ${esc(nombre)}</h1>
      <p class="muted">${esc(fechaLarga())}</p>
    </section>
    <section class="bien-resumen">
      <div class="kpis">${resumen}</div>
      ${avisos ? `<div class="row wrap bien-avisos">${avisos}</div>` : ""}
      <h3 class="bien-sub">Hoy</h3>
      ${actividades}
    </section>
    <section class="bien-acciones">
      <h3 class="bien-sub">Ir a</h3>
      <div class="bien-grid">${accesos.join("")}</div>
    </section>`;
}

function fechaLarga() {
  return new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}
