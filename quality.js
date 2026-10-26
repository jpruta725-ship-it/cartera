'use strict';
/* Mi Cartera iPhone 3.3.1 — Diaria como frecuencia predefinida.
 * Capa de interfaz y precisión; no cambia KEY, datos almacenados ni formato de respaldo.
 */
(function () {
  const RELEASE='3.3.2';
  // Protección adicional: impedir sobrescribir datos locales no legibles y evitar
  // que un fallo de espacio en Safari parezca un pago/cambio guardado con éxito.
  let durableRaw=null,storageUnreadable=false;
  try{
    durableRaw=localStorage.getItem(KEY);
    if(durableRaw)JSON.parse(durableRaw);
  }catch(err){storageUnreadable=true}
  const previousSave=save;
  save=function(){
    if(storageUnreadable){
      notify('Alerta: los datos locales no se pudieron leer. No se guardó nada.');
      throw new Error('Datos locales no legibles: se bloqueó la escritura para evitar sobrescribirlos');
    }
    if(previousSave()){
      try{durableRaw=localStorage.getItem(KEY)}catch(err){}
      return true;
    }
    try{data=durableRaw?{...emptyData(),...JSON.parse(durableRaw)}:emptyData()}catch(err){}
    throw new Error('No se guardó la operación; se restauraron los últimos datos persistidos');
  };
  if(storageUnreadable){
    const previousDashboard=renderDashboard;
    renderDashboard=function(){
      previousDashboard();
      $('#dashboard')?.insertAdjacentHTML('afterbegin',
        '<div class="card" style="border:2px solid var(--red)"><b>⚠ Datos locales no legibles</b><p class="sub">No registres pagos ni restablezcas Mi Cartera. Se han bloqueado las escrituras para evitar sobrescribir datos que podrían recuperarse.</p></div>');
    };
  }

  const frequencyNames={all:'Todas',daily:'Diarios',weekly:'Semanales',fortnightly:'Quincenales',monthly:'Mensuales'};
  let frequencyLoans='all', frequencyCollections='all';

  // Las operaciones monetarias se suman en centavos para evitar saldos 0,00999999.
  const centsOf=n=>Math.round((Number(n)||0)*100);
  total=function(l){return Math.round(centsOf(l.principal)*(1+(Number(l.interest)||0)/100))/100};
  paid=function(lid){return data.payments.filter(p=>p.loanId===lid).reduce((sum,p)=>sum+centsOf(p.amount),0)/100};
  balance=function(l){return Math.max(0,Math.round((total(l)*100-paid(l.id)*100)))/100};
  installment=function(l){return Number(l.count)>0?total(l)/Number(l.count):total(l)};

  function remainingSchedule(l){return paymentSchedule(l)}
  function dueAtEnd(l){const dates=dueDates(l);return dates.length?dates[dates.length-1]:l.startDate}
  function statusFor(l){
    if(balance(l)<=0.005)return {text:'Pagado',tone:'green'};
    const last=dueAtEnd(l);
    if(last&&last<today())return {text:'Crédito vencido',tone:'red'};
    if(overdueAmount(l)>0.005)return {text:'Cuotas atrasadas',tone:'amber'};
    return {text:'Al día',tone:'green'};
  }
  function installmentsSummary(l){
    const count=Math.max(0,Number(l.count)||0),remaining=remainingSchedule(l).length;
    return {paid:Math.max(0,count-remaining),remaining};
  }
  function frequencyButtons(prefix,group){
    const loans=visiblePortfolio(group);
    return `<div class="chips frequency-filter" aria-label="Frecuencia de los créditos">${Object.entries(frequencyNames).map(([key,label])=>{
      const n=key==='all'?loans.length:loans.filter(l=>l.frequency===key).length;
      const chosen=(prefix==='loan'?frequencyLoans:frequencyCollections)===key;
      return `<button type="button" data-action="${prefix}-frequency:${key}" class="chip ${chosen?'active':''}" aria-pressed="${chosen}">${label} · ${n}</button>`;
    }).join('')}</div>`;
  }
  cardLoan=function(l){
    const c=client(l.clientId),b=balance(l),progress=total(l)?Math.min(100,paid(l.id)/total(l)*100):0;
    const state=l.isClavo?{text:'Clavo',tone:'amber'}:statusFor(l),counts=installmentsSummary(l);
    return `<article class="card loan-card">
      <div class="rowtop"><div style="min-width:0"><div class="cardtitle">${esc(c?.name||'Cliente')} · ${esc(l.title||'Crédito')}</div>
      <div class="sub">${esc(fmtFrequency(l.frequency))} · ${counts.paid} pagadas / ${counts.remaining} pendientes</div>
      <div class="sub">Inicio ${fmtDate(l.startDate)} · Última cuota ${fmtDate(dueAtEnd(l))}</div></div>
      <div class="card-end"><span class="pill ${state.tone}">${state.text}</span><button type="button" class="icon-dots" data-action="loan-menu:${esc(l.id)}" aria-label="Opciones del crédito">⋮</button></div></div>
      <div class="detailgrid"><div class="detailbox"><small>Capital</small><b>${money(l.principal)}</b></div><div class="detailbox"><small>Total acordado</small><b>${money(total(l))}</b></div><div class="detailbox"><small>Cobrado</small><b>${money(paid(l.id))}</b></div><div class="detailbox"><small>Pendiente</small><b>${money(b)}</b></div></div>
      <div class="progress"><i style="width:${progress}%"></i></div>
      <div class="row loan-footer"><span class="sub">${counts.paid} de ${l.count} cuotas pagadas</span><div class="stickyactions">${b>0.005?btn('Cobrar','pay-loan:'+l.id,'primary small'):''}${btn('Detalle','loan-detail:'+l.id,'secondary small')}</div></div>
      ${l.isClavo&&l.clavoNote?`<div class="sub">Motivo: ${esc(l.clavoNote)}</div>`:''}
    </article>`;
  };
  renderLoans=function(){
    const group=loanPortfolio,base=visiblePortfolio(group),selected=base.filter(l=>frequencyLoans==='all'||l.frequency===frequencyLoans);
    let list=selected.filter(l=>`${l.title||''} ${client(l.clientId)?.name||''} ${client(l.clientId)?.phone||''}`.toLowerCase().includes(loanQuery.toLowerCase()));
    if(loanViewFilter==='active')list=list.filter(l=>balance(l)>0.005);
    if(loanViewFilter==='paid')list=list.filter(l=>balance(l)<=0.005);
    if(loanViewFilter==='late')list=list.filter(l=>overdueAmount(l)>0.005);
    if(loanViewFilter==='expired')list=list.filter(l=>balance(l)>0.005&&dueAtEnd(l)<today());
    list.sort((a,b)=>b.startDate.localeCompare(a.startDate));
    const totalPending=round(selected.reduce((s,l)=>s+balance(l),0));
    $('#loans').innerHTML=section('Créditos',`${base.length} ${group==='clavos'?'Clavos':'en cartera'}`,btn('＋ Nuevo crédito','add-loan','primary'))+
     segmented('loan',group)+frequencyButtons('loan',group)+
     `<div class="compact-summary"><span>Pendiente en esta categoría</span><strong>${money(totalPending)}</strong></div>
      <input id="loanSearch" type="search" class="search" autocomplete="off" placeholder="Buscar cliente, teléfono o crédito" value="${esc(loanQuery)}">
      <div class="chips">${[['all','Todos'],['active','Con saldo'],['late','Cuotas atrasadas'],['expired','Crédito vencido'],['paid','Pagados']].map(([key,label])=>`<button type="button" data-action="loan-filter:${key}" class="chip ${loanViewFilter===key?'active':''}">${label}</button>`).join('')}</div>`+
      (list.length?list.map(cardLoan).join(''):empty('No hay créditos con estos filtros','Prueba otra categoría o búsqueda.'));
  };

  // La misma persona con 2 préstamos debe aparecer 2 veces: nunca mezclar abonos ni cuotas.
  renderCollections=function(){
    const group=collectionPortfolio,filter=collectionDueFilter;
    const loans=visiblePortfolio(group).filter(l=>balance(l)>0.005&&
      (frequencyCollections==='all'||l.frequency===frequencyCollections)&&
      `${client(l.clientId)?.name||''} ${client(l.clientId)?.phone||''} ${l.title||''}`.toLowerCase().includes(collectionQuery.toLowerCase()));
    const rows=loans.map(l=>{
      const schedule=remainingSchedule(l).filter(s=>collectionMatches(s.date,filter)).sort((a,b)=>a.date.localeCompare(b.date));
      return {l,client:client(l.clientId),schedule,amount:round(schedule.reduce((s,i)=>s+i.unpaid,0))};
    }).filter(x=>x.schedule.length>0).sort((a,b)=>a.schedule[0].date.localeCompare(b.schedule[0].date));
    const filters=[['all','Todos'],['due','Por cobrar'],['overdue','Vencidos'],['today','Hoy'],['7','Próx. 7 días'],['30','Próx. 30 días'],['nextmonth','Mes siguiente'],['future','Futuros']];
    $('#collections').innerHTML=section('Cobros','Cada crédito tiene su propia tarjeta, cobro e historial',btn('＋ Cobrar','choose-payment','primary'))+
      segmented('collection',group)+frequencyButtons('collection',group)+
      `<div class="compact-summary"><span>Cuotas del filtro</span><strong>${money(rows.reduce((s,x)=>s+x.amount,0))}</strong></div>
      <input id="collectionSearch" type="search" class="search" autocomplete="off" value="${esc(collectionQuery)}" placeholder="Buscar por cliente, teléfono o crédito">
      <div class="chips">${filters.map(([key,label])=>`<button type="button" class="chip ${filter===key?'active':''}" data-action="collection-filter:${key}">${label}</button>`).join('')}</div>`+
      (rows.length?rows.map(({l,client:c,schedule,amount})=>{
        const first=schedule[0],counts=installmentsSummary(l);
        const state=group==='clavos'?{text:'Clavo',tone:'amber'}:statusFor(l);
        return `<article class="card loan-card"><div class="rowtop"><div style="min-width:0"><div class="cardtitle">${esc(c?.name||'Cliente')} · ${esc(l.title||'Crédito')}</div>
          <div class="sub">${esc(fmtFrequency(l.frequency))} · ${counts.paid} pagadas / ${counts.remaining} pendientes</div>
          <div class="sub">Próxima cuota: ${fmtDate(first.date)} · Cuota ${first.number}</div></div>
          <div class="card-end"><span class="pill ${state.tone}">${state.text}</span><button class="icon-dots" data-action="loan-menu:${esc(l.id)}" aria-label="Opciones del crédito">⋮</button></div></div>
          <div class="detailgrid"><div class="detailbox"><small>Cuota sugerida</small><b class="green-val">${money(first.unpaid)}</b></div><div class="detailbox"><small>Saldo del crédito</small><b>${money(balance(l))}</b></div>
          <div class="detailbox"><small>Programado en filtro</small><b>${money(amount)}</b></div><div class="detailbox"><small>Vencimiento final</small><b>${fmtDate(dueAtEnd(l))}</b></div></div>
          <div class="stickyactions">${btn('Cobrar '+money(first.unpaid),'pay-loan:'+l.id,'primary')}${btn('Historial','loan-detail:'+l.id,'secondary')}</div></article>`;
      }).join(''):empty('No hay cuotas con estos filtros','Prueba otra fecha, frecuencia o cliente.'));
  };

  // Resumen de cartera dentro de Caja, solo informativo: no cambia efectivo ni movimientos.
  const earlierCash=renderCash;
  renderCash=function(){
    earlierCash();
    const root=$('#cash'),anchor=root?.querySelector('.metrics');
    if(!anchor)return;
    const normal=data.loans.filter(l=>!l.isClavo&&balance(l)>0.005);
    const bad=data.loans.filter(l=>l.isClavo&&balance(l)>0.005);
    const normalPending=round(normal.reduce((s,l)=>s+balance(l),0));
    const badPending=round(bad.reduce((s,l)=>s+balance(l),0));
    anchor.insertAdjacentHTML('afterend',`<div class="card portfolio-summary"><div class="cardtitle">Cartera normal y Clavos</div>
      <p class="sub">Pendiente por cobrar por categoría. Estos importes NO son efectivo disponible en Caja.</p>
      <div class="detailgrid"><div class="detailbox"><small>Cartera normal · ${normal.length} crédito(s)</small><b class="green-val">${money(normalPending)}</b></div>
      <div class="detailbox"><small>Clavos · ${bad.length} crédito(s)</small><b style="color:var(--amber)">${money(badPending)}</b></div></div>
      <div class="row"><span class="sub">Total de créditos pendientes</span><strong>${money(normalPending+badPending)}</strong></div></div>`);
  };

  const earlierAction=handleAction;
  handleAction=function(action){
    if(action==='check-release'){
      (async()=>{
        try {
          const response=await fetch('./index.html?version_check='+Date.now(),{cache:'no-store'});
          if(!response.ok)throw new Error('No hay conexión con la publicación');
          const html=await response.text();
          const match=html.match(/<title>Mi Cartera · iPhone ([0-9.]+)<\/title>/);
          if(!match){notify('No se pudo identificar la versión publicada.');return}
          if(match[1]===RELEASE){notify('GitHub ya publica Mi Cartera '+RELEASE+'.');return}
          if(confirm('Versión instalada: '+RELEASE+'; publicación: '+match[1]+'. ¿Recargar la aplicación para aplicar cambios?')){
            const registration=await navigator.serviceWorker?.getRegistration?.();
            await registration?.update?.();
            window.location.reload();
          }
        }catch(e){notify('No se pudo consultar GitHub. Comprueba tu conexión.')}
      })();return;
    }
    if(action.startsWith('loan-frequency:')){
      const value=action.slice('loan-frequency:'.length);if(value in frequencyNames){frequencyLoans=value;renderLoans();}return;
    }
    if(action.startsWith('collection-frequency:')){
      const value=action.slice('collection-frequency:'.length);if(value in frequencyNames){frequencyCollections=value;renderCollections();}return;
    }
    return earlierAction(action);
  };

  // La vista puede quedar abierta toda la noche sin haber cerrado Caja:
  // actualizar vencimientos, filtros y agenda incluso si no existe un cierre.
  function scheduleDayRefresh(){
    const now=new Date(),next=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,1);
    window.setTimeout(()=>{if(!document.hidden)render();scheduleDayRefresh();},Math.max(1000,next.getTime()-now.getTime()));
  }
  scheduleDayRefresh();

  // Muestra la versión visible y recuerda que el respaldo debe guardarse fuera del iPhone.
  const beforeSettings=renderSettings;
  renderSettings=function(){
    beforeSettings();
    const root=$('#settings');
    if(root){
      root.querySelectorAll('.sub').forEach(el=>{el.textContent=el.textContent.replace(/Versión iPhone (?:2\.8|3\.0|3\.1|3\.2)/g,'Versión iPhone '+RELEASE)});
      root.insertAdjacentHTML('beforeend',`<div class="card"><div class="cardtitle">Versión ${RELEASE} · ubicación en Google Maps</div><p class="sub">Ahora puedes guardar el enlace de Google Maps de cada cliente y abrir su ubicación desde la ficha. Se conservan los cobros separados, categorías y reportes. Exporta respaldos periódicos fuera de Safari.</p>${btn('Comprobar versión publicada','check-release','secondary')}</div>`);
    }
  };
  render();
})();
