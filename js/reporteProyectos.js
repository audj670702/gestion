export function matrizProyectos(proyectos, { estatus, responsable, instancias, fecha }) {
  const headers = ['No.', 'Folio', 'Proyecto', 'Estatus', 'Responsable', 'Instancias otorgantes', 'Fecha de alta', 'Fecha compromiso', 'Monto (MXN)', 'Req. aplicables', 'Validados', 'Avance (%)', 'Por revisar', 'Vencidos', 'Semáforo'];
  const ordenados = [...proyectos].sort((a,b) => String(a.folio || '').localeCompare(String(b.folio || ''), 'es', { numeric:true }));
  const rows = ordenados.map((p,i) => {
    const c = p.checklist || {}, aplicables = Number(c.aplicables) || 0, validados = Number(c.validados) || 0;
    return [i+1, p.folio || '', p.nombre || '', estatus(p), responsable(p) || 'Sin asignar', instancias(p), fecha(p.fechaAlta), fecha(p.fechaCompromiso), Number.isFinite(p.valor) ? p.valor : '', aplicables, validados, aplicables ? Math.round(validados/aplicables*100) : '', Number(c.entregados)||0, Number(c.vencidos)||0, p.semaforo || ''];
  });
  return { headers, rows };
}
let excelPromise;
async function cargarExcel() {
  if (window.XLSX) return window.XLSX;
  if (!excelPromise) excelPromise = new Promise((ok,no) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
    script.onload = () => ok(window.XLSX);
    script.onerror = () => { script.remove(); excelPromise=null; no(new Error('No fue posible cargar el generador Excel. Intenta nuevamente.')); };
    document.head.appendChild(script);
  });
  return excelPromise;
}
export async function generarReporteProyectos(tipo, m, { base, entidad, autor, vista, cargarPdf, descargar }) {
  const generado = new Date().toLocaleString('es-MX'), alcance = `Todos los proyectos disponibles · ${m.rows.length} proyectos · Vista ${vista}`;
  if (tipo === 'xls') {
    const XLSX = await cargarExcel();
    const ws = XLSX.utils.aoa_to_sheet([m.headers,...m.rows]);
    ws['!cols'] = [6,14,50,18,30,40,18,20,20,16,12,14,14,12,14].map(wch=>({wch}));
    ws['!autofilter'] = {ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:m.rows.length,c:m.headers.length-1}})};
    for (let r=1;r<=m.rows.length;r++) { const cell=ws[XLSX.utils.encode_cell({r,c:8})]; if (cell?.t==='n') cell.z='#,##0.00'; }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,'Proyectos');
    const meta = XLSX.utils.aoa_to_sheet([['SCaD GESTIÓN · Reporte de proyectos'],['Empresa operadora',entidad],['Alcance',alcance],['Generado',generado],['Generó',autor],['Filtros de pantalla','No aplicados: se incluye el listado completo autorizado'],['Avance','Validados / requerimientos aplicables. Vacío si no hay checklist aplicable.']]);
    meta['!cols']=[{wch:25},{wch:95}];XLSX.utils.book_append_sheet(wb,meta,'Información');
    descargar(new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`${base}.xlsx`);
    return;
  }
  const Pdf = await cargarPdf(), doc = new Pdf({orientation:'landscape',unit:'mm',format:'a3'});
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  const resumen = `SCaD GESTIÓN · ${entidad || 'Reporte de proyectos'}`;
  doc.setFontSize(15);doc.setTextColor(21,37,61);doc.text('Reporte general de proyectos',14,16);
  doc.setFontSize(9);doc.text(doc.splitTextToSize(resumen,W-28),14,23);
  doc.setFontSize(8);doc.text(alcance,14,31);doc.text(`Generó: ${autor} · ${generado}`,14,37);
  doc.autoTable({head:[m.headers],body:m.rows,startY:43,margin:{top:15,left:14,right:14,bottom:17},theme:'grid',
    styles:{font:'helvetica',fontSize:7,cellPadding:2,overflow:'linebreak'},headStyles:{fillColor:[21,37,61],textColor:255},alternateRowStyles:{fillColor:[245,248,252]},
    columnStyles:{0:{cellWidth:10},1:{cellWidth:18},2:{cellWidth:56},3:{cellWidth:24},4:{cellWidth:38},5:{cellWidth:44},6:{cellWidth:23},7:{cellWidth:23},8:{cellWidth:26,halign:'right'}},
    didDrawPage:()=>{doc.setFontSize(7);doc.setTextColor(110);doc.text('Listado completo autorizado · Sin filtros de pantalla',14,H-9);doc.text(`Página ${doc.internal.getNumberOfPages()}`,W-14,H-9,{align:'right'});}
  });
  doc.save(`${base}.pdf`);
}
