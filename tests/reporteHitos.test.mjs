import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararReporteHitos, consultarHitosPermitidos, ConsultaHitosCancelada, estadoHitoReporte, estatusHitos, cadenaHitosReporte } from '../js/reporteHitos.js';

const p = id => ({ id, folio: `GES-${id}`, nombre: `Proyecto ${id}` });
const detalle = id => ({ proyecto: p(id), hitos: [{ nombre: 'Validación', fechaCompromiso: '2026-12-31', cumplido: false }] });
for (const vista of ['DIRECCION', 'OPERACION', 'INSTANCIA']) {
  test(`exportación ${vista}: consulta sólo proyectos autorizados, con la misma vista`, async () => {
    const llamadas = [];
    const consultar = async (accion, datos) => {
      llamadas.push([accion, datos]); assert.equal(datos.vista, vista);
      if (accion === 'PROYECTOS') return { proyectos: [p('1'), p('2')] };
      assert.equal(datos.proyectoId, '2'); return detalle('2');
    };
    const r = await prepararReporteHitos([p('2')], { vista, consultar });
    assert.deepEqual(r.map(x => x.proyecto.id), ['2']);
    assert.deepEqual(llamadas.map(x => x[0]), ['PROYECTOS', 'PROYECTO']);
  });
}
test('una asignación retirada bloquea todo el reporte sin consultar proyectos fuera de alcance', async () => {
  const llamadas = [];
  await assert.rejects(prepararReporteHitos([p('1'), p('ajeno')], { vista: 'OPERACION', consultar: async (accion, datos) => { llamadas.push([accion, datos]); return { proyectos: [p('1')] }; } }), /Cambió tu alcance/);
  assert.equal(llamadas.length, 1);
});
test('rechazo del servidor en el detalle no produce un reporte parcial', async () => {
  await assert.rejects(prepararReporteHitos([p('1')], { vista: 'INSTANCIA', consultar: async accion => { if (accion === 'PROYECTOS') return { proyectos: [p('1')] }; throw new Error('PROYECTO_AJENO'); } }), /PROYECTO_AJENO/);
});
test('un detalle con otro ID no puede aparecer en el reporte', async () => {
  await assert.rejects(prepararReporteHitos([p('1')], { vista: 'DIRECCION', consultar: async accion => accion === 'PROYECTOS' ? { proyectos: [p('1')] } : detalle('otro') }), /verificar el acceso/);
});
test('el cambio de vista durante la consulta cancela los resultados antes de mostrarlos', async () => {
  let vigente = true, mostrados = 0;
  await assert.rejects(consultarHitosPermitidos([p('1')], { vista: 'DIRECCION', vigente: () => vigente, consultar: async () => { vigente = false; return detalle('1'); }, alRecibir: () => mostrados++ }), ConsultaHitosCancelada);
  assert.equal(mostrados, 0);
});
test('el cambio de contexto después de revalidar la lista impide consultar el detalle', async () => {
  let vigente = true, llamadas = 0;
  await assert.rejects(prepararReporteHitos([p('1')], { vista: 'OPERACION', vigente: () => vigente, consultar: async () => { llamadas++; vigente = false; return { proyectos: [p('1')] }; } }), ConsultaHitosCancelada);
  assert.equal(llamadas, 1);
});
test('los fallos de la consulta visual quedan identificados y no se confunden con proyectos sin hitos', async () => {
  const r = await consultarHitosPermitidos([p('1'), p('2')], { vista: 'INSTANCIA', consultar: async (_, d) => { if (d.proyectoId === '2') throw Error('Sin permiso'); return { proyecto: p('1'), hitos: [] }; } });
  assert.equal(r.datos.get('1').hitos.length, 0); assert(!r.datos.has('2')); assert(r.errores.has('2'));
});
test('colores y fechas de calendario coinciden con el reporte del panel', () => {
  const hoy = '2026-11-26';
  assert.equal(estadoHitoReporte({ cumplido: true, fechaCompromiso: '2026-01-01' }, hoy), 'cumplido');
  assert.equal(estadoHitoReporte({ fechaCompromiso: '2026-11-25' }, hoy), 'vencido');
  assert.equal(estadoHitoReporte({ fechaCompromiso: '2026-11-29' }, hoy), 'proximo');
  assert.equal(estadoHitoReporte({ fechaCompromiso: '2026-11-30' }, hoy), 'programado');
  assert.equal(estadoHitoReporte({}, hoy), 'sinFecha');
  assert.equal(estatusHitos([], hoy), 'vacio');
  assert.equal(estatusHitos([{ cumplido: true }, { fechaCompromiso: '2026-11-25' }], hoy), 'vencido');
});
test('etiquetas y cadenas variables se representan sin ejecutar HTML', () => {
  const html = cadenaHitosReporte([{ nombre: '<img src=x onerror=alert(1)>', cumplido: true }, { nombre: 'Firma' }]);
  assert(!html.includes('<img')); assert(html.includes('&lt;img'));
  assert.equal((html.match(/class="rh-dot"/g) || []).length, 2);
});
