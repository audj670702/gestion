import { generarExcelTabla } from './reporteProyectos.js?v=0.15.15';

const formatoDia = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit'
});
const formatoFecha = new Intl.DateTimeFormat('es-MX', {
  timeZone: 'America/Mexico_City', dateStyle: 'short', timeStyle: 'short'
});
const fechaValida = valor => /^\d{4}-\d{2}-\d{2}$/.test(valor || '');
export const verificarConsultaSeguimientos = vigente => {
  if (!vigente()) throw new Error('La consulta cambió. Genera el reporte desde la vista actual.');
};

export async function consultarSeguimientos({ consultar, vista, vigente, preparar, proyectoId = '' }) {
  const comprobar = () => verificarConsultaSeguimientos(vigente);
  comprobar();
  const lista = await consultar('PROYECTOS', { vista });
  comprobar();
  if (!Array.isArray(lista?.proyectos)) throw new Error('No se pudo verificar el alcance de proyectos.');
  const permitidos = new Map(lista.proyectos.map(p => [p.id, p]));
  if (proyectoId && !permitidos.has(proyectoId)) throw new Error('El proyecto ya no está disponible en esta vista.');
  const ids = proyectoId ? [proyectoId] : [...permitidos.keys()];
  const filas = [];
  let siguiente = 0, fallo;
  async function cargar() {
    while (siguiente < ids.length && !fallo) {
      try {
        comprobar();
        const id = ids[siguiente++];
        const detalle = await consultar('PROYECTO', { proyectoId: id, vista });
        comprobar();
        if (detalle?.proyecto?.id !== id || !Array.isArray(detalle.seguimiento)) {
          throw new Error('No se pudo verificar el seguimiento de un proyecto.');
        }
        filas.push(...preparar(detalle, permitidos.get(id)));
      } catch (error) {
        fallo ||= error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, ids.length) }, cargar));
  if (fallo) throw fallo;
  comprobar();
  return filas.sort((a, b) => b.instante - a.instante || b.dia.localeCompare(a.dia) || a.proyecto.localeCompare(b.proyecto, 'es', { numeric: true }));
}

export function fechaSeguimiento(valor) {
  if (fechaValida(valor)) return { dia: valor, fecha: valor, instante: Date.parse(valor) || 0 };
  const instante = valor ? Date.parse(valor) : NaN;
  return Number.isFinite(instante)
    ? { dia: formatoDia.format(instante), fecha: formatoFecha.format(instante), instante }
    : { dia: '', fecha: '', instante: 0 };
}

export function filtrarSeguimientos(filas, f) {
  return filas.filter(r => (!f.proyecto || f.proyecto === r.proyectoId)
    && (!f.estatus || f.estatus === r.estatusId)
    && (!f.bandera || f.bandera === r.banderaId)
    && (!f.instancia || r.instancias.some(i => i.id === f.instancia))
    && (!f.responsable || f.responsable === r.responsableId)
    && (!(f.desde || f.hasta) || (r.dia && (!f.desde || r.dia >= f.desde) && (!f.hasta || r.dia <= f.hasta))));
}

export const COLUMNAS_SEGUIMIENTO = [
  ['fecha', 'Fecha de registro'], ['proyecto', 'Proyecto'], ['estatus', 'Estatus del proyecto'],
  ['bandera', 'Bandera'], ['instancias', 'Instancias vinculadas'], ['responsable', 'Responsable del proyecto'],
  ['autor', 'Autor'], ['referencia', 'Referencia'], ['nota', 'Anotación']
];

export const valorSeguimiento = (fila, campo) => campo === 'instancias'
  ? fila.instancias.map(i => i.nombre).join(', ') : fila[campo];

export async function generarReporteSeguimientos(tipo, filas, { base, titulo, filtros, autor, cargarPdf, descargar }) {
  const headers = ['No.', ...COLUMNAS_SEGUIMIENTO.map(([, etiqueta]) => etiqueta)];
  const rows = filas.map((r, i) => [i + 1, ...COLUMNAS_SEGUIMIENTO.map(([campo]) => valorSeguimiento(r, campo))]);
  if (tipo === 'xls') {
    return generarExcelTabla({ headers, rows }, { nombre: base, hoja: 'Seguimientos', titulo, autor, filtros, descargar });
  }
  const Pdf = await cargarPdf();
  const doc = new Pdf({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  doc.setTextColor(21, 37, 61);
  doc.setFontSize(14);
  const encabezado = doc.splitTextToSize(titulo, W - 24);
  doc.text(encabezado, 12, 15);
  doc.setFontSize(8);
  const meta = doc.splitTextToSize(`Generó: ${autor} · ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })} · ${filas.length} registros\n${filtros}`, W - 24);
  const inicio = 16 + encabezado.length * 5;
  doc.text(meta, 12, inicio);
  doc.autoTable({
    head: [headers], body: rows, startY: inicio + meta.length * 4,
    margin: { top: 14, bottom: 15, left: 12, right: 12 },
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [21, 37, 61] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: { 0: { cellWidth: 10 }, 9: { cellWidth: 110 } },
    didDrawPage: ({ pageNumber }) => {
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`SCaD GESTIÓN · Página ${pageNumber}`, W - 12, H - 7, { align: 'right' });
    }
  });
  descargar(doc.output('blob'), `${base}.pdf`);
}
