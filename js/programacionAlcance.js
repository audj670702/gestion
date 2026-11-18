const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function alcanceTexto(g) {
  if (!g) return 'Regla anterior';
  const v=g.visibilidad||{};
  return v.todos ? 'Toda la organización' : [v.porProyecto?'Por proyecto':'',...(v.roles||[]).map(r=>({DIRECCION:'Dirección',OPERACION:'Operación',INSTANCIA:'Instancia'}[r]||r)),v.instanciasIds?.length?`${v.instanciasIds.length} instancia(s)`:'',v.usuariosIds?.length?`${v.usuariosIds.length} usuario(s)`:''].filter(Boolean).join(' · ');
}
export function alcanceFormulario(opc, g) {
  const v=g?.visibilidad||{}, selected=g||{};
  const opciones=(nombre,items,ids=[])=>`<details class="prg-seleccion"><summary>${nombre} · ${ids.length} seleccionado(s)</summary><input type="search" placeholder="Buscar…" aria-label="Buscar ${nombre.toLowerCase()}" data-alcance-buscar><div class="prg-opciones">${items.map(x=>`<label class="check"><input type="checkbox" data-alcance="${nombre}" value="${escapeHtml(x.id)}" ${ids.includes(x.id)?'checked':''}><span>${escapeHtml([x.folio,x.nombre].filter(Boolean).join(' · '))}</span></label>`).join('')||'<p>Sin opciones disponibles.</p>'}</div></details>`;
  return `<fieldset class="prg-alcance"><legend>Proyectos vinculados (opcional)</legend><p>Selecciona ninguno, uno o varios.</p>${opciones('Proyectos',opc.proyectos||[],selected.proyectosIds)}</fieldset>
  <fieldset class="prg-alcance"><legend>Visible para</legend><p>Los criterios se suman. El autor y los administradores conservan acceso.</p>
  <label class="check"><input type="checkbox" data-alcance-todos ${v.todos?'checked':''}>Toda la organización</label>
  <label class="check"><input type="checkbox" data-alcance-proyecto ${v.porProyecto?'checked':''}>Usuarios con acceso a los proyectos vinculados</label>
  ${opciones('Roles',[{id:'DIRECCION',nombre:'Dirección'},{id:'OPERACION',nombre:'Operación'},{id:'INSTANCIA',nombre:'Instancia'}],v.roles)}
  ${opciones('Instancias',opc.instancias||[],v.instanciasIds)}${opciones('Usuarios',opc.usuarios||[],v.usuariosIds)}</fieldset>
  <fieldset class="prg-alcance"><legend>Participantes (opcional)</legend><p>La participación se registra por separado. Google Calendar sincroniza las actividades visibles para cada usuario.</p>${opciones('Participantes',opc.usuarios||[],selected.participantesIds)}</fieldset>`;
}
export function leerAlcance(root) {
  const ids=n=>[...root.querySelectorAll(`[data-alcance="${n}"]:checked`)].map(x=>x.value);
  const g={version:1,proyectosIds:ids('Proyectos'),participantesIds:ids('Participantes'),visibilidad:{todos:root.querySelector('[data-alcance-todos]').checked,porProyecto:root.querySelector('[data-alcance-proyecto]').checked,roles:ids('Roles'),instanciasIds:ids('Instancias'),usuariosIds:ids('Usuarios')}};
  const v=g.visibilidad;
  if(v.porProyecto&&!g.proyectosIds.length)throw Error('Vincula un proyecto para usar visibilidad por proyecto.');
  if(!v.todos&&!v.porProyecto&&!v.roles.length&&!v.instanciasIds.length&&!v.usuariosIds.length)throw Error('Selecciona quién puede ver la actividad.');
  return g;
}
document.addEventListener('input',e=>{
  if(!e.target.matches('[data-alcance-buscar]'))return;
  const q=e.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  e.target.closest('details').querySelectorAll('label').forEach(x=>x.hidden=!x.textContent.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q));
});
document.addEventListener('change',e=>{
  if(!e.target.matches('[data-alcance]'))return;
  const box=e.target.closest('details'),n=box.querySelectorAll('input[type=checkbox]:checked').length;
  box.querySelector('summary').textContent=`${e.target.dataset.alcance} · ${n} seleccionado(s)`;
});
