// SCaD Gestión · Bienvenida · v0.6.0
// Pantalla de bienvenida. Usa sólo datos ya cargados por app.js (contexto y proyectos de la vista):
// no hace consultas nuevas. Visitante: presentación y planes. Usuario: resumen del día según el rol.
import { deHoy, cumplida, sinCumplir, titulo, hora, tipoDe, origenDe, colorDe, idDe } from "./programacion.js";

// Compra de cada plan: página de Wix Pricing Plans filtrada a ese plan (mismo patrón que LOTERÍA).
const compraUrl = id => "https://www.scad.mx/pricing-plans/list?planIds=" + encodeURIComponent(id);

const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const PLANES = [
  { clave: "BASICO", nombre: "Básico", proyectos: 5, usuarios: 10, precio: 590, img: "./css/plan_basico_1.png", id: "46323474-9680-40f1-9bbc-c4913d4355f4",
    desc: "Coordina tu primer proyecto: checklist, documentos y actividades para ti y tu equipo." },
  { clave: "ESTANDAR", nombre: "Estándar", proyectos: 15, usuarios: 30, precio: 1299, img: "./css/plan_estandar_1.png", id: "618b8e77-7b16-4513-bc18-44be04c87fca",
    desc: "Coordina varios proyectos con tu equipo y las instancias involucradas." },
  { clave: "PRO", nombre: "PRO", proyectos: 30, usuarios: 50, precio: 2690, img: "./css/plan_pro_1.png", id: "e9500305-eeb2-46ee-ac6d-033e085d3b66",
    desc: "Gestiona la cartera completa, con más proyectos, usuarios y tipos de actividad." }
];
const LIM = [
  { roles: 3, tipos: 5 },
  { roles: 6, tipos: 15 },
  { roles: 10, tipos: 40 }
];
const invitacion = () => `<div class="invita" role="note">
      <b>Prueba GRATIS 14 días</b>
      <span>Cancela en cualquier momento</span>
    </div>`;
const money = v => "$" + Number(v).toLocaleString("es-MX") + " MXN";

// ── Visitante (sin sesión, o con sesión sin vista asignada) ──
// El botón Iniciar sesión vive en la barra superior (app.js). Aquí sólo la oferta.
export function bienvenidaVisitante({ sesion = false, nombre = "" } = {}) {
  const cabecera = sesion
    ? `<h1>Hola, ${esc(nombre)}</h1><p>Tu cuenta no tiene una vista asignada en SCaD Gestión. Si ya compraste un plan, regístrate en la página de tu empresa o pide al administrador que te asigne un rol.</p>`
    : `<h1 class="sr-only">SCaD GESTIÓN</h1><p class="bien-lead">Seguimiento de proyectos y expediente técnico, con el checklist de integración y la programación de cada proyecto.</p>`;
  const barras = PLANES.map(p => `
    <button class="plan-bar plan-${p.clave.toLowerCase()}" type="button" data-plan="${p.id}">
      <img src="${p.img}" alt="" loading="lazy">
      <span class="plan-txt"><b>${p.nombre}</b><span>${money(p.precio)} al mes · hasta ${p.proyectos} proyectos</span></span>
      <span class="plan-ver" aria-hidden="true">›</span>
    </button>`).join("");
  const pie = sesion ? `<button class="btn" data-menu="logout">Cerrar sesión</button>` : "";
  return `${cabecera}
    ${invitacion()}
    <div class="plan-bars" aria-label="Planes">${barras}</div>
    <p class="muted xs">Más de 30 proyectos o 50 usuarios: atención por contacto.</p>
    ${pie ? `<div class="bien-pie">${pie}</div>` : ""}`;
}

// Detalle de un plan (modal). La invitación a suscribirse vive aquí.
export function detallePlan(id) {
  const p = PLANES.find(x => x.id === id);
  if (!p) return "";
  const compra = `<a class="btn pri lg block cta-prueba" href="${esc(compraUrl(p.id))}" target="_blank" rel="noopener">Iniciar prueba GRATIS</a>`;
  const idx = PLANES.indexOf(p);
  const previo = idx > 0 ? PLANES[idx - 1] : null;
  const cabeza = previo ? `<li class="incluye-previo">Lo que incluye el Plan ${previo.nombre}, más:</li>` : "";
  const extras = previo ? [
    `Hasta ${p.proyectos} proyectos activos (antes ${previo.proyectos})`,
    `Hasta ${p.usuarios} usuarios (antes ${previo.usuarios})`,
    `Hasta ${LIM[idx].roles} roles (antes ${LIM[idx - 1].roles})`,
    `Hasta ${LIM[idx].tipos} tipos de actividad (antes ${LIM[idx - 1].tipos})`
  ] : [
    `Hasta ${p.proyectos} proyectos activos`,
    `Hasta ${p.usuarios} usuarios`,
    `Hasta ${LIM[idx].roles} roles`,
    `Hasta ${LIM[idx].tipos} tipos de actividad`,
    "Checklist de integración y expediente técnico",
    "Programación de actividades por proyecto"
  ];
  return `
    <div class="plan-det">
      <img src="${p.img}" alt="Plan ${p.nombre} GESTIÓN">
      <h3>Plan ${p.nombre}</h3>
      <p class="plan-precio"><b>${money(p.precio)}</b> <span>al mes</span></p>
      ${invitacion()}
      <p>${esc(p.desc)}</p>
      <ul class="plan-lista">${cabeza}${extras.map(e => `<li>${esc(e)}</li>`).join("")}</ul>
      ${compra}
    </div>`;
}

// ── Usuario (sesión y vista asignada) ──
// ctx: contexto ya cargado. modo: vista activa. proyectos: lista de la vista activa.
// identidad: { nombre, email, foto, iniciales }. Proyectos y Programación ya están en la barra inferior: no se repiten aquí.
export function bienvenidaUsuario({ ctx, modo, proyectos, esAdm, identidad, eoNombre, rolEtiqueta }) {
  const activos = (proyectos || []).filter(p => p.fase !== "CERRADO");
  const suma = k => activos.reduce((n, p) => n + (p.checklist?.[k] || 0), 0);
  const hoy = deHoy(ctx);
  const pendientesHoy = hoy.filter(a => !cumplida(a) && !sinCumplir(a));
  const vencidasHoy = hoy.filter(a => sinCumplir(a));
  const mostrarChecklist = modo !== "INSTANCIA";
  const fotoStyle = identidad.foto ? ` style="background-image:url('${esc(identidad.foto).replace(/'/g, "%27")}')"` : "";

  const resumen = [
    `<span class="kl"><b>${activos.length}</b> proyectos activos</span>`,
    mostrarChecklist ? `<span class="kl warn"><b>${suma("entregados")}</b> por revisar</span>` : "",
    mostrarChecklist ? `<span class="kl bad"><b>${suma("vencidos")}</b> vencidos</span>` : "",
    `<span class="kl"><b>${hoy.length}</b> actividades hoy</span>`
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

  // Barra de vistas (sólo ADM), con el mismo lenguaje visual del menú inferior. La vista activa queda marcada.
  const vistas = [["DIRECCION", "Dirección"], ["OPERACION", "Operación"], ["INSTANCIA", "Instancia"]];
  const ICONOS = {
    DIRECCION: '<circle cx="12" cy="7.5" r="3.2"/><path d="M5.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M12 13.5l-1.1 2.6L12 20l1.1-3.9z"/>',
    OPERACION: '<path d="M4 20.5h10"/><path d="M14.5 4.5l4 4L9.5 18.5 5 19.5l1-4.5z"/><path d="M12.5 6.5l4 4"/>',
    INSTANCIA: '<path d="M3 20.5h18"/><path d="M5 20.5v-9.5l7-5 7 5v9.5"/><path d="M9.5 20.5v-5h5v5"/><path d="M9.5 11.5h5"/>',
    PANEL: '<path d="M4 7h9M17 7h3M4 12h4M12 12h8M4 17h11M19 17h1"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="17" cy="17" r="2"/>'
  };
  const icono = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[k]}</svg>`;
  const barraVistas = esAdm ? `<div class="vistas-wrap">
      <span class="vistas-cap">VISTAS</span>
      <nav class="vistas-bar" aria-label="Vistas">
        ${vistas.map(([m, t]) => `<button type="button" data-modo="${m}" class="${m === modo ? "on" : ""}"${m === modo ? ' aria-current="true"' : ""}>${icono(m)}<span>${t}</span></button>`).join("")}
        <button type="button" data-bien="panel">${icono("PANEL")}<span>Panel</span></button>
      </nav>
    </div>` : "";

  return `
    ${barraVistas}
    <section class="bien-id">
      <span class="bien-avatar"${fotoStyle}>${identidad.foto ? "" : esc(identidad.iniciales)}</span>
      <div><b>${esc(identidad.nombre)}</b><span>${esc(identidad.email)}</span>${rolEtiqueta ? `<span class="bien-rol">${esc(rolEtiqueta)}</span>` : ""}</div>
    </section>
    <section class="bien-resumen">
      <span class="bien-fecha">${esc(fechaLarga())}</span>
      <div class="kpis-line">${resumen}</div>
      ${avisos ? `<div class="row wrap bien-avisos">${avisos}</div>` : ""}
      <h3 class="bien-sub">Hoy</h3>
      ${actividades}
    </section>`;
}

function fechaLarga() {
  return new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}
