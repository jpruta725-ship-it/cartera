'use strict';
/* Mi Cartera iPhone 3.4 — rutas locales independientes e historial de puntualidad.
 * No se comparte información entre rutas ni entre dispositivos.
 * El antiguo KEY se conserva intacto como punto de recuperación de la migración.
 */
(function () {
  const ROUTES_KEY = 'micartera.pwa.routes.v1';
  const ROUTE_LIMIT = 25;
  const CLONE = obj => JSON.parse(JSON.stringify(obj));
  const cleanName = str => String(str || '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const validRecords = x => x && typeof x === 'object' &&
    ['clients','loans','payments','movements','closes'].every(key => Array.isArray(x[key])) &&
    Number.isFinite(Number(x.cashBase));
  let registry = null;
  let ready = false;
  let bootError = '';

  try {
    const previous = localStorage.getItem(ROUTES_KEY);
    if (previous !== null) {
      const parsed = JSON.parse(previous);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.routes) || !parsed.routes.length || parsed.routes.length > ROUTE_LIMIT ||
        new Set(parsed.routes.map(r => r.id)).size !== parsed.routes.length ||
        !parsed.routes.every(r => typeof r.id === 'string' && /^[\w.:-]{1,100}$/.test(r.id) && cleanName(r.name) && validRecords(r.data)) ||
        !parsed.routes.some(r => r.id === parsed.activeId)) throw Error('El registro de rutas no pasó la comprobación de integridad');
      registry = parsed;
      data = CLONE(registry.routes.find(r => r.id === registry.activeId).data);
      ready = true;
    } else {
      // Migración no destructiva: la cartera existente pasa a ser "Ruta principal".
      registry = {version:1,activeId:'ruta-principal',routes:[{id:'ruta-principal',name:'Ruta principal',notes:'Cartera anterior a las rutas',data:CLONE(data)}]};
      localStorage.setItem(ROUTES_KEY,JSON.stringify(registry));
      ready = true;
    }
  } catch (err) {
    bootError = String(err?.message || err);
    // Si ya había datos de rutas y no son legibles, nunca se sobrescriben.
    if (localStorage.getItem(ROUTES_KEY) !== null) {
      ready = false;
    } else {
      // Si se agotó espacio para migrar, continuar con la cartera anterior.
      ready = false;
    }
  }
  const currentRoute = () => registry?.routes?.find(r => r.id === registry.activeId);
  function saveRoutes() {
    if (!ready) return false;
    const current = currentRoute();
    if (!current) return false;
    const prior = CLONE(current.data);
    current.data = CLONE(data);
    try {
      localStorage.setItem(ROUTES_KEY, JSON.stringify(registry));
      return true;
    } catch (err) {
      current.data = prior;
      data = CLONE(prior);
      notify('No hay espacio para guardar rutas. No se confirmó la operación; exporta un respaldo.');
      throw Error('No se guardaron los datos de la ruta. Se restauró la versión anterior.');
    }
  }
  const legacySave = save;
  if (ready) save = saveRoutes;

  function routeStats(r) {
    const x = r.data;
    const sum = x.loans.reduce((acc,l) => {
      const cents = Math.round(Number(l.principal || 0) * (1 + Number(l.interest || 0)/100) * 100);
      const collected = x.payments.filter(p => p.loanId === l.id).reduce((s,p) => s + Math.round(Number(p.amount || 0)*100),0);
      return acc + Math.max(0,cents-collected);
    },0);
    return {clients:x.clients.length,loans:x.loans.length,pending:sum/100, cash:Number(x.cashBase)||0};
  }
  function saveRegistryMetadata() {
    try {localStorage.setItem(ROUTES_KEY, JSON.stringify(registry));return true}
    catch(err){notify('No se pudieron guardar los cambios de rutas: comprueba el espacio libre.');return false}
  }
  function switchRoute(rid) {
    if (!ready || rid === registry.activeId) {closeModal();return}
    const target = registry.routes.find(r=>r.id===rid); if (!target) return;
    try {if (!saveRoutes()) throw Error('No se guardó la ruta actual');}
    catch(err){alert(String(err.message));return}
    const previousId=registry.activeId;
    registry.activeId=rid;
    if (!saveRegistryMetadata()) {registry.activeId=previousId;return}
    data=CLONE(target.data);
    // Los filtros de cartera se mantienen, pero las búsquedas se limpian.
    if (typeof loanQuery!=='undefined') loanQuery='';
    if (typeof clientQuery!=='undefined') clientQuery='';
    if (typeof collectionQuery!=='undefined') collectionQuery='';
    closeModal();showTab('dashboard');notify('Ruta activa: '+target.name);
  }
  function routeMarkup() {
    return `<div class="route-manager-intro">Cada ruta tiene sus propios clientes, préstamos, pagos, Clavos, Caja, cierres y reportes. <b>Selecciona una ruta antes de trabajar.</b></div>
      <div class="route-list">${registry.routes.map(r=>{
       const s=routeStats(r),active=r.id===registry.activeId;
       return `<div class="route-item ${active?'route-active':''}"><div class="row"><div class="route-item-info"><b>${esc(r.name)}</b><small>${s.clients} clientes · ${s.loans} créditos · Caja ${money(s.cash)}</small><small>Pendiente: ${money(s.pending)}</small></div><span class="pill ${active?'green':''}">${active?'Actual':'Otra ruta'}</span></div>
         <div class="route-actions">${active?'':btn('Abrir ruta','route-open:'+r.id,'primary small')}${btn('Renombrar','route-rename:'+r.id,'secondary small')}${registry.routes.length>1?btn('Eliminar','route-delete:'+r.id,'danger small'):''}</div></div>`}).join('')}</div>
      <div class="route-actions">${btn('＋ Crear ruta','route-new','primary')}${btn('⇩ Respaldar todas las rutas','routes-export-all','secondary')}</div>
      <div class="route-actions">${btn('⇧ Restaurar todas las rutas','routes-import-all','secondary')}${btn('Respaldo de esta ruta','routes-export-one','ghost')}</div>
      <div class="note">Los respaldos de todas las rutas contienen información privada de clientes y documentos. Guárdalos fuera de GitHub. Cada iPhone sigue siendo independiente.</div>`;
  }
  function routesModal() {
    if (!ready) {alert('No se pudo inicializar Rutas sin riesgo para los datos. '+bootError+'\nHaz una copia de seguridad de la cartera anterior antes de continuar.');return}
    openModal('Rutas de cobranza',routeMarkup(),'Cerrar',()=>closeModal());
  }
  function createRoute() {
    if (registry.routes.length>=ROUTE_LIMIT) {notify('Límite de '+ROUTE_LIMIT+' rutas.');return}
    openModal('Crear nueva ruta',`<div class="note">La ruta nueva comienza con clientes, préstamos, Caja y cierres en cero; no copia la ruta actual.</div>
      <div class="field"><label for="routeNewName">Nombre de la ruta *</label><input id="routeNewName" name="name" required maxlength="60" placeholder="Ej.: Ruta Centro, Ruta Norte" autocomplete="off"></div>
      <div class="field"><label for="routeNewNotes">Descripción (opcional)</label><textarea id="routeNewNotes" name="notes" maxlength="240" placeholder="Zona, cobrador o detalles para reconocer esta ruta"></textarea></div>`,'Crear ruta',(f)=>{
      const name=cleanName(f.get('name'));if(!name){notify('Escribe un nombre de ruta.');return}
      if(registry.routes.some(r=>r.name.toLocaleLowerCase()===name.toLocaleLowerCase())){notify('Ya existe una ruta con ese nombre.');return}
      const added={id:id(),name,notes:String(f.get('notes')||'').slice(0,240),data:emptyData()};
      registry.routes.push(added);
      if (!saveRegistryMetadata()) {registry.routes.pop();return}
      switchRoute(added.id);
    });
  }
  function renameRoute(rid) {
    const r=registry.routes.find(x=>x.id===rid);if(!r)return;
    const answer=prompt('Nuevo nombre para esta ruta:',r.name);if(answer===null)return;
    const name=cleanName(answer);if(!name){notify('El nombre no puede quedar vacío.');return}
    if(registry.routes.some(x=>x.id!==rid&&x.name.toLocaleLowerCase()===name.toLocaleLowerCase())){notify('Ese nombre ya pertenece a otra ruta.');return}
    const prev=r.name;r.name=name;if(!saveRegistryMetadata()){r.name=prev;return}
    routesModal();notify('Ruta renombrada');
  }
  async function deleteRoute(rid) {
    if(registry.routes.length<2)return;
    const r=registry.routes.find(x=>x.id===rid);if(!r)return;
    const answer=prompt(`VAS A BORRAR TODA LA RUTA «${r.name}»: clientes, créditos, abonos, Caja, cierres y documentos.\nPrimero exporta el respaldo completo.\n\nEscribe exactamente el nombre de la ruta para confirmar:`);
    if(answer!==r.name){notify('Eliminación cancelada.');return}
    if(!confirm(`¿Eliminar permanentemente «${r.name}» y todos sus datos locales? No se puede deshacer.`))return;
    const before=CLONE(registry);const beforeData=CLONE(data);
    const deletedIds=new Set(r.data.clients.map(c=>c.id));
    try {
      const documentsToKeep=(await docAll()).filter(x=>!deletedIds.has(x.clientId));
      registry.routes=registry.routes.filter(x=>x.id!==rid);
      if(registry.activeId===rid)registry.activeId=registry.routes[0].id;
      if(!saveRegistryMetadata())throw Error('No se pudo guardar el cambio de rutas');
      await docReplaceAll(documentsToKeep);
      data=CLONE(currentRoute().data);
      closeModal();render();notify('Ruta eliminada con sus documentos');
    }catch(err){
      registry=before;data=beforeData;saveRegistryMetadata();
      alert('No se eliminó la ruta porque falló la operación: '+String(err.message||err));
    }
  }

  // Puntuación descriptiva basada exclusivamente en las fechas y los importes registrados.
  // Una cuota está atrasada si no estaba cubierta AL TERMINAR su fecha de vencimiento.
  // Un préstamo cuenta solo una vez, aunque varias cuotas del préstamo se retrasaran.
  function customerQuality(cid, source=data, day=today()) {
    const loans=source.loans.filter(l=>l.clientId===cid);
    let reviewed=0,late=0,onTime=0,notDue=0;
    const details=[];
    for (const l of loans) {
      const dates=dueDates(l);
      if(!dates.length){notDue++;continue}
      const amounts=Array.isArray(l.scheduleAmounts)&&l.scheduleAmounts.length===dates.length?
        l.scheduleAmounts:makeAmounts({...l,count:dates.length});
      const payments=source.payments.filter(p=>p.loanId===l.id&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)).sort((a,b)=>a.date.localeCompare(b.date));
      let dueCents=0, k=0, paidCents=0,wasLate=false,hasMatured=false;
      for(let i=0;i<dates.length;i++){
        if(dates[i]>=day)break;
        hasMatured=true;
        dueCents+=Math.round(Number(amounts[i]||0)*100);
        while(k<payments.length&&payments[k].date<=dates[i]){paidCents+=Math.round(Number(payments[k].amount||0)*100);k++}
        if(paidCents+1<dueCents)wasLate=true;
      }
      const fullyPaid=Math.round(Number(l.principal)*(1+Number(l.interest)/100)*100)<=
        payments.reduce((s,p)=>s+Math.round(Number(p.amount||0)*100),0)+1;
      if(!hasMatured&&!fullyPaid){notDue++;continue}
      reviewed++;
      if(wasLate)late++;else onTime++;
      details.push({id:l.id,title:l.title||'Crédito',late:wasLate,fullyPaid});
    }
    const score=reviewed?Math.round(onTime/reviewed*100):null;
    const label=reviewed<3?'Historial insuficiente':score>=80?'Bueno':score>=50?'Regular':'Malo';
    const tone=reviewed<3?'neutral':score>=80?'green':score>=50?'amber':'red';
    return {reviewed,late,onTime,notDue,score,label,tone,details,loans:loans.length};
  }
  window.miCarteraQuality = customerQuality;
  const baseCardClient=cardClient;
  cardClient=function(c){
    const original=baseCardClient(c),q=customerQuality(c.id);
    const badge=`<div class="client-quality-inline"><span class="pill ${q.tone==='neutral'?'':q.tone}">Historial: ${esc(q.label)}</span><small>${q.reviewed?`${q.onTime} a tiempo · ${q.late} con atrasos`:'Sin préstamos evaluables todavía'}</small></div>`;
    return original.replace('</article>',badge+'</article>');
  };
  const baseDetailClient=detailClient;
  detailClient=function(cid){
    baseDetailClient(cid);
    const c=client(cid),form=$('#activeForm');if(!c||!form)return;
    const q=customerQuality(cid);
    const panel=document.createElement('div');panel.className='card quality-report';
    panel.innerHTML=`<div class="row"><div><div class="cardtitle">Calidad del historial de pagos</div><div class="sub">Evaluación basada solo en cuotas y fechas registradas</div></div><span class="pill ${q.tone==='neutral'?'':q.tone}">${esc(q.label)}</span></div>
      <div class="quality-score"><strong>${q.score===null?'—':q.score+' / 100'}</strong><span>${q.reviewed<3?'Resultado provisional · se necesitan 3 créditos evaluables':q.score+'% de créditos sin atrasos registrados'}</span></div>
      <div class="quality-progress"><i style="width:${q.score===null?0:q.score}%"></i></div>
      <div class="detailgrid"><div class="detailbox"><small>Créditos evaluados</small><b>${q.reviewed}</b></div><div class="detailbox"><small>Sin atrasos</small><b>${q.onTime}</b></div><div class="detailbox"><small>Con atrasos</small><b>${q.late}</b></div><div class="detailbox"><small>Aún no evaluables</small><b>${q.notDue}</b></div></div>
      <p class="sub">Un crédito se clasifica con atraso si alguna cuota no estaba cubierta en su fecha. Se analiza el historial, incluso si después se pagó. Con menos de 3 créditos evaluables el resultado no se clasifica. Bueno: ≥80 %, Regular: 50–79 %, Malo: menos de 50 %. Esta referencia no decide automáticamente si debes prestar.</p>
      ${q.details.length?`<div class="quality-history">${q.details.map(row=>`<div class="row"><span>${esc(row.title)}</span><span class="pill ${row.late?'red':'green'}">${row.late?'Tuvo atrasos':'En fecha'}</span></div>`).join('')}</div>`:''}`;
    form.insertBefore(panel,form.firstChild);
  };

  // Informe consolidado de puntualidad de la RUTA activa.
  const earlierCharts=renderCharts;
  renderCharts=function(){
    earlierCharts();
    const root=$('#charts');if(!root)return;
    const scored=data.clients.map(c=>({c,q:customerQuality(c.id)}));
    const eligible=scored.filter(x=>x.q.reviewed>=3);
    const green=eligible.filter(x=>x.q.label==='Bueno').length;
    const amber=eligible.filter(x=>x.q.label==='Regular').length;
    const red=eligible.filter(x=>x.q.label==='Malo').length;
    const pending=scored.length-eligible.length;
    root.insertAdjacentHTML('afterbegin',`<div class="card route-quality-overview"><div class="cardtitle">Puntualidad de clientes · ${esc(currentRoute().name)}</div>
     <p class="sub">Resumen según los pagos registrados de esta ruta. No determina automáticamente a quién conceder créditos.</p>
     <div class="detailgrid"><div class="detailbox"><small>Bueno</small><b class="green-val">${green}</b></div><div class="detailbox"><small>Regular</small><b>${amber}</b></div><div class="detailbox"><small>Malo</small><b>${red}</b></div><div class="detailbox"><small>Historial insuficiente</small><b>${pending}</b></div></div>
     ${scored.length?`<div class="quality-history">${scored.sort((a,b)=>a.c.name.localeCompare(b.c.name)).map(({c,q})=>`<div class="row"><div><b>${esc(c.name)}</b><div class="sub">${q.reviewed} crédito(s) evaluado(s) · ${q.late} con atrasos</div></div><span class="pill ${q.tone==='neutral'?'':q.tone}">${q.score===null?'—':q.score+'/100'} · ${esc(q.label)}</span></div>`).join('')}</div>`:'<p class="sub">Registra clientes y créditos para ver el informe.</p>'}
     </div>`);
  };

  // No borrar documentos de otras rutas al importar o restablecer SOLO la activa.
  const baseBackupValid=backupIsValid;
  backupIsValid=function(candidate){
    if(!baseBackupValid(candidate))return false;
    if(!ready||!candidate||!Array.isArray(candidate.clients))return true;
    const otherIds=new Set(registry.routes.filter(r=>r.id!==registry.activeId).flatMap(r=>r.data.clients.map(c=>c.id)));
    return !candidate.clients.some(c=>otherIds.has(c.id));
  };
  async function allDocumentRecords() {
    const allIds=new Set(registry.routes.flatMap(r=>r.data.clients.map(c=>c.id)));
    const files=(await docAll()).filter(f=>allIds.has(f.clientId));
    const out=[];
    for(const f of files)out.push({id:f.id,clientId:f.clientId,name:f.name,type:f.type,size:f.size,createdAt:f.createdAt,data:await docBlobToDataURL(f.blob)});
    return out;
  }
  async function exportAllRoutes() {
    if(!ready)return;
    try {
      saveRoutes();
      const files=await allDocumentRecords();
      const pack={format:'micartera.rutas.v1',version:1,createdAt:new Date().toISOString(),activeId:registry.activeId,
       routes:CLONE(registry.routes),clientDocuments:files};
      const content=JSON.stringify(pack);
      if(content.length>125*1024*1024)throw Error('El respaldo supera el tamaño máximo de 125 MB');
      downloadBlob(new Blob([content],{type:'application/json'}),`MiCartera-TODAS-LAS-RUTAS-${today()}.json`);
      notify(`Respaldo completo: ${registry.routes.length} ruta(s) y ${files.length} documento(s)`);
    }catch(err){alert('No se pudo crear el respaldo completo de rutas: '+String(err.message||err))}
  }
  const oldExportBackup=exportBackup;
  exportBackup=exportAllRoutes; // El botón rápido también protege TODAS las rutas.
  async function exportOneRoute(){
    // Para evitar confusiones, conservar el exportador original con documentos de la ruta activa.
    if(!confirm(`Este archivo incluirá únicamente la ruta «${currentRoute().name}». Para pasar todas las rutas a otro iPhone usa «Respaldar todas las rutas». ¿Continuar?`))return;
    try{saveRoutes();await oldExportBackup()}catch(err){alert('No se pudo exportar esta ruta: '+String(err.message||err))}
  }
  async function restoreAll(pack) {
    if(!ready)throw Error('El registro local de rutas no se pudo abrir');
    if(pack.format!=='micartera.rutas.v1'||pack.version!==1||!Array.isArray(pack.routes)||!pack.routes.length||pack.routes.length>ROUTE_LIMIT)throw Error('El archivo no es un respaldo completo de rutas');
    const ids=new Set(),names=new Set(),clientIds=new Set();
    for(const r of pack.routes){
      if(typeof r.id!=='string'||!/^[\w.:-]{1,100}$/.test(r.id)||ids.has(r.id))throw Error('Identificador de ruta inválido o repetido');ids.add(r.id);
      const name=cleanName(r.name);if(!name||names.has(name.toLowerCase()))throw Error('Nombre de ruta vacío o repetido');names.add(name.toLowerCase());
      if(name!==r.name||String(r.notes||'').length>240)throw Error('Nombre o descripción de ruta inválido');
      if(!baseBackupValid(r.data))throw Error('La ruta «'+name+'» contiene datos financieros inválidos');
      for(const c of r.data.clients){if(clientIds.has(c.id))throw Error('Un cliente aparece en varias rutas con el mismo identificador');clientIds.add(c.id)}
    }
    if(!ids.has(pack.activeId))throw Error('No se reconoce la ruta activa del respaldo');
    const attached=docVerifyBackup(pack.clientDocuments||[],clientIds);
    if(!confirm(`RESTAURAR ${pack.routes.length} RUTAS Y ${attached.length} DOCUMENTOS.\n\nEsto REEMPLAZA TODAS las rutas y documentos actuales de este iPhone. Exporta primero un respaldo externo. ¿Continuar?`))return;
    const old=localStorage.getItem(ROUTES_KEY),oldReg=registry,oldData=data;
    const incoming={version:1,activeId:pack.activeId,routes:CLONE(pack.routes)};
    try{
      localStorage.setItem(ROUTES_KEY,JSON.stringify(incoming));
      await docReplaceAll(attached);
      registry=incoming;data=CLONE(currentRoute().data);
      closeModal();showTab('dashboard');notify('Rutas y documentos restaurados correctamente');
    }catch(err){
      try{old===null?localStorage.removeItem(ROUTES_KEY):localStorage.setItem(ROUTES_KEY,old)}catch(_){ }
      registry=oldReg;data=oldData;
      throw err;
    }
  }
  async function restoreOne(raw){
    let fresh=raw,converted=false,missing=0;
    if(raw?.data?.cashMovements||raw?.cashMovements){const result=readAndroidBackup(raw);fresh=result.converted;missing=result.receipts;converted=true}
    if(!backupIsValid(fresh))throw Error('El respaldo tiene errores o identificadores de clientes que ya pertenecen a otra ruta');
    const newIds=new Set(fresh.clients.map(c=>c.id));
    const attached=docVerifyBackup(converted?[]:raw.clientDocuments||[],newIds);
    const route=currentRoute();
    const allOtherIds=new Set(registry.routes.filter(r=>r.id!==registry.activeId).flatMap(r=>r.data.clients.map(c=>c.id)));
    const keep=(await docAll()).filter(x=>allOtherIds.has(x.clientId));
    if(!confirm(`RESTAURAR SOLO LA RUTA «${route.name}».\n\nReemplazará todos sus clientes, créditos, Caja, cierres y documentos; las otras rutas permanecerán intactas. ${converted?missing+' comprobante(s) internos de Android no pueden recuperarse del JSON.':''}\n\n¿Continuar?`))return;
    const old=CLONE(data);
    try{
      const {clientDocuments,backupCreatedAt,backupVersion,...financial}=fresh;
      data={...emptyData(),...financial};saveRoutes();
      await docReplaceAll([...keep,...attached]);
      closeModal();showTab('dashboard');notify('Copia restaurada en la ruta actual');
    }catch(err){
      data=old;try{saveRoutes()}catch(_){}
      throw Error('La restauración no se completó: '+String(err.message||err));
    }
  }
  async function restoreBackupDialog(fullOnly=false) {
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{
      const file=input.files?.[0];if(!file)return;
      if(file.size>125*1024*1024){alert('Respaldo demasiado grande (>125 MB)');return}
      try{
        const raw=JSON.parse(await file.text());
        if(raw?.format==='micartera.rutas.v1')await restoreAll(raw);
        else if(fullOnly)throw Error('Seleccionaste un respaldo individual. Para esta opción necesitas «TODAS LAS RUTAS».');
        else await restoreOne(raw);
      }catch(err){alert('No se pudo restaurar: '+String(err.message||err))}
    };input.click();
  }
  importBackup=function(){return restoreBackupDialog(false)};
  // Restablecer desde Ajustes afecta solamente a la ruta abierta y sus documentos.
  wipeData=async function(){
    if(!ready)return;
    const r=currentRoute(),word=prompt(`RESTABLECER SOLO «${r.name}».\nBorrará clientes, préstamos, cobros, Caja, cierres y documentos de esta ruta. Las demás rutas se conservan.\n\nEscribe confirmo:`);
    if(word!=='confirmo'){notify('Restablecimiento cancelado.');return}
    if(!confirm(`¿Borrar definitivamente todos los datos de «${r.name}»? Primero guarda un respaldo.`))return;
    const prev=CLONE(data);const clients=new Set(prev.clients.map(c=>c.id));
    try{
      const keep=(await docAll()).filter(doc=>!clients.has(doc.clientId));
      data=emptyData();saveRoutes();
      await docReplaceAll(keep);
      closeModal();showTab('dashboard');notify('Ruta actual restablecida a cero');
    }catch(err){data=prev;try{saveRoutes()}catch(_){}alert('No fue posible completar el restablecimiento: '+String(err.message||err))}
  };

  function refreshBadge(){
    const badge=$('#routeSwitch');if(!badge)return;
    badge.textContent=ready?'⌖ '+currentRoute().name:'⚠ Rutas';
    badge.title=ready?'Cambiar ruta de cobranza':'Problema al cargar rutas';
  }
  const oldRender=render;
  render=function(){oldRender();refreshBadge()};
  const oldSettings=renderSettings;
  renderSettings=function(){oldSettings();
    const root=$('#settings');if(root&&ready){
      root.insertAdjacentHTML('afterbegin',`<div class="card"><div class="row"><div><div class="cardtitle">Rutas de cobranza</div><p class="sub">Ruta actual: <b>${esc(currentRoute().name)}</b>. Todas las rutas tienen información financiera independiente.</p></div>${btn('Administrar rutas','open-routes','secondary small')}</div></div>`);
    }
  };
  const oldAppMenu=openAppMenu;
  openAppMenu=function(){oldAppMenu();const form=$('#activeForm');if(form){const b=document.createElement('div');b.innerHTML=btn('⌖ Rutas independientes','open-routes','menu-choice');form.insertBefore(b,form.firstChild)}};
  const oldHandleAction=handleAction;
  handleAction=function(action){
    if(action==='open-routes'){routesModal();return}
    if(action==='route-new'){createRoute();return}
    if(action.startsWith('route-open:')){switchRoute(action.slice(11));return}
    if(action.startsWith('route-rename:')){renameRoute(action.slice(13));return}
    if(action.startsWith('route-delete:')){deleteRoute(action.slice(13));return}
    if(action==='routes-export-all'){exportAllRoutes();return}
    if(action==='routes-export-one'){exportOneRoute();return}
    if(action==='routes-import-all'){restoreBackupDialog(true);return}
    oldHandleAction(action);
  };
  if(!ready){
    $('#routeSwitch').textContent='⚠ Rutas';
    alert('No se pudieron preparar las rutas automáticamente. No se ha borrado la cartera anterior.\n\n'+bootError+'\n\nExporta un respaldo y revisa el almacenamiento disponible.');
  }
  // Rehacer la vista una vez cargada la ruta correcta, no dejar tarjetas de la anterior.
  render();
  window.miCarteraRoutes={getRegistry:()=>registry,getActiveId:()=>registry?.activeId,switchRoute,createRoute,saveRoutes,restoreAll,routeStats};
})();
