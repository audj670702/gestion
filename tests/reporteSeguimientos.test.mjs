import test from 'node:test';
import assert from 'node:assert/strict';
import { consultarSeguimientos, fechaSeguimiento, filtrarSeguimientos, generarReporteSeguimientos } from '../js/reporteSeguimientos.js';

for (const vista of ['DIRECCION', 'OPERACION', 'INSTANCIA']) {
  test(`consulta con el alcance de ${vista}`, async () => {
    const llamadas = [];
    const consultar = async (accion, datos) => {
      llamadas.push(accion);
      assert.equal(datos.vista, vista);
      if (accion === 'PROYECTOS') return { proyectos: [{ id: 'permitido' }] };
      assert.equal(datos.proyectoId, 'permitido');
      return { proyecto: { id: 'permitido' }, seguimiento: [] };
    };
    const opciones = { consultar, vista, vigente: () => true, preparar: detalle => detalle.seguimiento };
    assert.deepEqual(await consultarSeguimientos(opciones), []);
    assert.deepEqual(llamadas, ['PROYECTOS', 'PROYECTO']);
    llamadas.length = 0;
    await assert.rejects(consultarSeguimientos({ ...opciones, proyectoId: 'retirado' }), /ya no está disponible/);
    assert.deepEqual(llamadas, ['PROYECTOS']);
  });
}

test('un detalle fuera de alcance o un cambio de sesión impiden obtener filas', async () => {
  let prepararLlamado = false;
  let vigente = true;
  const opciones = {
    vista: 'INSTANCIA', vigente: () => vigente,
    preparar: () => { prepararLlamado = true; return []; }
  };
  const consultar = detalle => async accion => accion === 'PROYECTOS' ? { proyectos: [{ id: '1' }] } : detalle();
  await assert.rejects(consultarSeguimientos({ ...opciones, consultar: consultar(() => ({ proyecto: { id: '2' }, seguimiento: [] })) }), /verificar el seguimiento/);
  await assert.rejects(consultarSeguimientos({ ...opciones, consultar: consultar(() => {
    vigente = false;
    return { proyecto: { id: '1' }, seguimiento: [] };
  }) }), /La consulta cambió/);
  assert.equal(prepararLlamado, false);
});

test('combina todos los filtros e incluye los extremos del período en hora de México', () => {
  const fila = { proyectoId: '1', estatusId: 'EN_PROCESO', banderaId: 'ATENCION', responsableId: 'r',
    instancias: [{ id: 'a' }, { id: 'b' }], ...fechaSeguimiento('2026-11-28T01:00:00Z') };
  assert.equal(fila.dia, '2026-11-27');
  assert.equal(fechaSeguimiento('2026-11-27').dia, '2026-11-27');
  const filtros = { proyecto: '1', estatus: 'EN_PROCESO', bandera: 'ATENCION', responsable: 'r', instancia: 'b', desde: fila.dia, hasta: fila.dia };
  assert.deepEqual(filtrarSeguimientos([fila], filtros), [fila]);
  for (const cambio of [{ proyecto: '2' }, { estatus: 'DETENIDO' }, { bandera: 'NORMAL' },
    { responsable: 's' }, { instancia: 'c' }, { desde: '2026-11-28' }, { hasta: '2026-11-26' }]) {
    assert.deepEqual(filtrarSeguimientos([fila], { ...filtros, ...cambio }), []);
  }
});

test('buscar combina texto sin acentos con filtros y reconoce instancias', () => {
  const fila = { proyectoId: '1', nota: 'Revisión técnica', instancias: [{ id: 'i', nombre: 'Dirección de Obras' }] };
  assert.deepEqual(filtrarSeguimientos([fila], { proyecto: '1', q: ' revision TECNICA ' }), [fila]);
  assert.deepEqual(filtrarSeguimientos([fila], { instancia: 'i', q: 'direccion de obras' }), [fila]);
  assert.deepEqual(filtrarSeguimientos([fila], { proyecto: '2', q: 'revision' }), []);
});

test('PDF conserva las columnas elegidas y el orden de las filas recibidas', async () => {
  let tabla;
  class Pdf {
    internal = { pageSize: { getWidth: () => 420, getHeight: () => 297 } };
    setTextColor() {}
    setFontSize() {}
    splitTextToSize(texto) { return [texto]; }
    text() {}
    autoTable(datos) { tabla = datos; }
    output() { return new Blob(); }
  }
  await generarReporteSeguimientos('pdf', [{ nota: 'Segunda', autor: 'A' }, { nota: 'Primera', autor: 'B' }], {
    columnas: [['nota', 'Anotación']], base: 'seguimientos', titulo: 'Seguimientos',
    cargarPdf: async () => Pdf, descargar: (_, nombre) => assert.equal(nombre, 'seguimientos.pdf')
  });
  assert.deepEqual(tabla.head, [['No.', 'Anotación']]);
  assert.deepEqual(tabla.body, [[1, 'Segunda'], [2, 'Primera']]);
  assert.equal(tabla.columnStyles[9], undefined);
});
