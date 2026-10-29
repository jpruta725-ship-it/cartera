'use strict';
/* Mi Cartera iPhone 3.4.9 — Agenda diaria, anulación de abonos y renovaciones.
 * No modifica KEY ni ROUTES_KEY: opera sobre la ruta seleccionada.
 * Renovar CREA un préstamo nuevo y nunca cancela silenciosamente el anterior.
 */
(function(){
  const RELEASE = '3.4.9';
  let paymentView = 'pending';
  let frequencyView = 'all';
  const freqLabels = {all:'Todas',daily:'Diarios',weekly:'Semanales',fortnightly:'Quincenales',monthly:'Mensuales'};
  const absCents = n => Math.round((Number(n)||0)*100);
  const localCreationDay = payment => {
    const ms=Number(payment.createdAt);
    return Number.isFinite(ms)&&ms>0 ? dateInput(new Date(ms)) : String(payment.date||'');
  };
  const todaysPayments = lid => data.payments.filter(p=>p.loanId===lid && localCreationDay(p)===today());
  const daysFor = l => paymentSchedule(l).filter(q=>Number(q.unpaid)>.005);
  const quotaCounts = l => {
    const pending=daysFor(l).length;
    return {total:Number(l.count)||0, paid:Math.max(0,(Number(l.count)||0)-pending),pending};
  };
  const pillStatus = l => {
    if(l.isClavo)return {text:'Clavo',color:'amber'};
    if(balance(l)<=.005)return {text:'Liquidado',color:'green'};
    if(dueDates(l).at(-1)<today())return {text:'Crédito vencido',color:'red'};
    if(overdueAmount(l)>.005)return {text:'Cuotas atrasadas',color:'amber'};
    return {text:'Al día',color:'green'};
  };
  const frequencyMarkup = () => {
    const base=visiblePortfolio(collectionPortfolio);
    return `<div class="chips" aria-label="Frecuencia de Cobros">${Object.entries(freqLabels).map(([f,text])=>{
      const count=f==='all'?base.length:base.filter(l=>l.frequency===f).length;
      return `<button type="button" class="chip ${frequencyView===f?'active':''}" data-action="workflow-frequency:${f}" aria-pressed="${frequencyView===f}">${text} · ${count}</button>`;
    }).join('')}</div>`;
  };
  const filterMarkup = () => {
    const filters=[['all','Todos'],['due','Por cobrar'],['overdue','Vencidos'],['today','Hoy'],['7','Próx. 7 días'],['30','Próx. 30 días'],['nextmonth','Mes siguiente'],['future','Futuros']];
    return `<div class="chips workflow-date-filters">${filters.map(([key,text])=>`<button type="button" class="chip ${collectionDueFilter===key?'active':''}" data-action="collection-filter:${key}">${text}</button>`).join('')}</div>`;
  };

  // Los cobros quedan separados por CRÉDITO, incluso si un cliente tiene varios préstamos.
  // La clasificación del día se basa en la fecha de REGISTRO, no en fecha vencida.
  renderCollections = function(){
    const loans=visiblePortfolio(collectionPortfolio).filter(l=>
      (frequencyView==='all'||l.frequency===frequencyView)&&
      `${client(l.clientId)?.name||''} ${client(l.clientId)?.phone||''} ${l.title||''}`.toLowerCase().includes(collectionQuery.toLowerCase()));
    const todayLoans=loans.filter(l=>todaysPayments(l.id).length>0);
    const pendingLoans=loans.filter(l=>balance(l)>.005 && !todaysPayments(l.id).length);
    const rows=pendingLoans.map(l=>{
      const schedule=daysFor(l).filter(q=>collectionMatches(q.date,collectionDueFilter));
      return {l,schedule,amount:round(schedule.reduce((s,q)=>s+Number(q.unpaid),0))};
    }).filter(x=>x.schedule.length).sort((a,b)=>a.schedule[0].date.localeCompare(b.schedule[0].date));
    const todayRows=todayLoans.map(l=>{
      const payments=todaysPayments(l.id).sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0));
      return {l,payments,amount:round(payments.reduce((s,p)=>s+Number(p.amount),0))};
    }).sort((a,b)=>Number(b.payments[0]?.createdAt||0)-Number(a.payments[0]?.createdAt||0));
    const selected=paymentView==='pending'?rows:todayRows;
    const subtotal=round(selected.reduce((s,x)=>s+x.amount,0));
    const segment=`<div class="workflow-payment-tabs" role="group" aria-label="Estado de cobros del día">
      <button type="button" data-action="workflow-tab:pending" class="workflow-payment-tab ${paymentView==='pending'?'selected':''}" aria-pressed="${paymentView==='pending'}">◷ Por pagar <span>${rows.length}</span></button>
      <button type="button" data-action="workflow-tab:today" class="workflow-payment-tab ${paymentView==='today'?'selected':''}" aria-pressed="${paymentView==='today'}">✓ Pagado hoy <span>${todayRows.length}</span></button>
      </div>`;
    $('#collections').innerHTML=section('Cobros','Cada crédito se administra por separado',btn('＋ Registrar abono','choose-payment','primary'))+
      segmented('collection',collectionPortfolio)+segment+frequencyMarkup()+
      `<div class="compact-summary"><span>${paymentView==='today'?'Total registrado hoy':'Cuotas del filtro pendientes'}</span><strong>${money(subtotal)}</strong></div>
       <input id="collectionSearch" type="search" class="search" autocomplete="off" value="${esc(collectionQuery)}" placeholder="Buscar cliente, teléfono o crédito">
       ${paymentView==='pending'?filterMarkup():`<div class="workflow-explainer">Los créditos con al menos un abono <b>registrado hoy</b> aparecen aquí aunque tengan cuotas atrasadas. Puedes corregir un pago equivocado sin borrar el crédito.</div>`}`+
      (selected.length ? (paymentView==='pending'?rows.map(({l,schedule,amount})=>{
        const c=client(l.clientId),first=schedule[0],counts=quotaCounts(l),state=pillStatus(l);
        return `<article class="card loan-card workflow-loan"><div class="rowtop"><div><div class="cardtitle">${esc(c?.name||'Cliente')} · ${esc(l.title||'Crédito')}</div>
          <div class="sub">${esc(fmtFrequency(l.frequency))} · ${counts.paid}/${counts.total} pagadas · ${counts.pending} pendientes</div>
          <div class="sub">Próxima cuota: ${fmtDate(first.date)} · #${first.number}</div></div>
          <div class="card-end"><span class="pill ${state.color}">${state.text}</span><button class="icon-dots" data-action="loan-menu:${esc(l.id)}" aria-label="Opciones del préstamo">⋮</button></div></div>
          <div class="detailgrid"><div class="detailbox"><small>Cuota sugerida</small><b class="green-val">${money(first.unpaid)}</b></div><div class="detailbox"><small>Saldo del crédito</small><b>${money(balance(l))}</b></div>
          <div class="detailbox"><small>En periodo elegido</small><b>${money(amount)}</b></div><div class="detailbox"><small>Total de cuotas</small><b>${counts.total}</b></div></div>
          <div class="stickyactions">${btn('Cobrar '+money(first.unpaid),'pay-loan:'+l.id,'primary')}${btn('Historial','loan-detail:'+l.id,'secondary')}</div></article>`;
      }).join('') : todayRows.map(({l,payments,amount})=>{
        const c=client(l.clientId),counts=quotaCounts(l),state=pillStatus(l);
        return `<article class="card loan-card workflow-loan workflow-paid"><div class="rowtop"><div><div class="cardtitle">${esc(c?.name||'Cliente')} · ${esc(l.title||'Crédito')}</div>
          <div class="sub">${esc(fmtFrequency(l.frequency))} · ${counts.paid}/${counts.total} pagadas · ${counts.pending} pendientes</div></div>
          <span class="pill green">✓ Abonado hoy</span></div>
          <div class="detailgrid"><div class="detailbox"><small>Recibido hoy</small><b class="green-val">${money(amount)}</b></div><div class="detailbox"><small>Saldo restante</small><b>${money(balance(l))}</b></div></div>
          ${payments.map(p=>`<div class="workflow-payment"><div><b>${money(p.amount)}</b><div class="sub">${esc(p.note||'Abono registrado')} · Fecha del abono: ${fmtDate(p.date)}${p.selectedInstallments?` · ${Number(p.selectedInstallments)} cuota(s) seleccionada(s)`:''}</div></div>
          ${btn('Eliminar abono','delete-payment:'+p.id,'danger small')}</div>`).join('')}
          <div class="workflow-explainer">Eliminar un abono revierte ese pago en Caja y recalcula las cuotas pendientes; no elimina las cuotas del contrato.${state.text==='Crédito vencido'?' El crédito aún tiene deuda vencida.':''}</div>
          <div class="stickyactions">${balance(l)>.005?btn('Añadir otro pago','pay-loan:'+l.id,'secondary small'):''}${btn('Historial','loan-detail:'+l.id,'secondary small')}${btn('⋮ Opciones','loan-menu:'+l.id,'ghost small')}</div></article>`;
      }).join('')) : empty(paymentView==='pending'?'Sin créditos por cobrar':'Todavía no hay pagos hoy',paymentView==='pending'?'Los préstamos con abonos registrados hoy se trasladan a «Pagado hoy», incluso cuando siguen atrasados.':'Al registrar un pago en esta ruta, el préstamo aparecerá aquí.'));
  };

  // En Inicio se muestra el desglose de cuotas por cliente y por crédito.
  const previousDashboard=renderDashboard;
  renderDashboard=function(){
    previousDashboard();
    const upcoming=$$('#dashboard .upcoming-credit-card');
    upcoming.forEach(card=>{
      const action=card.querySelector('[data-action^="pay-loan:"]')?.dataset.action;
      const l=action?loan(action.slice('pay-loan:'.length)):null;
      if(!l)return;
      const c=quotaCounts(l),subtitle=card.querySelector('.upcoming-person .sub');
      if(subtitle)subtitle.textContent=`${l.title||'Crédito'} · ${c.total} cuotas · ${c.paid} pagadas · ${c.pending} pendientes`;
    });
    const root=$('#dashboard');if(!root)return;
    const people=data.clients.map(c=>{
      const loans=data.loans.filter(l=>l.clientId===c.id);
      const all=loans.reduce((s,l)=>s+quotaCounts(l).total,0);
      const done=loans.reduce((s,l)=>s+quotaCounts(l).paid,0);
      return {c,loans,all,done,open:all-done};
    }).filter(x=>x.loans.length).sort((a,b)=>a.c.name.localeCompare(b.c.name,'es'));
    if(!people.length)return;
    root.insertAdjacentHTML('beforeend',section('Cuotas por cliente',`${people.length} cliente(s) con créditos en esta ruta`,btn('Ver clientes','open-clients','secondary small'))+
      `<div class="card workflow-customer-summary"></div>`);
    // Build the full list without truncating a credit's HTML fragment.
    const target=root.querySelector('.workflow-customer-summary');
    target.innerHTML=people.slice(0,6).map(({c,loans,all,done,open})=>`<div class="workflow-person"><div class="rowtop"><div><b>${esc(c.name)}</b><div class="sub">${loans.length} crédito(s) · ${all} cuotas</div></div><div class="workflow-counters"><span class="workflow-count-good">${done} pagadas</span><span class="workflow-count-warn">${open} pendientes</span></div></div>
      ${loans.map(l=>{const q=quotaCounts(l);return `<div class="workflow-person-loan"><span>${esc(l.title||'Crédito')}${l.isClavo?' · Clavo':''}</span><b>${q.paid}/${q.total}</b></div>`}).join('')}</div>`).join('')+
      (people.length>6?`<details class="workflow-more"><summary>Ver ${people.length-6} clientes más</summary>${people.slice(6).map(({c,loans,all,done,open})=>`<div class="workflow-person"><div class="rowtop"><div><b>${esc(c.name)}</b><div class="sub">${loans.length} crédito(s) · ${all} cuotas</div></div><div class="workflow-counters"><span class="workflow-count-good">${done} pagadas</span><span class="workflow-count-warn">${open} pendientes</span></div></div>${loans.map(l=>{const q=quotaCounts(l);return `<div class="workflow-person-loan"><span>${esc(l.title||'Crédito')}</span><b>${q.paid}/${q.total}</b></div>`}).join('')}</div>`).join('')}</details>`:'');
  };

  const previousLoanMenu=loanMenu;
  loanMenu=function(lid){
    previousLoanMenu(lid);
    const l=loan(lid),menu=$('#activeForm .menu-list');
    if(!l||!menu)return;
    const button=btn('↻ Renovar crédito','workflow-renew:'+l.id,'menu-choice');
    const last=menu.lastElementChild;
    if(last)last.insertAdjacentHTML('beforebegin',button);else menu.insertAdjacentHTML('beforeend',button);
  };
  const previousLoanDetail=detailLoan;
  detailLoan=function(lid){
    previousLoanDetail(lid);
    const l=loan(lid),form=$('#activeForm');if(!l||!form)return;
    form.insertAdjacentHTML('afterbegin',`<div class="workflow-renew-head"><span>Crédito ${l.renewalOf?'renovado desde otro préstamo':'registrado'}</span>${btn('↻ Renovar crédito','workflow-renew:'+l.id,'secondary small')}</div>`);
    if(l.renewalOf){const source=loan(l.renewalOf);form.insertAdjacentHTML('afterbegin',`<div class="workflow-explainer">Renovación vinculada a ${esc(source?.title||'un crédito anterior')}. Ambos contratos conservan su propio historial y Caja.</div>`)}
  };

  function renewLoan(lid){
    const old=loan(lid);if(!old)return;
    if(isDayClosed()){notify('La Caja está cerrada. Renueva cuando se abra mañana a las 00:00.');return}
    const person=client(old.clientId);if(!person){notify('El cliente original ya no existe.');return}
    if(old.isClavo){notify('Antes de renovar, devuelve este crédito de Clavos a Cartera.');return}
    const previousBalance=balance(old),needsAcknowledgement=previousBalance>.005;
    const defaultTitle='Renovación · '+String(old.title||'Crédito').slice(0,55);
    const freqOptions=[['daily','Diaria'],['weekly','Semanal'],['fortnightly','Quincenal'],['monthly','Mensual']].map(([v,t])=>`<option value="${v}" ${old.frequency===v?'selected':''}>${t}</option>`).join('');
    openModal('Renovar crédito',`<div class="workflow-renew-banner"><strong>${esc(person.name)} · ${esc(old.title||'Crédito')}</strong><span>Saldo anterior: ${money(previousBalance)} · ${old.count} cuotas</span></div>
    ${needsAcknowledgement?`<div class="note"><b>Atención:</b> este préstamo todavía debe ${money(previousBalance)}. La renovación creará <b>otro crédito independiente</b> y descontará de Caja únicamente el nuevo capital que entregues. No liquida, traslada ni perdona el saldo anterior.</div>`:`<div class="workflow-explainer">El crédito anterior está pagado. Conservaremos su historial y crearemos otro préstamo para el mismo cliente.</div>`}
    <div class="formgrid">
      ${field('Descripción del nuevo crédito','title',defaultTitle,'text',{required:true,full:true,attrs:'maxlength="120"'})}
      ${field('Nuevo capital a entregar (R$) *','principal',Number(old.principal).toFixed(2),'number',{required:true,attrs:'min="0.01" max="1000000000" step="0.01" inputmode="decimal"'})}
      ${field('Interés fijo (%) *','interest',Number(old.interest).toFixed(2),'number',{required:true,attrs:'min="0" max="1000" step="0.01" inputmode="decimal"'})}
      ${field('Número de cuotas *','count',old.count,'number',{required:true,attrs:'min="1" max="500" step="1"'})}
      ${field('Fecha del nuevo préstamo','startDate',today(),'date',{required:true})}
      ${field('Primera fecha de cobro (opcional)','firstDueDate','','date')}
      ${field('Frecuencia de pago','frequency','','select',{full:true,options:freqOptions})}
      ${field('Notas','notes',`Renovación del préstamo ${old.title||'Crédito'} (${old.startDate})`,'textarea',{full:true})}
      <div class="field full"><div id="renewPreview" class="workflow-renew-preview" aria-live="polite"></div></div>
    </div>
    ${needsAcknowledgement?`<label class="workflow-ack"><input id="renewAcknowledgement" type="checkbox" required> Confirmo que los ${money(previousBalance)} del crédito anterior seguirán pendientes; no se realizará ningún cobro ni refinanciación automática.</label>`:''}`,
    'Confirmar nuevo crédito',f=>{
      if(isDayClosed()){notify('Caja cerrada, no se realizó la renovación.');return}
      if(!loan(old.id)||!client(old.clientId)){notify('No se encontró el préstamo o el cliente original.');return}
      if(needsAcknowledgement && !$('#renewAcknowledgement')?.checked){notify('Confirma primero que el saldo anterior continuará pendiente.');return}
      const principal=round(Number(f.get('principal'))),interest=round(Number(f.get('interest'))),count=Number(f.get('count'));
      const frequency=String(f.get('frequency'));
      const startDate=String(f.get('startDate'));
      const firstDueDate=String(f.get('firstDueDate')||'');
      if(!Number.isFinite(principal)||principal<=0||principal>1e9||!Number.isFinite(interest)||interest<0||interest>1000||!Number.isInteger(count)||count<1||count>500||!['daily','weekly','fortnightly','monthly'].includes(frequency)){notify('Revisa capital, interés y número de cuotas.');return}
      if(!/^\d{4}-\d{2}-\d{2}$/.test(startDate)||typeof miCarteraStrictDate==='function'&&!miCarteraStrictDate(startDate)||startDate>today()){notify('La fecha del crédito debe ser válida y no futura.');return}
      if(firstDueDate&&(!/^\d{4}-\d{2}-\d{2}$/.test(firstDueDate)||typeof miCarteraStrictDate==='function'&&!miCarteraStrictDate(firstDueDate)||firstDueDate<startDate)){notify('La primera fecha de cobro no es válida.');return}
      const fresh={id:id(),clientId:old.clientId,title:String(f.get('title')||'').trim().slice(0,120)||defaultTitle,
        principal,interest,count,startDate,firstDueDate,frequency,weeklyDays:(old.weeklyDays||[]).slice(),monthDays:(old.monthDays||[]).slice(),
        notes:String(f.get('notes')||'').trim(),isClavo:false,createdAt:Date.now(),renewalOf:old.id};
      // Conserva la elección de días por frecuencia, igual que el contrato de origen.
      fresh.scheduleDates=makeDueSchedule(fresh);
      fresh.scheduleAmounts=makeAmounts(fresh);
      if(fresh.scheduleDates.length!==count||fresh.scheduleAmounts.length!==count){notify('No se pudo calcular correctamente el calendario de cuotas.');return}
      const answer=`¿Crear otro crédito para ${person.name}?\n\nCapital nuevo: ${money(principal)}\nInterés fijo: ${interest}%\nCuotas: ${count}\nCaja disminuirá: ${money(principal)}\nSaldo del crédito anterior: ${money(balance(old))} (sin cambios).\n\nLos dos préstamos quedarán separados.`;
      if(!confirm(answer))return;
      const before=JSON.stringify(data);
      data.loans.push(fresh);
      data.cashBase=round(Number(data.cashBase)-principal);
      data.movements.push({id:id(),kind:'Egreso',amount:principal,date:today(),concept:'Capital entregado en renovación · '+fresh.title,createdAt:Date.now(),loanId:fresh.id,system:true});
      try{if(!save())throw Error('No se pudo guardar');}
      catch(err){try{data=JSON.parse(before)}catch(_){ }notify('La renovación no se guardó. Revisa el almacenamiento y tu respaldo.');return}
      closeModal();showTab('loans');notify(`Crédito renovado. Entrega nueva: ${money(principal)}. El anterior conserva su historial.`);
    });
    const preview=$('#renewPreview');
    const calculate=()=>{
      const p=Number($('#f-principal')?.value)||0,rate=Number($('#f-interest')?.value)||0,count=Number($('#f-count')?.value)||0;
      const pact=p*(1+rate/100);
      preview.innerHTML=`<div><span>Nuevo capital</span><b>${money(p)}</b></div><div><span>Total del crédito nuevo</span><b>${money(pact)}</b></div><div><span>Cuota estimada</span><b>${money(count>0?pact/count:0)}</b></div><div><span>Movimiento en Caja</span><b>−${money(p)}</b></div>`;
    };
    ['principal','interest','count'].forEach(name=>$('#f-'+name)?.addEventListener('input',calculate));calculate();
  }
  const previousActions=handleAction;
  handleAction=function(action){
    if(action==='workflow-tab:pending'||action==='workflow-tab:today'){paymentView=action.endsWith('pending')?'pending':'today';renderCollections();return}
    if(action.startsWith('workflow-frequency:')){const v=action.slice('workflow-frequency:'.length);if(v in freqLabels){frequencyView=v;renderCollections()}return}
    if(action.startsWith('workflow-renew:')){renewLoan(action.slice('workflow-renew:'.length));return}
    if(action==='open-clients'){closeModal();showTab('clients');return}
    return previousActions(action);
  };
  // Vuelve a renderizar si el día cambia mientras la PWA está abierta.
  let dayStamp=today();
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible')return;
    if(dayStamp!==today()){
      dayStamp=today();paymentView='pending';
      if(currentTab==='dashboard'||currentTab==='collections')render();
    }
  });
  render();
})();
