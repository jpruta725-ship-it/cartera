'use strict';
/* Mi Cartera 2.8 · Documentos de clientes (IndexedDB, sin servidor).
 * Los originales se guardan como Blob fuera de localStorage.
 * Los respaldos JSON contienen base64 de los documentos.
 */
const DOC_DB='micartera.client-documents.v1';
const DOC_STORE='documents';
const DOC_MAX=6*1024*1024; // límite por archivo: 6 MiB
const DOC_COUNT=10; // máximo por cliente
const DOC_TOTAL=45*1024*1024; // máximo por cliente
let docModalUrls=[];
const allowedMime=new Set(['application/pdf','image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']);
const acceptDoc='image/*,application/pdf,.pdf,.heic,.heif';
function docErrMessage(err){return String(err?.message||err||'Error desconocido').slice(0,150)}
function docType(file){
 const type=String(file.type||'').toLowerCase();
 if(allowedMime.has(type))return type;
 const name=String(file.name||'').toLowerCase();
 const ext=name.split('.').pop();
 return ({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif',heic:'image/heic',heif:'image/heif'})[ext]||'';
}
function docDB(){return new Promise((resolve,reject)=>{
 if(!('indexedDB' in window)){reject(new Error('El navegador no permite guardar documentos.'));return}
 const req=indexedDB.open(DOC_DB,1);
 req.onupgradeneeded=()=>{const db=req.result; if(!db.objectStoreNames.contains(DOC_STORE)){const store=db.createObjectStore(DOC_STORE,{keyPath:'id'});store.createIndex('clientId','clientId',{unique:false})}};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('No se pudo abrir el almacenamiento de documentos'));
 req.onblocked=()=>reject(new Error('El almacenamiento de documentos está ocupado'));
})}
function docTransaction(task,mode='readonly'){return docDB().then(db=>new Promise((resolve,reject)=>{
 let result,transaction;
 try{transaction=db.transaction(DOC_STORE,mode);result=task(transaction.objectStore(DOC_STORE),transaction)}
 catch(e){db.close();reject(e);return}
 transaction.oncomplete=()=>{db.close();resolve(result)};
 transaction.onerror=()=>{db.close();reject(transaction.error||new Error('Error guardando documentos'))};
 transaction.onabort=()=>{db.close();reject(transaction.error||new Error('Almacenamiento insuficiente o bloqueado'))};
}))}
function docAll(){return docDB().then(db=>new Promise((resolve,reject)=>{
 const t=db.transaction(DOC_STORE,'readonly');let docs=[];const req=t.objectStore(DOC_STORE).getAll();
 req.onsuccess=()=>docs=req.result||[];t.oncomplete=()=>{db.close();resolve(docs)};
 t.onerror=()=>{db.close();reject(t.error||new Error('No se pudieron leer los documentos'))};
}))}
async function docForClient(cid){return (await docAll()).filter(x=>x.clientId===cid).sort((a,b)=>b.createdAt-a.createdAt)}
function docPut(entry){return docTransaction(store=>store.put(entry),'readwrite')}
function docDelete(idv){return docTransaction(store=>store.delete(idv),'readwrite')}
function docDeleteClient(cid){return docDB().then(db=>new Promise((resolve,reject)=>{
 const t=db.transaction(DOC_STORE,'readwrite');const index=t.objectStore(DOC_STORE).index('clientId');
 index.openCursor(IDBKeyRange.only(cid)).onsuccess=e=>{const cursor=e.target.result;if(cursor){cursor.delete();cursor.continue()}};
 t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error||new Error('No se pudieron borrar los documentos'))};
}))}
function docClear(){return docTransaction(store=>store.clear(),'readwrite')}
function docRevokeUrls(){for(const url of docModalUrls)URL.revokeObjectURL(url);docModalUrls=[]}
const openModalBeforeDocs=openModal;
openModal=function(...args){docRevokeUrls();return openModalBeforeDocs(...args)};
const closeModalBeforeDocs=closeModal;
closeModal=function(...args){docRevokeUrls();return closeModalBeforeDocs(...args)};
function docFormatSize(n){return Number(n)<1048576?`${Math.ceil(Number(n)/1024)} KB`:`${(Number(n)/1048576).toFixed(1)} MB`}
function docCheck(file){
 if(!(file instanceof Blob)||!docType(file))throw new Error('Solo se admiten fotos e imágenes o PDF.');
 if(!file.size||file.size>DOC_MAX)throw new Error(`«${file.name}» supera 6 MB o está vacío.`);
}
async function docSaveFiles(cid,files){
 const selected=Array.from(files||[]);if(!selected.length)return 0;
 const current=await docForClient(cid);
 if(current.length+selected.length>DOC_COUNT)throw new Error(`Máximo ${DOC_COUNT} documentos por cliente.`);
 const sizeTotal=current.reduce((n,x)=>n+Number(x.size||0),0)+selected.reduce((n,x)=>n+x.size,0);
 if(sizeTotal>DOC_TOTAL)throw new Error('Los documentos del cliente superan el máximo de 45 MB.');
 selected.forEach(docCheck);
 let saved=0;
 for(const file of selected){
  const entry={id:id(),clientId:cid,name:file.name.slice(0,180)||'Documento',type:docType(file),size:file.size,createdAt:Date.now(),blob:file};
  await docPut(entry);saved++;
 }
 return saved;
}
function docPickerMarkup(existing){return `<div class="field full doc-field"><label for="clientDocsInput">Documentos del cliente (opcional)</label>
 <div class="doc-upload"><span class="doc-upload-icon">▣</span><b>Adjuntar fotos o PDF</b><span>Identificación, comprobante de domicilio u otros documentos</span>
 <input id="clientDocsInput" type="file" name="clientDocs" accept="${acceptDoc}" multiple aria-describedby="docsLimit">
 <small id="docsLimit">Hasta ${DOC_COUNT} archivos por cliente · máximo 6 MB por archivo · guardados solamente en este iPhone</small></div>
 <div id="docSelection" class="doc-selection" role="status"></div>
 ${existing?`<button type="button" class="btn secondary small" data-action="client-docs:${esc(existing.id)}">Ver documentos ya guardados</button>`:''}</div>`}
function docPreviewFiles(input){const n=$('#docSelection');if(!n)return;
 const files=Array.from(input.files||[]);
 n.innerHTML=files.length?`<b>${files.length} archivo(s) seleccionado(s):</b><div>${files.map(f=>`<div>• ${esc(f.name)} (${docFormatSize(f.size)})${!docType(f)||f.size>DOC_MAX?'<span class="doc-invalid"> · No permitido</span>':''}</div>`).join('')}</div>`:'Todavía no has seleccionado archivos.';
}
addClient=function(existing=null){
 const c=existing||{name:'',phone:'',document:'',address:'',reference:'',notes:''};
 const markup=`<div class="formgrid">${field('Nombre completo *','name',c.name,'text',{required:true,full:true})}${field('Teléfono','phone',c.phone,'tel')}${field('Documento / número','document',c.document)}${field('Dirección','address',c.address,'text',{full:true})}${window.micarteraMaps.clientField(c)}${field('Referencia / contacto alternativo','reference',c.reference,'text',{full:true})}${field('Notas','notes',c.notes,'textarea',{full:true})}${docPickerMarkup(existing)}</div>`;
 openModal(existing?'Editar cliente':'Nuevo cliente',markup,existing?'Guardar cambios':'Crear cliente',async(f,form)=>{
  const name=String(f.get('name')||'').trim();if(!name){notify('Escribe el nombre del cliente.');return}
  const files=Array.from(form.querySelector('#clientDocsInput')?.files||[]);
  const rawMapUrl=String(f.get('mapUrl')||'').trim();
  const mapUrl=rawMapUrl?window.micarteraMaps.validate(rawMapUrl):'';
  if(rawMapUrl&&!mapUrl){notify('Pega un enlace válido de Google Maps (https://maps.app.goo.gl o google.com/maps).');return}
  const values={name,mapUrl,phone:String(f.get('phone')||'').trim(),document:String(f.get('document')||'').trim(),address:String(f.get('address')||'').trim(),reference:String(f.get('reference')||'').trim(),notes:String(f.get('notes')||'').trim()};
  // Validar los archivos ANTES de escribir los datos del cliente.
  try{files.forEach(docCheck);if(files.length){const previous=existing?await docForClient(existing.id):[];
   if(files.length+previous.length>DOC_COUNT)throw Error(`Límite de ${DOC_COUNT} documentos por cliente.`);
   if(files.reduce((s,x)=>s+x.size,previous.reduce((s,x)=>s+Number(x.size||0),0))>DOC_TOTAL)throw Error('Límite de 45 MB de documentos por cliente.');}}
  catch(err){notify(docErrMessage(err));return}
  const before=existing?{...existing}:null;
  const current=existing||{id:id(),...values,createdAt:today()};
  if(existing)Object.assign(existing,values);else data.clients.push(current);
  if(!save()){
   if(existing)Object.assign(existing,before);else data.clients=data.clients.filter(x=>x.id!==current.id);
   return;
  }
  if(files.length){
   try{const qty=await docSaveFiles(current.id,files);closeModal();render();notify(`Cliente ${existing?'actualizado':'creado'} · ${qty} documento(s) guardados`)}
   catch(err){closeModal();render();alert(`Se guardaron los datos del cliente, pero NO se guardaron todos los documentos. ${docErrMessage(err)}. Revisa Documentos y vuelve a añadir los que falten.`)}
  }else{closeModal();render();notify(existing?'Cliente actualizado':'Cliente creado')}
 });
 const input=$('#clientDocsInput');input?.addEventListener('change',()=>docPreviewFiles(input));
};
async function docRenderManager(cid){
 const listEl=$('#clientDocList');if(!listEl||!client(cid))return;
 docRevokeUrls();
 try{
  const rows=await docForClient(cid);
  if(!$('#clientDocList'))return;
  listEl.innerHTML=rows.length?rows.map(x=>{
   const url=URL.createObjectURL(x.blob);docModalUrls.push(url);
   return `<article class="doc-row"><div class="doc-icon">${x.type==='application/pdf'?'PDF':'IMG'}</div><div class="doc-info"><b>${esc(x.name)}</b><small>${docFormatSize(x.size)} · ${new Date(x.createdAt).toLocaleDateString('es')}</small><div class="doc-links"><a href="${url}" target="_blank" rel="noopener noreferrer">Ver</a><a href="${url}" download="${esc(x.name)}">Guardar</a><button type="button" data-action="delete-client-doc:${esc(x.id)}" class="doc-remove">Eliminar</button></div></div></article>`;
  }).join(''):`<div class="empty"><b>No hay documentos</b><div>Adjunta una imagen o PDF para este cliente.</div></div>`;
  $('#docCountLabel').textContent=`${rows.length} de ${DOC_COUNT} documentos`;
 }catch(err){listEl.textContent='No se pudieron abrir los documentos: '+docErrMessage(err)}
}
function openClientDocuments(cid){const c=client(cid);if(!c)return;
 openModal('Documentos · '+esc(c.name),`<div class="doc-summary"><b>Archivos de ${esc(c.name)}</b><small id="docCountLabel">Consultando documentos…</small></div>
 <div class="note">Los documentos contienen información privada. Solo se almacenan en este dispositivo; guárdalos también en un respaldo seguro.</div>
 <div class="doc-upload"><label class="btn primary doc-add" for="clientDocManagerInput">＋ Adjuntar documento</label><input id="clientDocManagerInput" type="file" accept="${acceptDoc}" multiple><small>Fotos, imágenes y PDF · hasta 6 MB cada uno</small></div>
 <div id="clientDocList" class="doc-manager-list">Cargando…</div>`,'Cerrar',()=>closeModal());
 $('#clientDocManagerInput')?.addEventListener('change',async(e)=>{
  const input=e.currentTarget,files=Array.from(input.files||[]);if(!files.length)return;
  input.disabled=true;
  try{const n=await docSaveFiles(cid,files);notify(`${n} documento(s) guardado(s)`);await docRenderManager(cid)}
  catch(err){alert(`No se pudieron guardar todos los documentos: ${docErrMessage(err)}. Revisa la lista y vuelve a seleccionar los que falten.`);await docRenderManager(cid)}
  finally{if($('#clientDocManagerInput')){$('#clientDocManagerInput').value='';$('#clientDocManagerInput').disabled=false}}
 });
 docRenderManager(cid);
}
const baseDetailClientDocuments=detailClient;
detailClient=function(cid){baseDetailClientDocuments(cid);
 const c=client(cid),form=$('#activeForm');if(!form||!c)return;
 const box=document.createElement('div');box.className='card doc-entry';box.innerHTML=`<div class="row"><div><div class="cardtitle">▣ Documentos del cliente</div><div class="sub" id="docDetailCount">Fotos, identificaciones y PDF</div></div>${btn('Ver documentos','client-docs:'+cid,'secondary small')}</div>`;
 form.insertBefore(box,form.firstChild);
 docForClient(cid).then(arr=>{const label=$('#docDetailCount');if(label)label.textContent=`${arr.length} documento(s) adjunto(s) · disponibles sin conexión`}).catch(()=>{});
};
const baseClientMenuDocuments=clientMenu;
clientMenu=function(cid){baseClientMenuDocuments(cid);const form=$('#activeForm');if(form&&client(cid)){const row=document.createElement('div');row.className='stickyactions';row.innerHTML=btn('▣ Documentos del cliente','client-docs:'+cid,'secondary');form.appendChild(row)}};
// Exportar JSON con los blobs convertidos a data URL, para respaldos portables.
function docBlobToDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('No se pudo leer uno de los documentos'));r.readAsDataURL(blob)})}
function docDataToBlob(text,type){const b64=String(text).split(',')[1];const bytes=atob(b64);const buffer=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)buffer[i]=bytes.charCodeAt(i);return new Blob([buffer],{type})}
async function docBackupRecords(){const entries=await docAll();const out=[];
 for(const entry of entries){if(!client(entry.clientId))continue;out.push({id:entry.id,clientId:entry.clientId,name:entry.name,type:entry.type,size:entry.size,createdAt:entry.createdAt,data:await docBlobToDataURL(entry.blob)})}
 return out;
}
exportBackup=async function(){
 try{const attachments=await docBackupRecords();const backup={...data,clientDocuments:attachments,backupCreatedAt:new Date().toISOString(),backupVersion:'2.8-documents'};
  const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});
  const dt=new Date(),stamp=`${today()}_${String(dt.getHours()).padStart(2,'0')}${String(dt.getMinutes()).padStart(2,'0')}${String(dt.getSeconds()).padStart(2,'0')}`;
  const prepared={blob,filename:`MiCartera-RUTA-${stamp}.json`,routeCount:1,documentCount:attachments.length};
  if(typeof window.MiCarteraBackupDelivery==='function')await window.MiCarteraBackupDelivery(prepared);
  else{downloadBlob(prepared.blob,prepared.filename);notify(`Respaldo preparado (${attachments.length} documento(s))`);}
 }catch(err){alert(`No se exportó una copia completa porque falló la lectura de documentos: ${docErrMessage(err)}. No borres la aplicación ni los archivos actuales.`)}
};
function docVerifyBackup(files,ids){
 if(!Array.isArray(files)||files.length>1000)throw Error('Lista de documentos inválida o demasiado larga');
 let sum=0;const unique=new Set();const perClient=new Map();
 return files.map(x=>{
  if(!x||typeof x.id!=='string'||x.id.length>100||!/^[-\w.]+$/.test(x.id)||unique.has(x.id))throw Error('Identificador de documento inválido');unique.add(x.id);
  if(!ids.has(x.clientId)||typeof x.name!=='string'||!x.name||x.name.length>180||!allowedMime.has(x.type))throw Error('Datos de documento incompatibles');
  if(!Number.isInteger(x.size)||x.size<1||x.size>DOC_MAX||typeof x.data!=='string'||!x.data.startsWith(`data:${x.type};base64,`))throw Error('Formato de adjunto inválido');
  sum+=x.size;if(sum>85*1024*1024)throw Error('El respaldo excede el máximo de 85 MB de documentos');
  const entryCount=perClient.get(x.clientId)||{count:0,size:0};entryCount.count++;entryCount.size+=x.size;
  if(entryCount.count>DOC_COUNT||entryCount.size>DOC_TOTAL)throw Error('Exceso de documentos de un cliente en el respaldo');
  perClient.set(x.clientId,entryCount);
  const payload=x.data.split(',')[1];if(!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)||payload.length>Math.ceil(DOC_MAX*4/3)+8)throw Error('Archivo adjunto inválido');
  const blob=docDataToBlob(x.data,x.type);
  if(blob.size!==x.size)throw Error('Tamaño de documento no coincide con el respaldo');
  return {id:x.id,clientId:x.clientId,name:x.name,type:x.type,size:x.size,createdAt:Number(x.createdAt)||Date.now(),blob};
 });
}
function docReplaceAll(entries){return docDB().then(db=>new Promise((resolve,reject)=>{
 const t=db.transaction(DOC_STORE,'readwrite');const store=t.objectStore(DOC_STORE);store.clear();for(const entry of entries)store.put(entry);
 t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>{db.close();reject(t.error||new Error('Fallo al restaurar adjuntos'))};t.onabort=()=>{db.close();reject(t.error||new Error('No hay almacenamiento suficiente para restaurar adjuntos'))};
}))}
importBackup=function(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{const file=input.files?.[0];if(!file)return;
  if(file.size>125*1024*1024){notify('El respaldo supera el máximo de 125 MB.');return}
  try{
   const raw=JSON.parse(await file.text());let fresh=raw,converted=false,missing=0;
   if(raw?.data?.cashMovements||raw?.cashMovements){const result=readAndroidBackup(raw);fresh=result.converted;missing=result.receipts;converted=true}
   if(!backupIsValid(fresh))throw Error('Datos financieros no válidos o incompletos');
   const clientIds=new Set(fresh.clients.map(x=>x.id));const attached=docVerifyBackup(converted?[]:raw.clientDocuments||[],clientIds);
   const warning=converted?`Copia Android. ${missing} comprobante(s) interno(s) de Android no podrán recuperarse desde este JSON.`:`Se recuperarán ${attached.length} documento(s) de cliente. Los documentos actuales serán reemplazados.`;
   if(!confirm(`RESTAURAR MI CARTERA\n\n${warning}\n\nSE BORRARÁ la cartera actual de ESTE iPhone. Antes debes haber guardado su propia copia de seguridad. ¿Continuar?`))return;
   const oldData=data;data={...emptyData(),...fresh};if(!save()){data=oldData;return}
   try{await docReplaceAll(attached)}catch(err){data=oldData;save();throw Error('No se restauraron los documentos. Se ha recuperado la cartera anterior: '+docErrMessage(err))}
   closeModal();showTab('dashboard');notify(converted?'Copia Android importada; revisa los saldos.':`Cartera y ${attached.length} documento(s) restaurados`);
  }catch(err){alert('No se pudo importar el respaldo: '+docErrMessage(err))}
 };input.click();
};
wipeData=async function(){
 const word=prompt('RESTABLECER TODO eliminará los datos financieros y los documentos de clientes de ESTE iPhone. Escribe exactamente: confirmo');
 if(word!=='confirmo'){notify('Cancelado. Debes escribir confirmo.');return}
 if(!confirm('ÚLTIMA CONFIRMACIÓN: se borrarán definitivamente clientes, créditos, cobros, Caja, cierres, imágenes y PDF. ¿Continuar?'))return;
 const oldData=data;data=emptyData();if(!save()){data=oldData;return}
 try{await docClear();closeModal();showTab('dashboard');notify('Mi Cartera y los documentos se restablecieron a cero')}
 catch(err){data=oldData;save();alert('No se borraron los documentos. Se recuperó la cartera anterior. '+docErrMessage(err))}
};
const actionBeforeClientDocs=handleAction;
handleAction=function(action){
 if(action.startsWith('client-docs:')){openClientDocuments(action.slice('client-docs:'.length));return}
 if(action.startsWith('delete-client-doc:')){
  const docId=action.slice('delete-client-doc:'.length);
  const node=$('#clientDocList');if(!node)return;
  (async()=>{const entry=(await docAll()).find(x=>x.id===docId);if(!entry)return;
   if(!confirm(`¿Eliminar «${entry.name}» de los documentos de ${client(entry.clientId)?.name||'este cliente'}? Esta acción no se puede deshacer.`))return;
   try{await docDelete(entry.id);await docRenderManager(entry.clientId);notify('Documento eliminado')}catch(err){alert('No se pudo eliminar: '+docErrMessage(err))}
  })().catch(err=>notify('No se pudo abrir el documento: '+docErrMessage(err)));
  return;
 }
 if(action.startsWith('delete-client:')){
  const cid=action.slice('delete-client:'.length),c=client(cid);
  if(!c)return;if(isDayClosed()){notify('Caja cerrada hasta las 00:00 del día siguiente.');return}
  if(!confirm(`¿Eliminar a ${c.name}, todos sus créditos y abonos y sus documentos adjuntos? La Caja se ajustará automáticamente. Esta acción no se puede deshacer.`))return;
  data.loans.filter(l=>l.clientId===cid).map(l=>l.id).forEach(removeLoanAndPayments);data.clients=data.clients.filter(x=>x.id!==cid);
  if(!save()){alert('No se pudieron guardar los cambios.');return}
  docDeleteClient(cid).then(()=>{closeModal();render();notify('Cliente, préstamos y documentos eliminados')}).catch(err=>{closeModal();render();alert('Cliente eliminado, pero no se pudieron borrar todos sus documentos locales: '+docErrMessage(err))});
  return;
 }
 return actionBeforeClientDocs(action);
};
// El botón superior de exportación del proyecto original también llama de forma dinámica
// a exportBackup() (ver app.js), evitando generar respaldos antiguos sin adjuntos.
