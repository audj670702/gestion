// SCaD GESTIÓN · Reporte de hitos · v0.15.16
import { generarExcelTabla } from './reporteProyectos.js?v=0.15.15';

export const COLORES_HITOS = {
  cumplido: { color: '#21814d', fondo: '#e9f6ee', texto: 'Cumplido' },
  vencido: { color: '#ad292d', fondo: '#fdebec', texto: 'Vencido' },
  proximo: { color: '#a96c05', fondo: '#fff5db', texto: 'Por vencer' },
  programado: { color: '#2563a6', fondo: '#e7f2fc', texto: 'Programado' },
  sinFecha: { color: '#64748b', fondo: '#f1f5f9', texto: 'Sin fecha' },
  vacio: { color: '#64748b', fondo: '#f1f5f9', texto: 'Sin hitos' }
};
export const hoyHitos = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function estadoHitoReporte(h, hoy = hoyHitos()) {
  if (h.cumplido === true) return 'cumplido';
  const dias = (Date.parse(h.fechaCompromiso + 'T00:00:00Z') - Date.parse(hoy + 'T00:00:00Z')) / 86400000;
  return !Number.isFinite(dias) ? 'sinFecha' : dias < 0 ? 'vencido' : dias <= 3 ? 'proximo' : 'programado';
}
export function estatusHitos(hitos, hoy = hoyHitos()) {
  if (!hitos.length) return 'vacio';
  const estados = hitos.map(h => estadoHitoReporte(h, hoy));
  return estados.every(e => e === 'cumplido') ? 'cumplido' : ['vencido', 'proximo', 'sinFecha', 'programado'].find(e => estados.includes(e));
}
export function fechaReporteHito(v) {
  const d = new Date(v + 'T12:00:00Z');
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : 'Sin fecha';
}
const escapado = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function cadenaHitosReporte(hitos) {
  if (!hitos.length) return '<span class="muted xs">Sin hitos configurados</span>';
  return `<ol class="rh-chain">${hitos.map(h => { const c = COLORES_HITOS[estadoHitoReporte(h)]; return `<li class="rh-step" style="--hc:${c.color};--hb:${c.fondo}"><span class="rh-dot" aria-hidden="true"></span><span class="rh-label">${escapado(h.nombre)}</span><span class="rh-date">${escapado(fechaReporteHito(h.fechaCompromiso))} · ${c.texto}</span></li>`; }).join('')}</ol>`;
}

export class ConsultaHitosCancelada extends Error { constructor() { super('La vista o la sesión cambió. Genera el reporte desde la vista actual.'); } }
const comprobar = vigente => { if (!vigente()) throw new ConsultaHitosCancelada(); };
// Sólo recibe IDs de la consulta autorizada. Cada detalle vuelve a validar la misma vista en el servidor.
export async function consultarHitosPermitidos(proyectos, { vista, consultar, vigente = () => true, alRecibir = () => {}, estricto = false }) {
  const datos = new Map(), errores = new Map(); let siguiente = 0;
  async function trabajador() {
    while (siguiente < proyectos.length) {
      comprobar(vigente); const p = proyectos[siguiente++];
      try {
        const d = await consultar('PROYECTO', { proyectoId: p.id, vista });
        comprobar(vigente);
        if (d?.proyecto?.id !== p.id || !Array.isArray(d.hitos)) throw new Error('No se pudo verificar el acceso a los hitos del proyecto.');
        const registro = { proyecto: { id: d.proyecto.id, folio: d.proyecto.folio, nombre: d.proyecto.nombre }, hitos: d.hitos.map(h => ({ nombre: String(h.nombre || ''), cumplido: h.cumplido === true, fechaCompromiso: /^\d{4}-\d{2}-\d{2}$/.test(h.fechaCompromiso || '') ? h.fechaCompromiso : '' })) };
        datos.set(p.id, registro); alRecibir(p.id, registro, null);
      } catch (error) {
        comprobar(vigente); if (estricto) throw error;
        errores.set(p.id, error); alRecibir(p.id, null, error);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, proyectos.length) }, trabajador));
  comprobar(vigente); return { datos, errores };
}
export async function prepararReporteHitos(proyectos, opciones) {
  comprobar(opciones.vigente || (() => true));
  const lista = await opciones.consultar('PROYECTOS', { vista: opciones.vista });
  comprobar(opciones.vigente || (() => true));
  if (!Array.isArray(lista?.proyectos)) throw new Error('No se pudo verificar el alcance de proyectos.');
  const permitidos = new Map(lista.proyectos.map(p => [p.id, p]));
  if (proyectos.some(p => !permitidos.has(p.id))) throw new Error('Cambió tu alcance de proyectos. Actualiza la lista antes de exportar.');
  const actuales = proyectos.map(p => permitidos.get(p.id));
  const { datos } = await consultarHitosPermitidos(actuales, { ...opciones, estricto: true });
  return actuales.map(p => datos.get(p.id));
}

export async function generarReporteHitos(tipo, registros, { base, entidad, autor, vista, alcance, cargarPdf, descargar }) {
  const hoy = hoyHitos();
  const headers = ['No.', 'Código', 'Proyecto', 'Estatus', 'Cadena de hitos'];
  const rows = registros.map(({ proyecto: p, hitos }, i) => [i + 1, p.folio || '', p.nombre || '', `${COLORES_HITOS[estatusHitos(hitos, hoy)].texto}\n${hitos.filter(h => h.cumplido).length} de ${hitos.length} cumplidos`, hitos.map(h => `${h.nombre} · ${fechaReporteHito(h.fechaCompromiso)} · ${COLORES_HITOS[estadoHitoReporte(h, hoy)].texto}`).join('\n') || 'Sin hitos configurados']);
  if (tipo === 'xls') return generarExcelTabla({ headers, rows }, { nombre: base, hoja: 'Hitos', titulo: `Reporte por hitos · ${entidad} · Vista ${vista}`, autor, filtros: alcance, descargar });
  const Pdf = await cargarPdf(), doc = new Pdf({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), chainWidth = W - 24 - 119, count = 6, paso = (chainWidth - 4) / count;
  const layouts = registros.map(({ hitos }) => { const bands = []; for (let i = 0; i < hitos.length; i += count) { const pasos = hitos.slice(i, i + count).map(h => ({ ...COLORES_HITOS[estadoHitoReporte(h, hoy)], etiqueta: doc.setFontSize(7).splitTextToSize(h.nombre, paso - 3), caption: doc.setFontSize(6).splitTextToSize(`${fechaReporteHito(h.fechaCompromiso)} · ${COLORES_HITOS[estadoHitoReporte(h, hoy)].texto}`, paso - 3) })); bands.push({ pasos, alto: Math.max(...pasos.map(h => 11 + h.etiqueta.length * 2.8 + h.caption.length * 2.5)) }); } return bands; });
  doc.setFontSize(14); doc.setTextColor('#15253d'); doc.text('Reporte por hitos', 12, 15);
  doc.setFontSize(8); const meta = doc.splitTextToSize(`${entidad} · Vista ${vista} · Corte: ${hoy}\n${alcance}\nGeneró: ${autor}`, W - 24); doc.text(meta, 12, 21);
  const y = 23 + meta.length * 3.5; doc.setFontSize(7); doc.text('Verde: cumplido · Rojo: vencido · Ámbar: por vencer · Azul: programado · Gris: sin fecha', 12, y);
  doc.autoTable({ head: [headers], body: rows.map(r => [...r.slice(0, 4), '']), startY: y + 5, margin: { top: 14, bottom: 14, left: 12, right: 12 }, rowPageBreak: 'avoid', columnStyles: { 0: { cellWidth: 9 }, 1: { cellWidth: 24 }, 2: { cellWidth: 56 }, 3: { cellWidth: 30 }, 4: { cellWidth: chainWidth } }, styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak', valign: 'middle' }, headStyles: { fillColor: [21, 37, 61] }, alternateRowStyles: { fillColor: [247, 249, 252] },
    didParseCell: d => { if (d.section !== 'body') return; if (d.column.index === 4) d.cell.styles.minCellHeight = Math.max(19, layouts[d.row.index].reduce((n, b) => n + b.alto, 4)); if (d.column.index === 3) d.cell.styles.textColor = COLORES_HITOS[estatusHitos(registros[d.row.index].hitos, hoy)].color; },
    didDrawCell: d => { if (d.section !== 'body' || d.column.index !== 4) return; const bands = layouts[d.row.index]; if (!bands.length) { doc.setFontSize(7); doc.setTextColor('#64748b'); doc.text('Sin hitos configurados', d.cell.x + 2, d.cell.y + 7); return; } let y = d.cell.y + 2; for (const band of bands) { const xs = band.pasos.map((_, i) => d.cell.x + 2 + paso * (i + .5)); band.pasos.forEach((h, i) => { doc.setLineWidth(.35); doc.setDrawColor(h.color); if (i < xs.length - 1) doc.line(xs[i], y + 4, xs[i + 1], y + 4); }); band.pasos.forEach((h, i) => { doc.setDrawColor(h.color); doc.setFillColor(h.fondo); doc.setLineWidth(.45); doc.circle(xs[i], y + 4, 2.3, 'FD'); doc.setFontSize(7); doc.setTextColor('#15253d'); doc.text(h.etiqueta, xs[i], y + 10, { align: 'center' }); doc.setFontSize(6); doc.setTextColor(h.color); doc.text(h.caption, xs[i], y + 11 + h.etiqueta.length * 2.8, { align: 'center' }); }); y += band.alto; } },
    didDrawPage: () => { doc.setFontSize(7); doc.setTextColor('#64748b'); doc.text(`SCaD GESTIÓN · Vista ${vista} · Página ${doc.internal.getNumberOfPages()}`, 12, H - 6); }
  });
  descargar(doc.output('blob'), `${base}.pdf`);
}
