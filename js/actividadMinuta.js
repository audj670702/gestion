const amEsc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amVacia = () => ({version:1,bloques:[]});
export function minutaHtml(doc) {
  if(!doc?.bloques?.length)return '<p class="muted">Sin minuta registrada.</p>';
  let html='',lista='';
  for(const b of doc.bloques){
    const nueva=b.tipo==='li'?(b.lista==='ol'?'ol':'ul'):'';
    if(lista!==nueva){if(lista)html+=`</${lista}>`;if(nueva)html+=`<${nueva}>`;lista=nueva;}
    const texto=(b.fragmentos||[]).map(f=>{let t=amEsc(f.texto);if(f.negrita)t=`<strong>${t}</strong>`;if(f.cursiva)t=`<em>${t}</em>`;if(f.subrayado)t=`<u>${t}</u>`;if(/^https?:\/\//i.test(f.enlace||''))t=`<a href="${amEsc(f.enlace)}" target="_blank" rel="noopener noreferrer">${t}</a>`;return t;}).join('');
    const tag=nueva?'li':'p';html+=`<${tag}>${texto||'<br>'}</${tag}>`;
  }
  if(lista)html+=`</${lista}>`;
  return html;
}
export function minutaEditorHtml(doc, editable=true) {
  const barra=editable?`<div class="am-barra" role="toolbar" aria-label="Formato de minuta"><button type="button" data-am-comando="bold" title="Negrita" aria-label="Negrita"><b>N</b></button><button type="button" data-am-comando="italic" title="Cursiva" aria-label="Cursiva"><i>C</i></button><button type="button" data-am-comando="underline" title="Subrayado" aria-label="Subrayado"><u>S</u></button><button type="button" data-am-comando="insertUnorderedList" aria-label="Lista con viñetas">• Lista</button><button type="button" data-am-comando="insertOrderedList" aria-label="Lista numerada">1. Lista</button><button type="button" data-am-comando="createLink" aria-label="Agregar enlace">↗ Enlace</button></div>`:'';
  return `<section class="am-minuta"><h4>Minuta de la actividad</h4>${barra}<div class="am-editor" data-am-editor role="textbox" aria-label="Minuta de la actividad" aria-multiline="true" ${editable?'contenteditable="true"':'aria-readonly="true"'}>${doc?.bloques?.length?minutaHtml(doc):editable?'<p><br></p>':minutaHtml(doc)}</div>${editable?'<p class="muted xs">Resultados, acuerdos, responsables y fechas. Hasta 50,000 caracteres. La minuta es opcional.</p>':''}</section>`;
}
export function leerMinuta(root) {
  const editor=root.querySelector('[data-am-editor]');if(!editor)return amVacia();
  const bloques=[];let actual=null;let total=0;
  const nuevo=(tipo='p',lista='')=>{actual={tipo,lista,fragmentos:[]};bloques.push(actual);};
  function visitar(n,estilo={}){
    if(n.nodeType===3){if(!n.textContent)return;if(!actual)nuevo();const texto=n.textContent.replace(/\u00a0/g,' ');total+=texto.length;if(total>50000)throw Error('La minuta admite hasta 50,000 caracteres.');actual.fragmentos.push({texto,...estilo});return;}
    if(n.nodeType!==1)return;
    const tag=n.tagName.toLowerCase();if(['script','style','iframe','img','svg','object','video'].includes(tag))return;
    const s={...estilo};if(['b','strong'].includes(tag))s.negrita=true;if(['i','em'].includes(tag))s.cursiva=true;if(tag==='u')s.subrayado=true;
    if(tag==='a'){const h=n.getAttribute('href')||'';if(/^https?:\/\//i.test(h))s.enlace=h;}
    if(tag==='li'){nuevo('li',n.parentElement?.tagName.toLowerCase()==='ol'?'ol':'ul');}
    else if(['div','p'].includes(tag)&&n!==editor){if(actual?.fragmentos.length)actual=null;if(!actual)nuevo();}
    else if(tag==='br'){if(actual?.fragmentos.length)actual.fragmentos.push({texto:'\n'});return;}
    for(const c of n.childNodes)visitar(c,s);
    if(['p','div','li'].includes(tag)&&n!==editor)actual=null;
  }
  for(const n of editor.childNodes)visitar(n);
  while(bloques.length&&!bloques[0].fragmentos.some(f=>f.texto.trim()))bloques.shift();
  while(bloques.length&&!bloques.at(-1).fragmentos.some(f=>f.texto.trim()))bloques.pop();
  return {version:1,bloques};
}
export function conectarMinutaEditor(root) {
  const editor=root.querySelector('[data-am-editor]');if(!editor?.isContentEditable)return;
  root.querySelectorAll('[data-am-comando]').forEach(b=>{b.onmousedown=e=>e.preventDefault();b.onclick=()=>{editor.focus();const c=b.dataset.amComando;let valor=null;if(c==='createLink'){valor=window.prompt('Dirección del enlace (https://…):','https://');if(!valor)return;if(!/^https?:\/\//i.test(valor)||/[\s<>"']/.test(valor)){window.alert('Indica un enlace http:// o https:// válido.');return;}}document.execCommand(c,false,valor);editor.dispatchEvent(new Event('input',{bubbles:true}));};});
  editor.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'));});
}
let amPdfPromise;
async function amPdf(){
  if(window.jspdf?.jsPDF)return window.jspdf.jsPDF;
  if(!amPdfPromise)amPdfPromise=new Promise((ok,no)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js';s.onload=()=>ok(window.jspdf.jsPDF);s.onerror=()=>{amPdfPromise=null;no(Error('No fue posible cargar el generador PDF.'));};document.head.appendChild(s);});
  return amPdfPromise;
}
export async function exportarActividadPdf(a,eo='') {
  const Pdf=await amPdf(),doc=new Pdf({unit:'mm',format:'a4'}),m=18,w=174;let y=24;
  const cerrada=String(a.estado||a.cumplimiento?.estado)==='CUMPLIDA'||a.cumplimiento?.estado==='CUMPLIDO';
  const fecha=v=>{const d=new Date(v);return isNaN(d)?'':d.toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});};
  function pagina(){doc.addPage();y=22;doc.setFillColor(36,120,210);doc.rect(0,0,210,4,'F');}
  function asegurar(h){if(y+h>275)pagina();}
  function texto(t,tam=10,negrita=false,color=[21,37,61]){doc.setFont('helvetica',negrita?'bold':'normal');doc.setFontSize(tam);doc.setTextColor(...color);for(const l of doc.splitTextToSize(String(t),w)){asegurar(6);doc.text(l,m,y);y+=6;}}
  doc.setFillColor(36,120,210);doc.rect(0,0,210,5,'F');texto('SCaD GESTIÓN',16,true);texto(eo,10,false,[116,128,150]);y+=4;texto(a.titulo||'Actividad',14,true);texto(cerrada?'CUMPLIDA · CERRADA':'PENDIENTE · ABIERTA',10,true,cerrada?[31,157,106]:[201,138,18]);y+=4;
  const proyectos=a.proyectos?.map(p=>[p.folio,p.nombre].filter(Boolean).join(' · ')).join('; ')||a.proyectoNombre||'Sin proyecto';
  const participantes=a.participantes?.map(p=>p.nombre).join(', ')||'Sin participantes registrados';
  const meta=[['Inicio',fecha(a.inicio||a.fecha)],['Término',fecha(a.fin)],['Proyectos',proyectos],['Responsable',a.responsableNombre],['Participantes',participantes],['Lugar',a.lugar||a.ubicacion],['Detalle',a.descripcion||a.observaciones],['Registró',a.creadoPorNombre],['Cumplimiento',cerrada?[fecha(a.fechaCumplimiento||a.cumplimiento?.fecha),a.cumplidaPorNombre||a.cumplimiento?.porNombre].filter(Boolean).join(' · '):'Pendiente']];
  for(const [k,v] of meta)if(v)texto(`${k}: ${v}`);
  y+=4;texto('MINUTA',12,true);let num=0;
  const bloques=a.minuta?.bloques||[];
  if(!bloques.length)texto('Sin minuta registrada.',10,false,[116,128,150]);
  for(const b of bloques){
    let x=m;asegurar(7);if(b.tipo==='li'){num=b.lista==='ol'?num+1:0;doc.setFont('helvetica','normal');doc.setFontSize(10);doc.text(b.lista==='ol'?`${num}.`:'•',m,y);x+=6;}else num=0;
    const left=b.tipo==='li'?m+6:m;
    for(const f of b.fragmentos||[]){
      doc.setFont('helvetica',f.negrita?(f.cursiva?'bolditalic':'bold'):(f.cursiva?'italic':'normal'));doc.setFontSize(10);doc.setTextColor(...(f.enlace?[36,120,210]:[21,37,61]));
      for(const parte of String(f.texto||'').split(/(\s+)/)){
        if(!parte)continue;if(parte.includes('\n')){y+=5;asegurar(6);x=left;continue;}
        const trozos=doc.getTextWidth(parte)>w?doc.splitTextToSize(parte,w-6):[parte];
        for(const t of trozos){const ancho=doc.getTextWidth(t);if(x+ancho>192){y+=5;asegurar(6);x=left;}if(x===left&&!t.trim())continue;if(f.enlace&&/^https?:\/\//i.test(f.enlace))doc.textWithLink(t,x,y,{url:f.enlace});else doc.text(t,x,y);if(f.subrayado)doc.line(x,y+0.7,x+ancho,y+0.7);x+=ancho;}
      }
    }
    y+=7;
  }
  for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(116,128,150);doc.text(`${cerrada?'Cumplida y cerrada':'Pendiente y abierta'} · ${i}/${doc.getNumberOfPages()}`,m,287);doc.text('SCaD GESTIÓN',192,287,{align:'right'});}
  doc.save(`Actividad_${String(a.titulo||'minuta').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]/gi,'_').slice(0,80)}.pdf`);
}
