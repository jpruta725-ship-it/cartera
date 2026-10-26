/* Mi Cartera iPhone 2.7 – parity layer over v1.1.
   Keeps the original localStorage key and records intact for users who already installed v1.1.
   No server, account or automatic sharing between devices. */
'use strict';
let loanPortfolio='cartera', collectionPortfolio='cartera', loanViewFilter='all';
let loanQuery='', clientQuery='', collectionDueFilter='all', collectionQuery='';
const fmtFrequency=f=>({daily:'Diaria',weekly:'Semanal',fortnightly:'Quincenal',monthly:'Mensual'}[f]||f);
const clavos=()=>data.loans.filter(l=>!!l.isClavo);
const normalLoans=()=>data.loans.filter(l=>!l.isClavo);
const visiblePortfolio=(group)=>data.loans.filter(l=>Boolean(l.isClavo)===(group==='clavos'));
const dueMarker=(l)=>balance(l)<.005?'Pagado':overdueAmount(l)>.005?'Atrasado':'Activo';
const isClavo=l=>Boolean(l&&l.isClavo);
const icons={home:'⌂',clients:'♙',collections:'⇄',cash:'▣',charts:'▥'};
// Earlier releases used the same KEY. Normalize only absent optional fields; no destructive migration.
data.loans.forEach(l=>{if(l.isClavo===undefined)l.isClavo=false;if(!Array.isArray(l.weeklyDays))l.weeklyDays=[];if(!Array.isArray(l.monthDays))l.monthDays=[]});
const originalDueDates=dueDates;
dueDates=function(l){
 if(Array.isArray(l.scheduleDates)&&l.scheduleDates.length)return l.scheduleDates.slice();
 if(l.frequency==='daily'){let d=parseDate(l.startDate),out=[];for(let i=0;i<Number(l.count);i++){d.setDate(d.getDate()+1);out.push(dateInput(d));}return out}
 return makeDueSchedule(l);
};
// Preserve precisely rounded individual installments when an Android JSON copy is converted.
paymentSchedule=function(l){
 const dates=dueDates(l),t=round(total(l)),already=round(paid(l.id));
 const amounts=Array.isArray(l.scheduleAmounts)&&l.scheduleAmounts.length===dates.length?l.scheduleAmounts:makeAmounts({...l,count:dates.length});
 let cursor=0;
 return dates.map((date,i)=>{const amount=round(Number(amounts[i]||0)),before=cursor;cursor=round(cursor+amount);
  return {date,number:i+1,amount,unpaid:round(Math.max(0,Math.min(amount,cursor-already))),paid:round(Math.max(0,Math.min(amount,already-before)))}
 }).filter(x=>x.unpaid>.005);
};
overdueAmount=function(l){return round(Math.max(0,Math.min(total(l),paymentSchedule(l).filter(x=>x.date<today()).reduce((s,x)=>s+x.unpaid,0))))};
suggestedPayment=function(l){return round(Math.min(balance(l),paymentSchedule(l)[0]?.unpaid||installment(l)))};
function navFor(tab){
 $$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
 $('#contextBack').hidden=!(tab==='loans'||tab==='settings');
 $('#currentContext').textContent=tab==='loans'?'Créditos':tab==='settings'?'Copias y ajustes':'';
 document.body.classList.toggle('list-mode',tab==='loans'||tab==='collections');
}
showTab=function(tab){
 currentTab=tab;
 $$('.view').forEach(v=>v.classList.toggle('active',v.id===tab));
 $('.welcome').style.display=tab==='dashboard'?'flex':'none';
 navFor(tab);render();window.scrollTo(0,0);
};
function openAppMenu(){
 openModal('Menú de Mi Cartera',`<div class="menu-list">
 ${btn('▤  Créditos y Clavos','open-loans','menu-choice')}
 ${btn('⇄  Cobros','open-collections','menu-choice')}
 ${btn('▥  Reportes','open-charts','menu-choice')}
 ${btn('◈  Copias de seguridad y ajustes','open-settings','menu-choice')}
 </div><div class="note" style="margin-top:12px">Los datos se guardan únicamente en este iPhone. No hay sincronización con otros teléfonos.</div>`,'Cerrar',null);
}
function openQuickMenu(){openModal('Acción rápida',`<div class="menu-list">
 ${btn('＋ Nuevo cliente','add-client','menu-choice')}
 ${btn('▤ Nuevo crédito','add-loan','menu-choice')}
 ${btn('⇄ Registrar cobro','choose-payment','menu-choice')}
 ${btn('▣ Ingreso o egreso','add-movement','menu-choice')}
 ${btn('◈ Exportar respaldo','export-backup','menu-choice')}
 </div>`,'Cerrar',null)}
function segmented(group,active){return `<div class="segments" role="group" aria-label="Tipo de cartera"><button type="button" class="segment ${active==='cartera'?'active':''}" data-action="${group}-portfolio:cartera">Cartera</button><button type="button" class="segment ${active==='clavos'?'active':''}" data-action="${group}-portfolio:clavos">Clavos${clavos().length?' · '+clavos().length:''}</button></div>`}
function periodSummary(days=7){return Array.from({length:days},(_,idx)=>{let d=new Date();d.setDate(d.getDate()-(days-1-idx));let str=dateInput(d);return {day:str,label:new Intl.DateTimeFormat('es',{weekday:'short'}).format(d),value:round(data.payments.filter(p=>p.date===str).reduce((s,p)=>s+Number(p.amount),0))}})}
function miniBars(){const list=periodSummary(7),max=Math.max(1,...list.map(x=>x.value));return `<div class="card"><div class="row"><span class="cardtitle">Cobros últimos 7 días</span><span class="sub">R$ · por día</span></div><div class="mini-bars">${list.map(x=>`<div class="bar-col" title="${esc(x.day)} · ${money(x.value)}"><span class="bar-plot"><i style="height:${Math.max(x.value?6:3,Math.round(x.value/max*100))}%"></i></span><small>${esc(x.label)}</small></div>`).join('')}</div></div>`}
renderDashboard=function(){
 const loans=normalLoans(), outstanding=round(loans.reduce((s,l)=>s+balance(l),0)),late=round(loans.reduce((s,l)=>s+overdueAmount(l),0));
 const collected=round(data.payments.filter(p=>p.date===today()).reduce((s,p)=>s+Number(p.amount),0));
 const clavoPending=round(clavos().reduce((s,l)=>s+balance(l),0));
 const upcoming=loans.flatMap(l=>paymentSchedule(l).map(x=>({...x,l}))).filter(x=>x.unpaid>.005).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4);
 const closed=isDayClosed();
 $('#dashboard').innerHTML=`<div class="hero-cash card"><div class="sub">EFECTIVO DISPONIBLE EN CAJA</div><strong>${money(data.cashBase)}</strong><div class="sub">${closed?'🔒 Caja cerrada · abre '+cashReopenLabel():'Caja abierta · movimientos locales'}</div></div>
 <div class="metrics"><div class="metric"><div class="metricicon">↗</div><strong>${money(outstanding)}</strong><span>Cartera activa pendiente</span></div><div class="metric"><div class="metricicon">✓</div><strong>${money(collected)}</strong><span>Cobrado hoy</span></div><div class="metric"><div class="metricicon">◷</div><strong>${money(late)}</strong><span>Vencido en cartera</span></div><div class="metric"><div class="metricicon">♙</div><strong>${data.clients.length}</strong><span>Clientes</span></div></div>
 ${clavos().length?`<div class="card clavo-alert"><div class="row"><div><div class="cardtitle">Clavos · ${clavos().length} crédito(s)</div><div class="sub">Pendiente separado de los cobros normales</div></div><strong>${money(clavoPending)}</strong></div>${btn('Ver Clavos','dashboard-clavos','secondary small')}</div>`:''}
 ${miniBars()}
 ${section('Accesos rápidos','Administrar la cartera desde aquí')}<div class="quickgrid"><button class="quick" data-action="add-client"><span>＋</span>Nuevo cliente<small>Datos e historial</small></button><button class="quick" data-action="add-loan"><span>▤</span>Nuevo crédito<small>Capital y cuotas</small></button><button class="quick" data-action="choose-payment"><span>⇄</span>Registrar cobro<small>Abono rápido</small></button><button class="quick" data-action="open-cash"><span>▣</span>Caja y cierre<small>Efectivo y movimientos</small></button></div>
 ${section('Próximos cobros','Agenda de la cartera normal')}${upcoming.length?upcoming.map(x=>`<div class="card"><div class="row"><div><div class="cardtitle">${esc(client(x.l.clientId)?.name||'Cliente')}</div><div class="sub">${fmtDate(x.date)} · Cuota ${x.number} · ${esc(x.l.title||'Crédito')}</div></div><div style="text-align:right"><b>${money(x.unpaid)}</b><div class="stickyactions">${btn('Cobrar','pay-loan:'+x.l.id,'primary small')}</div></div></div></div>`).join(''):empty('Sin cobros próximos','Los préstamos activos aparecerán aquí.')}`;
};
cardClient=function(c){const loans=data.loans.filter(l=>l.clientId===c.id),normal=loans.filter(l=>!l.isClavo),amount=round(loans.reduce((s,l)=>s+balance(l),0)),late=normal.some(l=>overdueAmount(l)>.005);
 const flag=loans.some(l=>isClavo(l));return `<article class="card"><div class="rowtop"><div class="client-top"><div class="brandicon client-avatar">${esc(initials(c.name))}</div><div class="client-info"><div class="cardtitle">${esc(c.name)}</div><div class="sub">${esc(c.phone||'Sin teléfono')} · ${loans.length} crédito(s)</div>${c.document?`<div class="sub">${esc(c.document)}</div>`:''}</div></div><span class="pill ${late?'red':amount>.005?'amber':'green'}">${late?'Atrasado':amount>.005?'Con saldo':'Al día'}</span></div>
 ${flag?'<div class="soft-warning">Tiene crédito(s) en Clavos · Revisa su historial antes de prestar de nuevo.</div>':''}
 <div class="divider"></div><div class="row"><div><div class="sub">Saldo pendiente total</div><div class="amount">${money(amount)}</div></div><div class="stickyactions">${btn('Historial','client-detail:'+c.id,'secondary small')}${btn('Prestar','add-loan-client:'+c.id,'primary small')}${btn('⋮','client-menu:'+c.id,'ghost small')}</div></div></article>`;
};
renderClients=function(){const list=data.clients.filter(c=>`${c.name} ${c.phone||''} ${c.document||''}`.toLowerCase().includes(clientQuery.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name));
 $('#clients').innerHTML=section('Clientes',`${data.clients.length} registrados`,btn('＋ Nuevo','add-client','primary'))+`<input id="clientSearch" class="search" type="search" placeholder="Nombre, teléfono o documento" value="${esc(clientQuery)}" autocomplete="off">`+(list.length?list.map(cardClient).join(''):empty('Sin clientes','Registra un cliente para comenzar.'));
};
cardLoan=function(l){const c=client(l.clientId),b=balance(l),pct=total(l)>0?Math.min(100,paid(l.id)/total(l)*100):0,status=isClavo(l)?'Clavo':dueMarker(l);const pill=status==='Clavo'?'amber':status==='Atrasado'?'red':'green';
 return `<article class="card loan-card"><div class="rowtop"><div style="min-width:0"><div class="cardtitle">${esc(c?.name||'Cliente')} · ${esc(l.title||'Crédito')}</div><div class="sub">${fmtDate(l.startDate)} · ${esc(fmtFrequency(l.frequency))} · ${l.count} cuotas</div></div><div class="card-end"><span class="pill ${pill}">${status}</span><button class="icon-dots" data-action="loan-menu:${l.id}" aria-label="Opciones de crédito">⋮</button></div></div>
 <div class="detailgrid"><div class="detailbox"><small>Capital prestado</small><b>${money(l.principal)}</b></div><div class="detailbox"><small>Total a cobrar</small><b>${money(total(l))}</b></div><div class="detailbox"><small>Cuota estimada</small><b>${money(installment(l))}</b></div><div class="detailbox"><small>Pendiente</small><b>${money(b)}</b></div></div>
 <div class="progress"><i style="width:${pct}%"></i></div><div class="row loan-footer"><span class="sub">${money(paid(l.id))} cobrado</span><div class="stickyactions">${b>.005?btn('Cobrar','pay-loan:'+l.id,'primary small'):''}${btn('Detalle','loan-detail:'+l.id,'secondary small')}</div></div>${isClavo(l)&&l.clavoNote?`<div class="sub">Motivo: ${esc(l.clavoNote)}</div>`:''}</article>`;
};
renderLoans=function(){const group=loanPortfolio;let list=visiblePortfolio(group).filter(l=>`${l.title||''} ${client(l.clientId)?.name||''} ${client(l.clientId)?.phone||''}`.toLowerCase().includes(loanQuery.toLowerCase()));
 if(loanViewFilter==='active')list=list.filter(l=>balance(l)>.005);if(loanViewFilter==='paid')list=list.filter(l=>balance(l)<=.005);if(loanViewFilter==='late')list=list.filter(l=>overdueAmount(l)>.005);
 list.sort((a,b)=>b.startDate.localeCompare(a.startDate));const totalPending=round(visiblePortfolio(group).reduce((s,l)=>s+balance(l),0));
 $('#loans').innerHTML=section('Créditos',`${visiblePortfolio(group).length} ${group==='clavos'?'clavos':'en cartera'}`,btn('＋ Nuevo crédito','add-loan','primary'))+
 segmented('loan',group)+`<div class="compact-summary"><span>Pendiente ${group==='clavos'?'en Clavos':'de la cartera'}</span><strong>${money(totalPending)}</strong></div><input id="loanSearch" class="search" type="search" placeholder="Buscar cliente, teléfono o crédito" value="${esc(loanQuery)}" autocomplete="off">
 <div class="chips">${[['all','Todos'],['active','Activos'],['late','Vencidos'],['paid','Pagados']].map(([v,k])=>`<button data-action="loan-filter:${v}" class="chip ${loanViewFilter===v?'active':''}">${k}</button>`).join('')}</div>`+
 (list.length?list.map(cardLoan).join(''):empty(group==='clavos'?'Sin créditos en Clavos':'No hay créditos en este filtro',group==='clavos'?'Cuando marques un crédito como Clavo desde ⋮ aparecerá aquí.':'Modifica los filtros o registra un crédito.'));
};
function collectionMatches(d,filter){const now=today(),dt=new Date();dt.setDate(dt.getDate()+7);const seven=dateInput(dt);dt.setDate(dt.getDate()+23);const thirty=dateInput(dt);let next=new Date(new Date().getFullYear(),new Date().getMonth()+1,1),end=new Date(new Date().getFullYear(),new Date().getMonth()+2,0);
 return filter==='all'||filter==='due'&&d<=now||filter==='overdue'&&d<now||filter==='today'&&d===now||filter==='7'&&d>=now&&d<=seven||filter==='30'&&d>=now&&d<=thirty||filter==='nextmonth'&&d>=dateInput(next)&&d<=dateInput(end)||filter==='future'&&d>now;
}
renderCollections=function(){const group=collectionPortfolio, filt=collectionDueFilter;
 const rows=data.clients.filter(c=>`${c.name} ${c.phone||''}`.toLowerCase().includes(collectionQuery.toLowerCase())).map(c=>{
 const ls=visiblePortfolio(group).filter(l=>l.clientId===c.id&&balance(l)>.005),sched=ls.flatMap(l=>paymentSchedule(l).filter(x=>collectionMatches(x.date,filt)).map(x=>({...x,l}))).sort((a,b)=>a.date.localeCompare(b.date));return {c,ls,sched,summary:round(sched.reduce((s,x)=>s+x.unpaid,0))};
 }).filter(x=>x.sched.length>0).sort((a,b)=>a.sched[0].date.localeCompare(b.sched[0].date));
 const filters=[['all','Todos'],['due','Por cobrar'],['overdue','Vencidos'],['today','Hoy'],['7','Próx. 7 días'],['30','Próx. 30 días'],['nextmonth','Mes siguiente'],['future','Futuros']];
 $('#collections').innerHTML=section('Cobros','Cuotas predefinidas y abonos rápidos',btn('＋ Cobrar','choose-payment','primary'))+
 segmented('collection',group)+`<div class="compact-summary"><span>Cuotas del filtro</span><strong>${money(rows.reduce((s,r)=>s+r.summary,0))}</strong></div>
 <input id="collectionSearch" type="search" class="search" value="${esc(collectionQuery)}" placeholder="Buscar cliente o teléfono" autocomplete="off"><div class="chips">${filters.map(([v,k])=>`<button data-action="collection-filter:${v}" class="chip ${v===filt?'active':''}">${k}</button>`).join('')}</div>`+
 (rows.length?rows.map(({c,ls,sched,summary})=>{const first=sched[0],dateLabel=first.date<today()?'Vencido':first.date===today()?'Hoy':fmtDate(first.date),quick=`pay-loan:${first.l.id}`;
 return `<article class="card"><div class="rowtop"><div><div class="cardtitle">${esc(c.name)}</div><div class="sub">${esc(c.phone||'Sin teléfono')} · ${ls.length} crédito(s)</div></div><div class="card-end"><span class="pill ${group==='clavos'?'amber':first.date<today()?'red':first.date===today()?'amber':'green'}">${group==='clavos'?'Clavo':dateLabel}</span><button class="icon-dots" data-action="collection-menu:${c.id}" aria-label="Opciones del cliente">⋮</button></div></div>
 <div class="detailgrid"><div class="detailbox"><small>Cuota siguiente</small><b class="green-val">${money(first.unpaid)}</b></div><div class="detailbox"><small>Programado en filtro</small><b>${money(summary)}</b></div></div>
 <div class="sub">Próximo: ${fmtDate(first.date)} · ${esc(first.l.title||'Crédito')}</div><div class="stickyactions">${btn('Cobrar '+money(first.unpaid),quick,'primary')}${btn('Historial','payments-client:'+c.id,'secondary')}</div></article>`}).join(''):empty('Sin cobros para mostrar',group==='clavos'?'Aquí aparecerán los cobros de créditos marcados Clavo.':'Prueba con otro periodo o cliente.'));
};
function collectionMenu(cid){const c=client(cid);if(!c)return;const ls=visiblePortfolio(collectionPortfolio).filter(l=>l.clientId===cid);
 openModal('Opciones de cobro · '+esc(c.name),ls.map(l=>`<div class="card"><div class="row"><div><div class="cardtitle">${esc(l.title||'Crédito')}</div><div class="sub">Pendiente ${money(balance(l))}</div></div><button class="icon-dots" data-action="loan-menu:${l.id}" aria-label="Más opciones">⋮</button></div><div class="stickyactions">${btn('Cobrar','pay-loan:'+l.id,'primary small')}${btn('Detalle','loan-detail:'+l.id,'secondary small')}</div></div>`).join('')||empty('Sin créditos','No hay créditos en esta categoría.'),'Cerrar',null);
}
loanMenu=function(lid){const l=loan(lid);if(!l)return;openModal('Opciones del crédito',`<div class="card"><div class="cardtitle">${esc(l.title||'Crédito')} · ${esc(client(l.clientId)?.name||'Cliente')}</div><div class="sub">Capital ${money(l.principal)} · Pendiente ${money(balance(l))}</div><div class="menu-list">
 ${btn('◷  Ver historial y cuotas','loan-detail:'+lid,'menu-choice')}
 ${btn('✎  Modificar crédito','edit-loan:'+lid,'menu-choice')}
 ${balance(l)>.005?btn('＋  Registrar abono','pay-loan:'+lid,'menu-choice'):''}
 ${btn(l.isClavo?'↩  Devolver a Cartera':'◌  Marcar como Clavo','toggle-clavo:'+lid,'menu-choice')}
 ${btn('⌫  Eliminar crédito y abonos','delete-loan:'+lid,'menu-choice danger-choice')}
 </div></div><div class="note">Marcar como Clavo conserva deuda, abonos y Caja. Eliminar un crédito sí ajusta Caja y borra sus abonos.</div>`,'Cerrar',null)};
function clavoDialog(lid){const l=loan(lid);if(!l)return;const mark=!isClavo(l);
 openModal(mark?'Mover crédito a Clavos':'Devolver crédito a Cartera',`<div class="card"><div class="cardtitle">${esc(client(l.clientId)?.name||'Cliente')}</div><div class="sub">${esc(l.title||'Crédito')} · Pendiente: ${money(balance(l))}</div></div>
 <p class="sub">${mark?'Dejará de aparecer en las listas normales de Créditos y Cobros. Podrás consultarlo y cobrar desde Clavos.':'Volverá a aparecer en la cartera normal conservando todos los datos.'}</p>
 ${mark?field('Motivo (opcional)','reason',l.clavoNote||'','textarea',{full:true,attrs:'maxlength="250"'}):''}
 <div class="note">Este cambio de categoría no modifica el dinero en Caja ni elimina abonos.</div>`,mark?'Confirmar Clavo':'Volver a Cartera',f=>{
  l.isClavo=mark;l.clavoNote=mark?String(f.get('reason')||'').trim():'';l.clavoSince=mark?today():'';
  if(!save())return;closeModal();render();notify(mark?'Crédito separado en Clavos':'Crédito devuelto a Cartera');
 });
}
function clientPicker(selectedId){return `<div class="field full"><label>Seleccionar cliente *</label><input class="search client-pick-search" id="loanClientQuery" type="search" placeholder="Buscar por nombre o teléfono…" autocomplete="off"><input type="hidden" name="clientId" id="pickedClientId" value="${esc(selectedId||'')}">
 <div class="client-picker" id="clientPickerList">${data.clients.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(c=>{
 const ls=data.loans.filter(l=>l.clientId===c.id),cl=ls.filter(l=>l.isClavo).length;
 return `<button type="button" class="client-option ${c.id===selectedId?'selected':''}" data-pick-client="${esc(c.id)}" data-filter="${esc((c.name+' '+c.phone).toLowerCase())}"><span class="brandicon client-avatar small-avatar">${esc(initials(c.name))}</span><span class="client-choice-text"><b>${esc(c.name)}</b><small>${esc(c.phone||'Sin teléfono')} · ${ls.length} créditos ${cl?' · ⚠ '+cl+' Clavos':''}</small></span><span class="choice-mark">✓</span></button>`;
 }).join('')}</div><p id="clientRisk" class="sub"></p></div>`}
function makeDueSchedule(l){let initial=parseDate(l.firstDueDate||l.startDate),date=new Date(initial);let dates=[];
 const weekly=(l.weeklyDays||[]).map(Number),month=(l.monthDays||[]).map(Number).sort((a,b)=>a-b);
 // The chosen first collection date is exact, even when it is on a different weekday.
 if(l.firstDueDate){dates.push(l.firstDueDate);date=parseDate(l.firstDueDate)}
 let attempts=0;
 while(dates.length<Number(l.count)&&attempts++<20000){
  if(l.frequency==='daily'){date.setDate(date.getDate()+1)}
  else if(l.frequency==='weekly'){
   if(weekly.length){do{date.setDate(date.getDate()+1)}while(!weekly.includes(date.getDay())&&attempts++<20000)}
   else{date.setDate(date.getDate()+7)}
  }else if(l.frequency==='fortnightly'){
   if(month.length){do{date.setDate(date.getDate()+1)}while(!month.some(n=>Math.min(n,new Date(date.getFullYear(),date.getMonth()+1,0).getDate())===date.getDate())&&attempts++<20000)}
   else{date.setDate(date.getDate()+15)}
  }else{
   if(month.length){do{date.setDate(date.getDate()+1)}while(!month.some(n=>Math.min(n,new Date(date.getFullYear(),date.getMonth()+1,0).getDate())===date.getDate())&&attempts++<20000)}
   else{let day=initial.getDate(),yy=date.getFullYear(),mo=date.getMonth()+1;date=new Date(yy,mo,Math.min(day,new Date(yy,mo+1,0).getDate()),12)}
  }
  const iso=dateInput(date);if(!dates.includes(iso))dates.push(iso);
 }
 return dates;
}
function makeAmounts(l){const n=l.count,centsTotal=Math.round(round(l.principal*(1+l.interest/100))*100),each=Math.floor(centsTotal/n);return Array.from({length:n},(_,i)=>(i===n-1?centsTotal-each*(n-1):each)/100)}
addLoan=function(existing=null,clientId=null){
 if(isDayClosed()){notify('Caja cerrada: no se pueden otorgar ni modificar créditos durante el bloqueo.');return}
 if(!data.clients.length){notify('Primero registra un cliente');addClient();return}
 const l=existing||{clientId:clientId||'',title:'Crédito',principal:'',interest:'',count:'',startDate:today(),firstDueDate:'',frequency:'daily',weeklyDays:[],monthDays:[],notes:''};
 const weekdays=[['1','Lun'],['2','Mar'],['3','Mié'],['4','Jue'],['5','Vie'],['6','Sáb'],['0','Dom']];
 const weekly=weekdays.map(([val,n])=>`<label><input type="checkbox" name="weeklyDays" value="${val}" ${(l.weeklyDays||[]).includes(+val)?'checked':''}>${n}</label>`).join('');
 const months=Array.from({length:31},(_,i)=>i+1).map(d=>`<label><input type="checkbox" name="monthDays" value="${d}" ${(l.monthDays||[]).includes(d)?'checked':''}>${d}</label>`).join('');
 openModal(existing?'Editar crédito':'Nuevo crédito',`<div class="formgrid">${clientPicker(l.clientId)}
 ${field('Descripción del crédito','title',l.title)}
 ${field('Capital (R$) *','principal',l.principal,'number',{required:true,attrs:'min="0.01" step="0.01" inputmode="decimal"'})}
 ${field('Interés fijo (%) *','interest',l.interest,'number',{required:true,attrs:'min="0" max="1000" step="0.01" inputmode="decimal"'})}
 ${field('Número de cuotas *','count',l.count,'number',{required:true,attrs:'min="1" max="500" step="1"'})}
 ${field('Fecha del crédito *','startDate',l.startDate,'date',{required:true})}
 ${field('Primera fecha de cobro (opcional)','firstDueDate',l.firstDueDate||'','date')}
 ${field('Frecuencia','frequency','','select',{full:true,options:[['daily','Diaria'],['weekly','Semanal'],['fortnightly','Quincenal'],['monthly','Mensual']].map(([v,label])=>`<option value="${v}" ${v===l.frequency?'selected':''}>${label}</option>`).join('')})}
 <div class="field full" id="weeklyPicker"><label>Días de cobro semanal</label><div class="checkrow">${weekly}</div></div>
 <div class="field full" id="monthPicker"><label>Días de cobro del mes · 1 a 31</label><div class="checkrow month-picker">${months}</div></div>
 ${field('Notas','notes',l.notes||'','textarea',{full:true})}
 <div class="field full"><div class="note" id="loanPreview">El total y la cuota se calcularán automáticamente.</div></div></div>`,existing?'Guardar cambios':'Crear crédito',(f)=>{
  const principal=round(Number(f.get('principal'))),interest=Number(f.get('interest')),count=Number(f.get('count'));
  const c=client(f.get('clientId'));
  if(!c){notify('Selecciona un cliente de la lista.');return}
  if(!Number.isFinite(principal)||principal<=0||principal>1e9||!Number.isFinite(interest)||interest<0||interest>1000||!Number.isInteger(count)||count<1||count>500){notify('Revisa capital, interés y número de cuotas.');return}
  const firstDue=f.get('firstDueDate');if(firstDue && firstDue<f.get('startDate')){notify('La primera fecha de cobro no puede ser anterior al crédito.');return}
  if(existing && round(principal*(1+interest/100))<paid(existing.id)-.005){notify('El total no puede ser menor que los abonos recibidos.');return}
  const vals={clientId:c.id,title:String(f.get('title')||'').trim()||'Crédito',principal,interest:round(interest),count,frequency:f.get('frequency'),startDate:f.get('startDate'),firstDueDate:firstDue,weeklyDays:f.getAll('weeklyDays').map(Number),monthDays:f.getAll('monthDays').map(Number),notes:String(f.get('notes')||'').trim()};
  vals.scheduleDates=makeDueSchedule(vals);vals.scheduleAmounts=makeAmounts(vals);
  if(vals.scheduleDates.length!==count){notify('No se pudieron generar las fechas de cuotas. Revisa la frecuencia.');return}
  if(existing){let diff=round(Number(existing.principal)-principal);if(Math.abs(diff)>.005){data.cashBase=round(Number(data.cashBase)+diff);addCorrection(diff,'Ajuste de capital · '+vals.title,existing.id)}Object.assign(existing,vals)}
  else{const newLoan={id:id(),...vals,isClavo:false,createdAt:Date.now()};data.loans.push(newLoan);data.cashBase=round(Number(data.cashBase)-principal);data.movements.push({id:id(),kind:'Egreso',amount:principal,date:today(),concept:'Capital entregado: '+vals.title,createdAt:Date.now(),loanId:newLoan.id,system:true})}
  if(!save())return;closeModal();render();notify(existing?'Crédito modificado y Caja actualizada':'Crédito registrado correctamente');
 });
 const search=$('#loanClientQuery'),choices=$$('#clientPickerList .client-option'),selected=$('#pickedClientId');
 search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();choices.forEach(ch=>{ch.hidden=!ch.dataset.filter.includes(q)})});
 choices.forEach(ch=>ch.addEventListener('click',()=>{selected.value=ch.dataset.pickClient;choices.forEach(it=>it.classList.toggle('selected',it===ch));const cl=data.loans.filter(l=>l.clientId===selected.value&&l.isClavo);$('#clientRisk').textContent=cl.length?`⚠ Atención: este cliente tiene ${cl.length} crédito(s) en Clavos. Consulta el historial antes de prestar.`:''}));
 if(selected.value){choices.find(ch=>ch.dataset.pickClient===selected.value)?.click()}
 const frequency=$('#f-frequency');const refreshDays=()=>{$('#weeklyPicker').hidden=frequency.value!=='weekly';$('#monthPicker').hidden=!['fortnightly','monthly'].includes(frequency.value)};frequency.addEventListener('change',refreshDays);refreshDays();
 const preview=()=>{const p=Number($('#f-principal').value)||0,r=Number($('#f-interest').value)||0,n=Number($('#f-count').value)||0;$('#loanPreview').innerHTML=`Total pactado: <b>${money(p*(1+r/100))}</b><br>Cuota estimada: <b>${money(n?p*(1+r/100)/n:0)}</b><br>Interés fijo sobre capital original.`};['#f-principal','#f-interest','#f-count'].forEach(x=>$(x).addEventListener('input',preview));preview();
};
detailLoan=function(lid){const l=loan(lid);if(!l)return;const c=client(l.clientId),ps=data.payments.filter(p=>p.loanId===lid).sort((a,b)=>b.date.localeCompare(a.date)),all=dueDates(l);
 let paidSoFar=round(paid(lid));const instal=Array.isArray(l.scheduleAmounts)&&l.scheduleAmounts.length===all.length?l.scheduleAmounts:makeAmounts(l);
 let cursor=0;
 const schedule=all.map((d,i)=>{const amount=round(instal[i]||0),applied=round(Math.max(0,Math.min(amount,paidSoFar-cursor)));cursor=round(cursor+amount);return `<div class="row schedule-line"><div><b>Cuota ${i+1}</b><div class="sub">${fmtDate(d)}</div></div><div style="text-align:right"><b>${money(amount)}</b><div class="sub">${applied>=amount-.005?'Pagada':applied>0?'Abonada · '+money(applied):d<today()?'Vencida':'Pendiente'}</div></div></div>`}).join('');
 openModal(`Crédito · ${esc(c?.name||'Cliente')}`,`<div class="rowtop"><div><div class="cardtitle">${esc(l.title||'Crédito')} ${l.isClavo?' · Clavo':''}</div><div class="sub">Fecha del crédito: ${fmtDate(l.startDate)} · ${esc(fmtFrequency(l.frequency))}</div></div>${btn('⋮','loan-menu:'+lid,'ghost small')}</div>
 <div class="detailgrid"><div class="detailbox"><small>Capital</small><b>${money(l.principal)}</b></div><div class="detailbox"><small>Interés fijo</small><b>${l.interest}%</b></div><div class="detailbox"><small>Total a cobrar</small><b>${money(total(l))}</b></div><div class="detailbox"><small>Saldo pendiente</small><b>${money(balance(l))}</b></div></div>
 <div class="card"><div class="row"><span class="sub">Total abonado</span><b>${money(paid(l.id))}</b></div><div class="progress"><i style="width:${Math.min(100,paid(l.id)/Math.max(total(l),.01)*100)}%"></i></div></div>
 ${l.isClavo?`<div class="note">Clavo desde ${fmtDate(l.clavoSince)}${l.clavoNote?' · '+esc(l.clavoNote):''}</div>`:''}${l.notes?`<p class="sub">${esc(l.notes)}</p>`:''}
 ${section('Cuotas','Se actualizan con los abonos registrados')}<div class="card">${schedule}</div>
 ${section('Historial de abonos',`${ps.length} pago(s)`,balance(l)>.005?btn('＋ Cobrar','pay-loan:'+lid,'primary small'):'')}
 ${ps.length?ps.map(p=>`<div class="card"><div class="row"><div><div class="cardtitle">${fmtDate(p.date)}</div><div class="sub">${esc(p.note||'Abono')}</div>${safeReceipt(p.receipt)?`<a class="receiptlink" href="${safeReceipt(p.receipt)}" target="_blank" rel="noopener">Ver comprobante</a>`:''}</div><b class="green-val">${money(p.amount)}</b></div><div class="stickyactions">${btn('Eliminar abono','delete-payment:'+p.id,'danger small')}</div></div>`).join(''):empty('Sin abonos','Aún no hay pagos registrados.')}`,'Cerrar',null);
};
detailClient=function(cid){const c=client(cid);if(!c)return;const ls=data.loans.filter(l=>l.clientId===cid).sort((a,b)=>b.startDate.localeCompare(a.startDate));
 openModal(esc(c.name),`<div class="detailgrid"><div class="detailbox"><small>Teléfono</small><b>${esc(c.phone||'—')}</b></div><div class="detailbox"><small>Documento</small><b>${esc(c.document||'—')}</b></div><div class="detailbox"><small>Dirección</small><b>${esc(c.address||'—')}</b></div><div class="detailbox"><small>Referencia</small><b>${esc(c.reference||c.extraInfo||'—')}</b></div></div>
 ${c.notes?`<div class="card"><div class="sub">Notas</div><div>${esc(c.notes)}</div></div>`:''}
 ${section('Historial de préstamos',`${ls.length} crédito(s) de este cliente`,btn('＋ Prestar','add-loan-client:'+cid,'primary small'))}
 ${ls.length?ls.map(l=>`<div class="card"><div class="row"><div><div class="cardtitle">${esc(l.title||'Crédito')} ${l.isClavo?'<span class="pill amber">Clavo</span>':''}</div><div class="sub">${fmtDate(l.startDate)} · ${esc(fmtFrequency(l.frequency))}</div></div><b>${money(balance(l))}</b></div><div class="detailgrid compact-grid"><div class="detailbox"><small>Prestado</small><b>${money(l.principal)}</b></div><div class="detailbox"><small>Abonado</small><b>${money(paid(l.id))}</b></div></div><div class="stickyactions">${btn('Ver crédito','loan-detail:'+l.id,'secondary small')}${balance(l)>.005?btn('Cobrar','pay-loan:'+l.id,'primary small'):''}</div></div>`).join(''):empty('Sin créditos','Crea un préstamo para este cliente.')}
 ${btn('Editar cliente','edit-client:'+cid,'secondary')}`,'Cerrar',null);
};
const originalCashSummary=cashSummary;
cashSummary=function(){const r=originalCashSummary();r.missing=round(normalLoans().reduce((s,l)=>s+overdueAmount(l),0));return r};
const originalRenderCharts=renderCharts;
renderCharts=function(){originalRenderCharts();const el=$('#charts');const period=el.querySelector('#chartMonth');
 // The historical figures preserve both regular and Clavos loans.
 el.insertAdjacentHTML('afterbegin',`<div class="compact-summary"><span>Reportes históricos · incluyen Clavos</span><b>BRL</b></div>`);
};
renderSettings=function(){const bytes=new Blob([JSON.stringify(data)]).size, size=bytes>1024*1024?(bytes/1024/1024).toFixed(1)+' MB':Math.round(bytes/1024)+' KB';
 $('#settings').innerHTML=section('Copias y seguridad','Gestión local, independiente por iPhone')+
 `<div class="card"><div class="cardtitle">Respaldo y transferencia</div><p class="sub">Exporta un archivo JSON con clientes, créditos, Clavos, abonos, comprobantes adjuntos, documentos de clientes, Caja, cierres y reportes. Guárdalo en Archivos o iCloud Drive.</p><div class="stickyactions">${btn('↥ Exportar copia JSON','export-backup','primary')}${btn('↧ Importar copia','import-backup','secondary')}</div><div class="sub">Datos locales aproximados: ${size}</div></div>
 <div class="card"><div class="cardtitle">Importar desde Android</div><p class="sub">Puedes seleccionar un respaldo <b>JSON</b> de Mi Cartera Android y convertir clientes, préstamos, pagos, Clavos, Caja y cierres. Las imágenes/PDF incluidos únicamente en los respaldos ZIP de Android no se importan con esta opción.</p><div class="note">Antes de importar se mostrará una confirmación, ya que la restauración reemplaza la cartera de este iPhone.</div></div>
 <div class="card"><div class="cardtitle">Información de la aplicación</div><p class="sub">Versión iPhone 3.4.4 · rutas, pagos, documentos y privacidad local.</p>${btn('Cómo instalar en iPhone','install-help','secondary')}</div>
 <div class="card danger-zone"><div class="cardtitle">Zona peligrosa · restablecer a cero</div><p class="sub">Eliminará todos los datos de este iPhone, incluidos Clavos y comprobantes. No elimina los archivos que hayas exportado a Archivos o iCloud Drive.</p>${btn('Restablecer todo','wipe-data','danger')}</div>`;
};
function readAndroidBackup(d){
 const source=d?.data&&Array.isArray(d.data.loans)?d.data:d;
 if(!source||!Array.isArray(source.clients)||!Array.isArray(source.loans)||!Array.isArray(source.cashMovements))throw Error('No es una copia Android compatible');
 const converted=emptyData(), c100=n=>round(Number(n||0)/100);
 const clampNum=n=>Number.isFinite(+n)?Number(n):0;
 const csvNums=s=>String(s||'').split(/[,;\s]+/).filter(Boolean).map(Number).filter(x=>Number.isInteger(x));
 converted.clients=source.clients.map(c=>({id:String(c.id),name:String(c.name||''),phone:String(c.phone||''),document:String(c.document||''),address:String(c.address||''),reference:String(c.extraInfo||''),notes:String(c.notes||''),createdAt:c.createdDate||today()}));
 converted.loans=source.loans.map(l=>{const scheduled=Array.isArray(l.installments)?l.installments:[];const f={'Diaria':'daily','Semanal':'weekly','Quincenal':'fortnightly','Mensual':'monthly'}[l.frequency]||'weekly';
 const amount=c100(l.capital);return {id:String(l.id),clientId:String(l.clientId),title:'Crédito',principal:amount,interest:clampNum(l.rate),count:scheduled.length||1,startDate:l.created||today(),frequency:f,notes:'Importado de Android',weeklyDays:csvNums(l.weeklyDays).map(n=>n===7?0:n),monthDays:csvNums(f==='fortnightly'?l.fortnightlyDays:l.monthlyDays),isClavo:!!l.isClavo,clavoSince:l.clavoSince||'',clavoNote:l.clavoNote||'',scheduleDates:scheduled.map(i=>i.dueDate),scheduleAmounts:scheduled.map(i=>c100(i.amount)),createdAt:clampNum(l.issuedAtMillis)};
 });
 converted.payments=source.loans.flatMap(l=>(l.payments||[]).map(p=>({id:String(p.id),loanId:String(l.id),amount:c100(p.amount),date:p.date||today(),note:String(p.note||''),receipt:'',fileName:'',createdAt:clampNum(p.recordedAtMillis)})));
 const signs={'Ingreso':1,'Egreso':-1,'Aporte a caja base':1,'Desembolso préstamo':-1,'Anulación préstamo':1,'Reversión abonos cerrados':-1,'Abono eliminado del periodo':-1,'Ampliación capital préstamo':-1,'Reducción capital préstamo':1};
 converted.movements=source.cashMovements.map(m=>{const sign=signs[m.type]||0,kind=['Ingreso','Egreso','Aporte a caja base'].includes(m.type)?m.type:'Ajuste';return {id:String(m.id),date:m.date||today(),kind,amount:kind==='Ajuste'?c100(m.amount)*sign:c100(m.amount),concept:String(m.description||m.type),createdAt:clampNum(m.recordedAtMillis),system:kind==='Ajuste'||m.type==='Desembolso préstamo',loanId:''}});
 converted.closes=(source.cashClosures||[]).map(c=>({id:String(c.id),date:c.date||today(),closedAt:clampNum(c.closedAtMillis),cashBase:c100(c.endingBalance),collected:c100(c.collected),count:clampNum(c.collectionCount),missing:c100(c.missing),expenses:c100(c.expenses),income:c100(c.income),newClients:clampNum(c.newClients),notes:'Cierre importado de Android'}));
 const closures=[...(source.cashClosures||[])].sort((a,b)=>Number(b.closedAtMillis||0)-Number(a.closedAtMillis||0));const last=closures[0],cutoff=last?Number(last.closedAtMillis):0;
 const bases=Array.isArray(source.cashBases)?source.cashBases:[];
 const startBase=last?c100(last.endingBalance):c100(bases.length?bases[bases.length-1].amount:0);
 const receipts=converted.payments.filter(p=>{const match=source.loans.find(l=>l.id===p.loanId);return match?.payments?.some(x=>x.id===p.id&&x.receiptUri)}).length;
 converted.cashBase=round(startBase+converted.payments.filter(p=>p.createdAt>cutoff).reduce((s,p)=>s+Number(p.amount),0)+converted.movements.filter(m=>m.createdAt>cutoff).reduce((s,m)=>s+(m.kind==='Egreso'?-m.amount:m.amount),0));
 if(!Number.isFinite(converted.cashBase))throw Error('Caja inválida en copia Android');
 return {converted,receipts};
}
function restoreData(fresh,label){
 if(!backupIsValid(fresh))throw Error('El archivo no supera la validación de datos.');
 const prev=data;data={...emptyData(),...fresh};
 if(save()){closeModal();showTab('dashboard');notify(label||'Respaldo restaurado');return true}
 data=prev;return false;
}
importBackup=function(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=()=>{const file=input.files?.[0];if(!file)return;if(file.size>45*1024*1024){notify('La copia supera 45 MB.');return}
 const reader=new FileReader();reader.onload=()=>{try{const raw=JSON.parse(reader.result);let d=raw,converted=false,receipts=0;
 if(raw?.data?.cashMovements||raw?.cashMovements){const result=readAndroidBackup(raw);d=result.converted;receipts=result.receipts;converted=true}
 if(!backupIsValid(d))throw Error('Datos incompletos o inválidos');
 const warning=converted?`Esta copia viene de Android. Se importarán registros y Caja, pero ${receipts} comprobante(s) con referencias Android NO se podrán abrir en iPhone.`:'Se recuperarán también los comprobantes incrustados en esta copia JSON.';
 if(!confirm(`IMPORTAR RESPALDO DE ${converted?'ANDROID':'IPHONE'}\n\n${warning}\n\nSe REEMPLAZARÁ toda la cartera de este iPhone. Exporta antes una copia de tus datos actuales. ¿Continuar?`))return;
 restoreData(d,converted?'Datos Android importados; revisa Caja y comprobantes.':'Cartera restaurada correctamente');
 }catch(err){notify('No se pudo importar: '+String(err.message||'formato incorrecto').slice(0,120))}}
 reader.onerror=()=>notify('No se pudo leer el archivo de copia');reader.readAsText(file)};input.click();
};
// New commands are delegated through the existing single action handler.
const handleOriginalAction=handleAction;
handleAction=function(action){
 if(action==='app-menu'){openAppMenu();return}
 if(action==='quick-menu'){openQuickMenu();return}
 if(action==='open-loans'){closeModal();showTab('loans');return}
 if(action==='open-settings'){closeModal();showTab('settings');return}
 if(action==='open-collections'){closeModal();showTab('collections');return}
 if(action==='open-cash'){closeModal();showTab('cash');return}
 if(action==='open-charts'){closeModal();showTab('charts');return}
 if(action==='go-dashboard'){closeModal();showTab('dashboard');return}
 if(action==='dashboard-clavos'){loanPortfolio='clavos';closeModal();showTab('loans');return}
 if(action.startsWith('loan-portfolio:')){loanPortfolio=action.split(':')[1];renderLoans();return}
 if(action.startsWith('collection-portfolio:')){collectionPortfolio=action.split(':')[1];renderCollections();return}
 if(action.startsWith('loan-filter:')){loanViewFilter=action.split(':')[1];renderLoans();return}
 if(action.startsWith('collection-filter:')){collectionDueFilter=action.split(':')[1];renderCollections();return}
 if(action.startsWith('collection-menu:')){collectionMenu(action.split(':')[1]);return}
 if(action.startsWith('toggle-clavo:')){clavoDialog(action.split(':')[1]);return}
 return handleOriginalAction(action);
};
// Persistent searches: the header and controls scroll off naturally with the list.
document.addEventListener('input',e=>{
 const id=e.target?.id;
 if(id==='clientSearch'){clientQuery=e.target.value;const at=e.target.selectionStart;renderClients();const node=$('#clientSearch');node.focus();node.setSelectionRange(at,at)}
 if(id==='loanSearch'){loanQuery=e.target.value;const at=e.target.selectionStart;renderLoans();const node=$('#loanSearch');node.focus();node.setSelectionRange(at,at)}
 if(id==='collectionSearch'){collectionQuery=e.target.value;const at=e.target.selectionStart;renderCollections();const node=$('#collectionSearch');node.focus();node.setSelectionRange(at,at)}
});
// Keep v1.1 navigation data attributes and events, replace visible layout only.
(function initParity(){
 const nav=$('.tabbar');nav.innerHTML=[['dashboard','⌂','Inicio'],['clients','♙','Clientes'],['collections','⇄','Cobros'],['cash','▣','Caja'],['charts','▥','Reportes']].map(([name,ico,title])=>`<button class="tab ${currentTab===name?'active':''}" data-tab="${name}" aria-label="${title}"><span>${ico}</span><small>${title}</small></button>`).join('');
 $$('.tab').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
 $('#appMenu').hidden=false;$('#quickFab').hidden=false;
 navFor(currentTab);
 render();
})();
