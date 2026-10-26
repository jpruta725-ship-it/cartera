'use strict';
/* Mi Cartera iPhone 3.2 — Auditoría y rendimiento (equivalente a las mejoras Android 2.18).
 * No modifica el formato ni la clave de almacenamiento: micartera.pwa.data.v1.
 * El diagnóstico no reescribe ni sanea datos: informa de posibles errores.
 */
(function(){
 const RELEASE='3.3.1';
 const FINANCIAL_BACKUP_MAX=12*1024*1024;
 const MAX_RECORDS=25000;
 const MAX_AMOUNT=1e12;
 const validId = v=>typeof v==='string' && /^[\w.:-]{1,100}$/.test(v);
 const numeric = v=>typeof v==='number' && Number.isFinite(v) && Math.abs(v)<MAX_AMOUNT;
 const timestamp = v=>typeof v==='number' && Number.isFinite(v) && v>=0 && v<1e15;
 const monetary = v=>numeric(v) && Math.abs(v*100-Math.round(v*100))<0.011;
 function realDay(s){
  if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
  const [y,m,d]=s.split('-').map(Number);
  if(y<1900||y>2200||m<1||m>12||d<1||d>31)return false;
  const dt=new Date(y,m-1,d,12);
  return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d;
 }
 function integrityReport(source,strict=false){
  const issues=[];
  const report=(severity,where,message)=>{if(issues.length<120)issues.push({severity,where,message})};
  if(!source||typeof source!=='object'||Array.isArray(source)){
   report('error','Datos','El contenido no es una cartera reconocible.');
   return {issues,counts:{clients:0,loans:0,payments:0,movements:0,closes:0},ready:false};
  }
  const tables=['clients','loans','payments','movements','closes'];
  for(const key of tables){
   if(!Array.isArray(source[key]))report('error',key,'Falta la lista de registros.');
   else if(source[key].length>MAX_RECORDS)report('error',key,'Excede el límite de 25.000 registros de esta categoría.');
  }
  const collections={};
  for(const key of tables){
   const rows=Array.isArray(source[key])?source[key]:[];
   collections[key]=rows;
   const seen=new Set();
   rows.slice(0,MAX_RECORDS+1).forEach((r,i)=>{
    if(!r||typeof r!=='object'||Array.isArray(r)||!validId(r.id)){
     report('error',key,`Registro ${i+1}: identificador ausente o inválido.`);return;
    }
    if(seen.has(r.id))report('error',key,`Identificador repetido: ${r.id.slice(0,25)}.`);
    seen.add(r.id);
   });
  }
  if(!monetary(source.cashBase))report('error','Caja','El saldo de Caja no es un importe válido.');
  const clientIds=new Set(collections.clients.map(x=>x?.id));
  const loanIds=new Set(collections.loans.map(x=>x?.id));
  const loanById=new Map(collections.loans.filter(Boolean).map(l=>[l.id,l]));
  const paymentsByLoan=new Map();
  const names=new Map();
  for(const c of collections.clients){
   if(!c||typeof c!=='object')continue;
   if(typeof c.name!=='string'||!c.name.trim()||c.name.length>500)report('error','Cliente','Hay un cliente sin nombre válido.');
   const display=String(c.name||'').trim().toLocaleLowerCase('es');
   if(display){names.set(display,(names.get(display)||0)+1)}
  }
  const duplicates=[...names.entries()].filter(([,count])=>count>1);
  if(duplicates.length)report('warning','Clientes',`${duplicates.length} nombre(s) repetido(s); revisa posibles duplicados.`);
  for(const l of collections.loans){
   if(!l||typeof l!=='object')continue;
   const where='Crédito '+String(l.title||l.id||'').slice(0,42);
   if(!clientIds.has(l.clientId))report('error',where,'El cliente relacionado no existe.');
   if(!monetary(l.principal)||l.principal<=0||l.principal>1e9)report('error',where,'Capital inválido.');
   if(!numeric(l.interest)||l.interest<0||l.interest>1000)report('error',where,'Interés fuera del rango permitido.');
   if(!Number.isInteger(l.count)||l.count<1||l.count>500)report('error',where,'Cantidad de cuotas inválida.');
   if(!['daily','weekly','fortnightly','monthly'].includes(l.frequency))report('error',where,'Frecuencia desconocida.');
   if(!realDay(l.startDate))report('error',where,'Fecha de creación imposible o inválida.');
   if(l.firstDueDate && !realDay(l.firstDueDate))report('error',where,'La primera fecha de cobro es inválida.');
   const validDays=(arr,low,high)=>Array.isArray(arr)&&arr.length<=31&&arr.every(x=>Number.isInteger(x)&&x>=low&&x<=high);
   if(l.weeklyDays!==undefined&&!validDays(l.weeklyDays,0,7))report('error',where,'Días semanales inválidos.');
   if(l.monthDays!==undefined&&!validDays(l.monthDays,1,31))report('error',where,'Días mensuales inválidos.');
   if(l.scheduleDates!==undefined){
    if(!Array.isArray(l.scheduleDates)||l.scheduleDates.length!==l.count){report('warning',where,'El número de fechas programadas no coincide con las cuotas.');}
    else{
     if(!l.scheduleDates.every(realDay))report('error',where,'El calendario tiene fechas inválidas.');
     else if(l.scheduleDates.some((dt,i)=>i>0&&dt<=l.scheduleDates[i-1]))report('warning',where,'Las fechas programadas no están en orden.');
    }
   }
   if(l.scheduleAmounts!==undefined){
    if(!Array.isArray(l.scheduleAmounts)||l.scheduleAmounts.length!==l.count||!l.scheduleAmounts.every(x=>monetary(x)&&x>=0)){
     report('error',where,'La lista de importes de cuotas es inválida.');
    }else if(numeric(l.principal)&&numeric(l.interest)){
     const expected=Math.round(l.principal*(1+l.interest/100)*100);
     const scheduled=Math.round(l.scheduleAmounts.reduce((sum,n)=>sum+n,0)*100);
     if(Math.abs(expected-scheduled)>5)report('warning',where,'La suma de las cuotas no coincide exactamente con el total del crédito.');
    }
   }
  }
  for(const p of collections.payments){
   if(!p||typeof p!=='object')continue;
   if(!loanIds.has(p.loanId))report('error','Abonos','Existe un abono asociado a un crédito inexistente.');
   if(!monetary(p.amount)||p.amount<=0)report('error','Abonos','Existe un abono con importe inválido.');
   if(!realDay(p.date))report('error','Abonos','Existe un abono con fecha imposible.');
   if(p.receipt && typeof p.receipt==='string' && !safeReceipt(p.receipt))report('error','Abonos','Hay un comprobante con contenido o tipo no admitido.');
   if(p.createdAt!==undefined&&!timestamp(p.createdAt))report('warning','Abonos','Un abono tiene una fecha interna de registro inválida.');
   if(numeric(p.amount))paymentsByLoan.set(p.loanId,(paymentsByLoan.get(p.loanId)||0)+p.amount);
  }
  for(const [lid,sum] of paymentsByLoan){
   const l=loanById.get(lid);
   if(l && numeric(l.principal)&&numeric(l.interest)){
    const expected=Math.round(l.principal*(1+l.interest/100)*100);
    if(Math.round(sum*100)>expected+2)report('error','Abonos',`Los abonos superan el total del crédito ${String(l.title||lid).slice(0,30)}.`);
   }
  }
  for(const m of collections.movements){
   if(!m||typeof m!=='object')continue;
   if(!['Ingreso','Egreso','Aporte a caja base','Ajuste'].includes(m.kind))report('error','Caja','Tipo de movimiento no reconocido.');
   if(!monetary(m.amount)||(m.kind!=='Ajuste'&&m.amount<0))report('error','Caja','Importe inválido en un movimiento.');
   if(!realDay(m.date))report('error','Caja','Un movimiento tiene fecha imposible.');
  }
  const closeDays=new Set();
  for(const c of collections.closes){
   if(!c||typeof c!=='object')continue;
   if(!realDay(c.date))report('error','Cierres','Existe un cierre con fecha imposible.');
   if(closeDays.has(c.date))report('warning','Cierres',`Hay más de un cierre guardado para ${String(c.date)}.`);
   closeDays.add(c.date);
   if(c.closedAt!==undefined && !timestamp(c.closedAt))report('error','Cierres','Hora interna del cierre inválida.');
   for(const f of ['cashBase','collected','expenses','income','missing']){
    if(c[f]!==undefined&&!monetary(c[f]))report('error','Cierres',`Importe inválido en ${f}.`);
   }
  }
  if(strict){
   // Limit only metadata/financial records: embedded receipts and customer documents
   // have separate limits, otherwise legitimate iPhone backups could be rejected.
   try{
    const financial={version:source.version,clients:source.clients,loans:source.loans,payments:source.payments.map(p=>({...p,receipt:undefined})),movements:source.movements,closes:source.closes,cashBase:source.cashBase};
    const bytes=new Blob([JSON.stringify(financial)]).size;
    if(bytes>FINANCIAL_BACKUP_MAX)report('error','Respaldo','Los registros financieros superan 12 MB.');
   }catch(err){report('error','Respaldo','No fue posible comprobar el tamaño del respaldo.');}
  }
  const counts=Object.fromEntries(tables.map(k=>[k,collections[k].length]));
  const errors=issues.filter(x=>x.severity==='error').length;
  return {issues,counts,errors,warnings:issues.filter(x=>x.severity==='warning').length,ready:errors===0};
 }
 window.miCarteraIntegrityReport=integrityReport;
 window.miCarteraStrictDate=realDay;

 // Preserve the existing format and Android JSON conversion before adding checks.
 const oldValidator=backupIsValid;
 backupIsValid=function(candidate){
  if(!oldValidator(candidate))return false;
  return integrityReport(candidate,true).ready;
 };

 // Cache only deterministic schedules. The fingerprints detect in-place edits.
 // Always return a copy so callers cannot accidentally modify the cached schedule.
 const scheduleCache=new WeakMap();
 const previousDueDates=dueDates;
 dueDates=function(l){
  if(!l||typeof l!=='object')return previousDueDates(l);
  const fingerprint=JSON.stringify([l.startDate,l.firstDueDate,l.count,l.frequency,l.weeklyDays,l.monthDays,l.scheduleDates]);
  const prior=scheduleCache.get(l);
  if(prior&&prior.key===fingerprint)return prior.value.slice();
  const result=previousDueDates(l);
  if(Array.isArray(result))scheduleCache.set(l,{key:fingerprint,value:result.slice()});
  return result;
 };
 const amountsCache=new WeakMap();
 const previousMakeAmounts=makeAmounts;
 makeAmounts=function(l){
  if(!l||typeof l!=='object')return previousMakeAmounts(l);
  const key=`${l.principal}|${l.interest}|${l.count}`;
  const old=amountsCache.get(l);
  if(old&&old.key===key)return old.value.slice();
  const result=previousMakeAmounts(l);
  if(Array.isArray(result))amountsCache.set(l,{key,value:result.slice()});
  return result;
 };

 function statusMarkup(r){
  if(!r.ready)return '<span class="integrity-tag danger">Revisión necesaria</span>';
  if(r.warnings)return '<span class="integrity-tag amber">Con advertencias</span>';
  return '<span class="integrity-tag success">Sin inconsistencias detectadas</span>';
 }
 const previousSettings=renderSettings;
 renderSettings=function(){
  previousSettings();
  const root=$('#settings');if(!root)return;
  const r=integrityReport(data);
  const card=document.createElement('div');card.className='card integrity-panel';
  card.innerHTML=`<div class="row"><div><div class="cardtitle">◈ Diagnóstico de datos</div><div class="sub">Comprobación local, de solo lectura · Mi Cartera iPhone ${RELEASE}</div></div>${statusMarkup(r)}</div>
    <div class="integrity-grid">
     <div><strong>${r.counts.clients}</strong><small>Clientes</small></div>
     <div><strong>${r.counts.loans}</strong><small>Créditos</small></div>
     <div><strong>${r.counts.payments}</strong><small>Abonos</small></div>
     <div><strong>${r.counts.closes}</strong><small>Cierres</small></div>
    </div>
    <p class="sub">${r.errors?`${r.errors} posible(s) error(es) y ${r.warnings} advertencia(s).`:r.warnings?`${r.warnings} advertencia(s). Revisa antes de restaurar una copia.`:'Los datos financieros básicos pasaron las comprobaciones de integridad.'} Los documentos se verifican al exportar o importar respaldos.</p>
    ${btn('Ver diagnóstico completo','open-integrity','secondary')}
    <p class="sub" style="margin-top:10px">El diagnóstico nunca modifica clientes, créditos ni saldos automáticamente.</p>`;
  const danger=root.querySelector('.danger-zone');
  if(danger)root.insertBefore(card,danger);else root.appendChild(card);
  root.querySelectorAll('.sub').forEach(el=>{
   if(/Versión iPhone (2\.8|3\.0|3\.1)/.test(el.textContent||''))el.textContent=(el.textContent||'').replace(/Versión iPhone (2\.8|3\.0|3\.1)/,'Versión iPhone '+RELEASE);
  });
 };
 function showIntegrity(){
  const r=integrityReport(data);
  const problems=r.issues.map(item=>`<div class="integrity-issue ${item.severity}"><b>${item.severity==='error'?'Revisar':'Atención'} · ${esc(item.where)}</b><p>${esc(item.message)}</p></div>`).join('');
  openModal('Diagnóstico de datos',`<div class="integrity-result">${statusMarkup(r)}<div class="sub">${r.counts.clients} clientes · ${r.counts.loans} créditos · ${r.counts.payments} abonos · ${r.counts.movements} movimientos · ${r.counts.closes} cierres</div></div>
   ${problems||'<div class="note">No se detectaron inconsistencias financieras entre los registros verificados.</div>'}
   <div class="note">Esta revisión no cambia tus datos ni garantiza que estén libres de todos los errores. Guarda siempre un respaldo fuera del iPhone antes de actualizar.</div>
   <div class="stickyactions">${btn('Exportar copia completa','export-backup','primary')}</div>`,'Cerrar',null);
 }
 const previousActions=handleAction;
 handleAction=function(action){if(action==='open-integrity'){showIntegrity();return;}return previousActions(action)};
})();
