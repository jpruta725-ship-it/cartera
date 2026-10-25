/* Mi Cartera iPhone 2.9: agenda plegable, informes visuales y caja contable.
   Compatible con la clave local de versiones anteriores; no realiza migraciones destructivas. */
'use strict';
(function () {
  const price = n => money(round(Number(n) || 0));
  const sum = (arr, fn) => round(arr.reduce((s, v) => s + Number(fn(v) || 0), 0));
  const isDisbursement = m => m.kind === 'Egreso' && Boolean(m.loanId) && /capital entregado|desembolso/i.test(m.concept || '');
  const operationalExpense = m => m.kind === 'Egreso' && !isDisbursement(m);
  const operationalIncome = m => m.kind === 'Ingreso' || m.kind === 'Aporte a caja base';
  const adjustAmount = m => m.kind === 'Ajuste' ? Number(m.amount) || 0 : 0;
  const reopenTime = () => cashReopensAt();
  const timeline = value => cashReopenLabel(value);
  const chartMetric = (label, value, icon, klass='') => `<div class="report-metric ${klass}"><span class="report-metric-icon">${icon}</span><span class="report-metric-value">${value}</span><span class="report-metric-label">${label}</span></div>`;
  const chartSection = (eyebrow, title, subtitle='') => `<div class="report-section"><span>${eyebrow}</span><h3>${title}</h3>${subtitle?`<p>${subtitle}</p>`:''}</div>`;
  const currencyCompact = n => {
    const number = Number(n)||0;
    return Math.abs(number)>=100000 ? `R$ ${(number/1000).toLocaleString('pt-BR',{maximumFractionDigits:0})} mil` : price(number);
  };
  const reportRow = (title,value,color='') => `<div class="report-stat-row"><span>${title}</span><strong class="${color}">${price(value)}</strong></div>`;
  const escapedDate = x => esc(fmtDate(x));

  // Resumen de Caja: el principal entregado NO es gasto operativo.
  // Las anulaciones y correcciones tampoco son ingresos/egresos comerciales.
  const previousCashSummary = cashSummary;
  cashSummary = function () {
    const s = previousCashSummary();
    const cutoff = latestCloseTime();
    const inPeriod = m => Number(m.createdAt||0) >= cutoff || (cutoff===0 && !m.createdAt);
    const movement = data.movements.filter(inPeriod);
    s.expenses = sum(movement.filter(operationalExpense), m=>m.amount);
    s.income = sum(movement.filter(operationalIncome), m=>m.amount);
    s.loanCapital = sum(movement.filter(isDisbursement), m=>m.amount);
    s.adjustments = sum(movement.filter(m=>m.kind==='Ajuste'), adjustAmount);
    s.annulled = sum(movement.filter(m=>m.kind==='Ajuste' && /anulaci[oó]n|capital devuelto/i.test(m.concept||'')),m=>m.amount);
    return s;
  };

  // Mantiene auditoría de desembolsos históricos sin que aparezcan como gastos.
  const previousDeleteLoan = removeLoanAndPayments;
  removeLoanAndPayments = function (lid) {
    const related = data.movements.filter(m=>m.loanId===lid && isDisbursement(m));
    previousDeleteLoan(lid);
    related.forEach(m=>{m.cancelledLoan=true; m.concept=(m.concept||'Capital entregado').replace(/ · anulado$/, '')+' · anulado';});
  };

  const previousRenderCash = renderCash;
  renderCash = function () {
    previousRenderCash();
    const root=$('#cash'), s=cashSummary();
    const metrics=root.querySelector('.metrics');
    if(metrics){
      metrics.insertAdjacentHTML('afterend',`<div class="card cash-clarity">
        <div class="cash-clarity-heading">Separación contable</div>
        <div class="report-stat-row"><span>Capital entregado en préstamos</span><strong>${price(s.loanCapital)}</strong></div>
        <div class="report-stat-row"><span>Ajustes y anulaciones netos</span><strong class="${s.adjustments>=0?'green-val':'red-val'}">${s.adjustments<0?'−':'+'}${price(Math.abs(s.adjustments))}</strong></div>
        <div class="report-stat-row"><span>Egresos operativos (sin préstamos)</span><strong>${price(s.expenses)}</strong></div>
        <p class="sub">Un crédito anulado devuelve el capital a Caja y elimina sus abonos. Los desembolsos y sus anulaciones se registran por separado; no cuentan como gastos o ingresos operativos.</p>
      </div>`);
    }
    for(const card of root.querySelectorAll('.card')){
      const heading=card.querySelector('.cardtitle');
      const sub=card.querySelector('.sub');
      if(!heading||!sub)continue;
      if(/^Capital entregado:/i.test(heading.textContent||'')){
        sub.textContent=sub.textContent.replace(/^Egreso\b/,'Desembolso de crédito');
        if(/ · anulado$/.test(heading.textContent||''))card.classList.add('movement-cancelled');
      } else if(/^(Anulaci[oó]n|Reversi[oó]n|Ajuste de capital|Edici[oó]n de capital)/i.test(heading.textContent||'')){
        sub.textContent=sub.textContent.replace(/^Ajuste\b/,'Ajuste contable');
      }
    }
    const when=reopenTime();
    if(when){
      const notice=[...root.querySelectorAll('.card')].find(el=>(el.textContent||'').includes('Caja cerrada por hoy'));
      if(notice){
        const p=notice.querySelector('p');
        if(p)p.textContent=`Caja cerrada. Apertura automática: ${timeline(when)} (hora local de este iPhone).`;
        notice.insertAdjacentHTML('beforeend',`<div class="cash-reopen"><span>FECHA Y HORA DE APERTURA</span><strong>${timeline(when)}</strong></div>`);
      }
    }
  };

  // Inicio: una tarjeta por CRÉDITO; las cuotas sólo se ven al desplegar.
  const previousDashboard = renderDashboard;
  renderDashboard = function () {
    previousDashboard();
    const root=$('#dashboard');
    const when=reopenTime();
    if(when){
      const hero=root.querySelector('.hero-cash');
      if(hero)hero.insertAdjacentHTML('beforeend',`<div class="cash-reopen cash-reopen-hero"><span>REAPERTURA DE CAJA</span><strong>${timeline(when)}</strong></div>`);
    }
    const heading=[...root.querySelectorAll('.sectionhead')].find(el=>el.querySelector('h2')?.textContent.trim()==='Próximos cobros');
    if(!heading)return;
    let next=heading.nextElementSibling;
    while(next){const following=next.nextElementSibling;next.remove();next=following;}
    const upcoming=normalLoans().filter(l=>balance(l)>.005).map(l=>{
      const slots=paymentSchedule(l).sort((a,b)=>a.date.localeCompare(b.date));
      return {l,slots,next:slots[0]?.date||'9999-12-31',amount:sum(slots,x=>x.unpaid)};
    }).filter(x=>x.slots.length).sort((a,b)=>a.next.localeCompare(b.next));
    heading.querySelector('p').textContent=`${upcoming.length} crédito(s) con cuotas pendientes · toca «Ver cuotas» para desplegarlas`;
    if(!upcoming.length){heading.insertAdjacentHTML('afterend',empty('Sin cobros próximos','No hay cuotas pendientes en la cartera normal.'));return;}
    heading.insertAdjacentHTML('afterend',`<div class="upcoming-list">${upcoming.map(({l,slots,next,amount})=>{
      const person=esc(client(l.clientId)?.name||'Cliente');
      const status=next<today()?'Vencido':next===today()?'Hoy':fmtDate(next);
      return `<article class="card upcoming-credit-card"><div class="rowtop"><div class="upcoming-person"><div class="cardtitle">${person}</div><div class="sub">${esc(l.title||'Crédito')} · ${slots.length} cuota(s) pendientes</div></div><span class="pill ${next<today()?'red':next===today()?'amber':'green'}">${esc(status)}</span></div>
      <div class="upcoming-values"><div><small>Próxima cuota</small><b>${price(slots[0].unpaid)}</b></div><div><small>Total pendiente</small><b>${price(balance(l))}</b></div></div>
      <details class="upcoming-details"><summary>Ver cuotas (${slots.length})<span class="chevron" aria-hidden="true">⌄</span></summary><div class="installment-list">${slots.map(x=>`<div class="upcoming-installment"><span><b>Cuota ${x.number}</b><small>${escapedDate(x.date)}</small></span><strong>${price(x.unpaid)}</strong></div>`).join('')}</div></details>
      <div class="stickyactions">${btn('Cobrar '+price(slots[0].unpaid),'pay-loan:'+l.id,'primary small')}${btn('Ver crédito','loan-detail:'+l.id,'secondary small')}</div></article>`;
    }).join('')}</div>`);
  };

  const monthStamp = d => dateInput(new Date(d.getFullYear(),d.getMonth(),1)).slice(0,7);
  const monthName = date => new Intl.DateTimeFormat('es',{month:'short'}).format(date).replace('.','');
  const visualBars = (arr, textField='name', valueField='value') => {
    const max=Math.max(1,...arr.map(d=>Number(d[valueField])||0));
    return arr.map(d=>`<div class="horizontal-bar-row ${d[textField]==='Egresos'?'expense-bar':''}"><div class="horizontal-bar-label">${esc(d[textField])}</div><div class="horizontal-bar-track"><i style="width:${(Math.max(0,d[valueField])/max*100).toFixed(2)}%"></i></div><div class="horizontal-bar-value">${currencyCompact(d[valueField])}</div></div>`).join('');
  };
  const pieCss = (a,b,col1='#34d399',col2='#38bdf8') => {
    const total=a+b;
    const pct=total?Math.max(0,Math.min(100,a/total*100)):0;
    return total?`conic-gradient(${col1} 0 ${pct.toFixed(2)}%,${col2} ${pct.toFixed(2)}% 100%)`:'conic-gradient(#32455e 0 100%)';
  };
  const trendLine = (daily,days) => {
    const width=680,height=188,padX=22,padY=17;
    const peak=Math.max(1,...daily);
    const points=daily.map((v,i)=>[padX+i*(width-2*padX)/Math.max(1,days-1),height-padY-(Number(v)/peak)*(height-2*padY)]);
    const poly=points.map(p=>p.map(x=>x.toFixed(1)).join(',')).join(' ');
    const fill=`${padX},${height-padY} ${poly} ${width-padX},${height-padY}`;
    const nums=[0,.5,1].map(r=>{const y=height-padY-r*(height-2*padY);return `<line x1="${padX}" y1="${y}" x2="${width-padX}" y2="${y}" stroke="#34445d" stroke-dasharray="4 7" stroke-width="1"/>`}).join('');
    return `<div class="daily-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Gráfico de cobros diarios del mes" preserveAspectRatio="none">${nums}<polygon points="${fill}" fill="#34d399" fill-opacity=".09"/><polyline points="${poly}" stroke="#34d399" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />${points.filter((_,i)=>daily[i]>0).map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.6" fill="#a7f3d0"/>`).join('')}</svg><div class="axis-dates"><span>1</span><span>${Math.ceil(days/4)}</span><span>${Math.ceil(days/2)}</span><span>${Math.ceil(days*3/4)}</span><span>${days}</span></div></div>`;
  };

  // Reporte visual único y comprobable, sin bibliotecas ni conexiones externas.
  renderCharts = function () {
    const now=new Date();
    let month=$('#chartMonth')?.value||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))month=monthStamp(now);
    const [year,mm]=month.split('-').map(Number);
    const daysInMonth=new Date(year,mm,0).getDate(),begin=`${month}-01`,finish=`${month}-${String(daysInMonth).padStart(2,'0')}`;
    const inside=d=>typeof d==='string'&&d>=begin&&d<=finish;
    const ls=data.loans.filter(l=>inside(l.startDate));
    const ps=data.payments.filter(p=>inside(p.date));
    const ms=data.movements.filter(m=>inside(m.date));
    const principal=sum(ls,l=>l.principal),forecast=sum(ls,l=>Number(l.principal)*Number(l.interest)/100);
    const collected=sum(ps,p=>p.amount);
    const receivedCapital=sum(ps,p=>{const l=loan(p.loanId);return l?Number(p.amount)*Number(l.principal)/Math.max(.01,total(l)):0});
    const receivedInterest=round(collected-receivedCapital);
    const ingresos=sum(ms.filter(operationalIncome),m=>m.amount),egresos=sum(ms.filter(operationalExpense),m=>m.amount);
    const disbursed=sum(ms.filter(isDisbursement),m=>m.amount),adjusts=sum(ms.filter(m=>m.kind==='Ajuste'),m=>m.amount);
    const active=normalLoans().filter(l=>balance(l)>.005),cl=clavos().filter(l=>balance(l)>.005);
    const activeBalance=sum(active,l=>balance(l)),clavoBalance=sum(cl,l=>balance(l)),pastDue=sum(active,l=>overdueAmount(l));
    const daily=Array.from({length:daysInMonth},(_,idx)=>sum(ps.filter(p=>Number(p.date.slice(-2))===idx+1),p=>p.amount));
    const dailyNonzero=daily.filter(n=>n>.005).length;
    const series=Array.from({length:6},(_,i)=>{const d=new Date(year,mm-1-(5-i),1);const k=monthStamp(d);return {name:monthName(d),month:k,loans:sum(data.loans.filter(l=>l.startDate?.startsWith(k)),l=>l.principal),payments:sum(data.payments.filter(p=>p.date?.startsWith(k)),p=>p.amount)}});
    const maxSix=Math.max(1,...series.flatMap(x=>[x.loans,x.payments]));
    const historical=series.map(x=>`<div class="comparison-month"><div class="comparison-pair"><span class="comparison-col" title="Prestado: ${price(x.loans)}"><i style="height:${x.loans?Math.max(4,x.loans/maxSix*100):2}%"></i></span><span class="comparison-col payments" title="Cobrado: ${price(x.payments)}"><i style="height:${x.payments?Math.max(4,x.payments/maxSix*100):2}%"></i></span></div><span>${esc(x.name)}</span></div>`).join('');
    $('#charts').innerHTML=`${section('Reportes','Resumen financiero con valores realmente registrados')}
    <div class="card report-month-card"><label for="chartMonth" class="fieldlabel">Mes del reporte</label><input id="chartMonth" type="month" value="${month}" class="search"><p class="sub">Los cobros se cuentan por fecha de pago; los créditos por fecha de préstamo. La cartera pendiente corresponde al saldo actual.</p></div>
    ${chartSection('01 · RECAUDACIÓN','Dinero realmente cobrado','Intereses percibidos y capital recuperado se estiman proporcionalmente según cada crédito.')}
    <div class="report-metrics">${chartMetric('Cobrado durante el mes',price(collected),'✓','highlight')}${chartMetric('Capital recuperado',price(receivedCapital),'↗')}${chartMetric('Interés cobrado estimado',price(receivedInterest),'✦')}${chartMetric('Número de abonos',String(ps.length),'#')}</div>
    <div class="card report-card"><div class="report-chart-head"><div><div class="cardtitle">Cobros por día</div><p class="sub">${dailyNonzero} día(s) con movimientos · mayor cobro ${price(Math.max(...daily,0))}</p></div><div class="report-pill">${price(collected)}</div></div>${trendLine(daily,daysInMonth)}</div>
    <div class="card report-card"><div class="cardtitle">Composición de lo cobrado</div><div class="sub">Desglose estimado del dinero efectivamente recibido</div><div class="donut-layout"><div class="report-donut" style="background:${pieCss(receivedCapital,receivedInterest)}"><div class="donut-hole"><small>Total</small><b>${currencyCompact(collected)}</b></div></div><div class="donut-legend"><div><span class="legend-dot green-dot"></span><span>Capital</span><b>${price(receivedCapital)}</b></div><div><span class="legend-dot blue-dot"></span><span>Intereses</span><b>${price(receivedInterest)}</b></div></div></div></div>
    ${chartSection('02 · CRÉDITOS','Préstamos y ganancias proyectadas','La ganancia prevista NO es dinero cobrado todavía.')}
    <div class="report-metrics">${chartMetric('Capital prestado este mes',price(principal),'▤')}${chartMetric('Interés previsto',price(forecast),'◇')}${chartMetric('Créditos iniciados',String(ls.length),'♙')}${chartMetric('Saldo pendiente activo',price(activeBalance),'◷')}</div>
    <div class="card report-card"><div class="cardtitle">Evolución · últimos seis meses</div><div class="sub">Capital prestado frente a cobros realmente recibidos</div><div class="comparison-legend"><span><i></i>Capital prestado</span><span><i></i>Cobros</span></div><div class="comparison-chart">${historical}</div><div class="sub">Mes seleccionado y cinco anteriores · gráfico a escala relativa</div></div>
    ${chartSection('03 · SALDOS','Estado actual de la cartera','Los Clavos permanecen separados de la cartera habitual.')}
    <div class="card report-card"><div class="donut-layout"><div class="report-donut" style="background:${pieCss(activeBalance,clavoBalance,'#34d399','#fbbf24')}"><div class="donut-hole"><small>Total pendiente</small><b>${currencyCompact(activeBalance+clavoBalance)}</b></div></div><div class="donut-legend"><div><span class="legend-dot green-dot"></span><span>Cartera normal</span><b>${price(activeBalance)}</b></div><div><span class="legend-dot amber-dot"></span><span>Clavos</span><b>${price(clavoBalance)}</b></div><div><span class="legend-dot pink-dot"></span><span>Vencido (normal)</span><b>${price(pastDue)}</b></div><div><span class="sub">${active.length} activos · ${cl.length} Clavos</span></div></div></div></div>
    ${chartSection('04 · MOVIMIENTOS','Caja y operaciones del mes','Capital entregado y anulaciones NO se suman a egresos operativos.')}
    <div class="card report-card">${reportRow('Ingresos y aportes',ingresos,'green-val')}${reportRow('Egresos operativos',egresos)}${reportRow('Desembolsos de créditos (separados)',disbursed)}${reportRow('Ajustes netos / anulaciones',adjusts,adjusts>=0?'green-val':'red-val')}<div class="divider"></div><div class="cardtitle">Ingresos y egresos operativos</div>${visualBars([{name:'Ingresos',value:ingresos},{name:'Egresos',value:egresos}])}<p class="sub">Al borrar un crédito también desaparecen sus abonos; la Caja se corrige, pero la anulación no se contabiliza como gasto ni como venta.</p></div>
    <div class="card report-card note-card"><div class="cardtitle">Cómo leer este reporte</div><p class="sub">Los valores de capital e interés recibidos son estimaciones proporcionales. Los créditos eliminados dejan de figurar como cartera activa, pero los movimientos de desembolso y anulación se conservan en el historial de Caja. Los cierres anteriores no se recalculan. Para comparar periodos, elige otro mes arriba.</p></div>`;
    $('#chartMonth')?.addEventListener('change',renderCharts);
  };

  // Refresca automáticamente al llegar a la medianoche local, sin salir de la app.
  let reopeningTimer;
  const scheduleReopening = () => {
    clearTimeout(reopeningTimer);
    const when=cashReopensAt();
    if(!when)return;
    const delay=Math.max(25,when.getTime()-Date.now()+75);
    reopeningTimer=setTimeout(()=>{
      render();
      if(!isDayClosed())notify('Caja abierta: ya puedes registrar cobros y movimientos.');
    },Math.min(delay,2147483647));
  };
  const beforeReopeningRender=render;
  render=function(){beforeReopeningRender();scheduleReopening();};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});
  window.addEventListener('pageshow',()=>render());
  window.addEventListener('focus',()=>render());

  // Asegura que la pantalla y el botón de historial utilicen las nuevas funciones.
  const priorSettings = renderSettings;
  renderSettings=function(){priorSettings();const labels=$$('#settings .card .sub');const element=[...labels].find(x=>(x.textContent||'').includes('Versión iPhone 2.8'));
    if(element)element.textContent=element.textContent.replace('Versión iPhone 2.8','Versión iPhone 3.1');
  };
  render();
})();
