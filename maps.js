'use strict';
/* Mi Cartera iPhone 3.3.2 — Ubicaciones por Google Maps.
   Los enlaces se guardan dentro del registro del cliente. No hay API key,
   geocodificación externa, seguimiento continuo ni sincronización entre iPhone.
*/
(function(){
 const MAPS_LINK_LIMIT=2048;
 function mapsUrl(input){
   const raw=String(input||'').trim();
   if(!raw||raw.length>MAPS_LINK_LIMIT)return '';
   let parsed;
   try{parsed=new URL(raw)}catch{return ''}
   if(parsed.protocol!=='https:'||parsed.username||parsed.password)return '';
   const host=parsed.hostname.toLowerCase();
   const path=parsed.pathname.toLowerCase();
   // Enlaces de Compartir de Google Maps y enlaces web normales de Maps.
   const short=(host==='maps.app.goo.gl'||host==='goo.gl')&&(host!=='goo.gl'||path.startsWith('/maps/'));
   const googleHost=(host==='google.com'||host==='www.google.com'||host==='google.com.br'||host==='www.google.com.br'||host==='maps.google.com'||host==='maps.google.com.br');
   const standard=googleHost && (path.startsWith('/maps')||host.startsWith('maps.'));
   return short||standard?parsed.href:'';
 }
 function mapsSearchURL(address){
   const text=String(address||'').trim().slice(0,350);
   return text?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(text):'https://www.google.com/maps';
 }
 function mapsClientFieldMarkup(c){
   return `<div class="field full maps-client-field">
      <label for="clientMapUrl">Ubicación en Google Maps (opcional)</label>
      <input type="url" id="clientMapUrl" name="mapUrl" inputmode="url" autocomplete="off" placeholder="https://maps.app.goo.gl/…" maxlength="2048" value="${esc(c?.mapUrl||'')}">
      <small>Abre Google Maps, selecciona el lugar y elige <b>Compartir → Copiar enlace</b>. Luego pégalo aquí para guardar el punto exacto.</small>
      <div class="maps-actions">
        <button type="button" class="btn secondary small" data-maps-action="search">⌕ Buscar dirección</button>
        <button type="button" class="btn secondary small" data-maps-action="current">◎ Mi ubicación actual</button>
        <button type="button" class="btn secondary small" data-maps-action="preview">↗ Ver punto</button>
      </div>
      <small class="maps-result" id="clientMapResult" role="status">${c?.mapUrl?'Ubicación guardada. Puedes abrirla para comprobarla.':'El enlace es opcional. No se guarda ni comparte ninguna ubicación sin tu acción.'}</small>
      <small>La búsqueda en Google Maps necesita internet. El enlace guardado se conservará localmente y en tu respaldo.</small>
    </div>`;
 }
 function mapsOpen(url){
   // Únicamente URL HTTPS de Google Maps o una búsqueda construida aquí.
   const safe=mapsUrl(url);
   if(!safe){notify('El enlace de Google Maps no es válido.');return}
   const a=document.createElement('a');a.href=safe;a.target='_blank';a.rel='noopener noreferrer';a.style.display='none';document.body.appendChild(a);a.click();a.remove();
 }
 function mapsClientDetailsMarkup(c){
   const link=mapsUrl(c.mapUrl);
   if(!link && !String(c.address||'').trim())return '';
   const target=link||mapsSearchURL(c.address);
   return `<div class="card client-map-card"><div class="row"><div><div class="cardtitle">⌖ Ubicación del cliente</div>
     <div class="sub">${link?'Punto guardado en Google Maps':'Búsqueda usando la dirección escrita'}</div>
     ${c.address?`<div class="sub maps-address">${esc(c.address)}</div>`:''}</div>
     <a class="btn secondary small" target="_blank" rel="noopener noreferrer" href="${esc(target)}">↗ Abrir en Maps</a></div>
     </div>`;
 }
 function setStatus(message){const target=document.querySelector('#clientMapResult');if(target)target.textContent=message}
 document.addEventListener('click',e=>{
   const button=e.target.closest('[data-maps-action]');if(!button)return;
   const form=button.closest('form');
   if(!form)return;
   const location=form.querySelector('#clientMapUrl');
   const address=form.querySelector('[name="address"]');
   const action=button.dataset.mapsAction;
   if(action==='search'){
     const query=String(address?.value||'').trim();
     const url=mapsSearchURL(query);
     mapsOpen(url);
     setStatus(query?'Selecciona el lugar en Google Maps, pulsa Compartir → Copiar enlace y pégalo aquí.':'Busca el lugar en Google Maps, comparte su enlace y pégalo aquí.');
     return;
   }
   if(action==='preview'){
     const link=mapsUrl(location?.value);
     if(!link){setStatus('Primero pega un enlace válido de Google Maps.');return}
     mapsOpen(link);setStatus('Ubicación abierta en Google Maps.');return;
   }
   if(action==='current'){
     if(!navigator.geolocation){setStatus('Este navegador no permite obtener tu ubicación. Puedes pegar un enlace de Maps.');return}
     button.disabled=true;setStatus('Solicitando permiso de ubicación…');
     navigator.geolocation.getCurrentPosition(position=>{
       const lat=position.coords.latitude,lon=position.coords.longitude;
       if(location)location.value='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(lat.toFixed(6)+','+lon.toFixed(6));
       setStatus('Ubicación actual añadida. Guarda el cliente para conservarla. Comprueba que estés en el lugar correcto.');
       button.disabled=false;
     },error=>{
       setStatus(error.code===1?'Permiso de ubicación denegado. Puedes compartir un enlace de Maps.':'No se pudo obtener tu ubicación. Prueba a pegar un enlace de Maps.');
       button.disabled=false;
     },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
   }
 });
 document.addEventListener('input',e=>{if(e.target?.id==='clientMapUrl'){
   const value=e.target.value.trim();
   setStatus(!value?'Sin enlace de Maps. Puedes guardarlo después.':mapsUrl(value)?'Enlace válido. Pulsa «Ver punto» para comprobarlo.':'Comprueba el enlace: debe comenzar por https:// y pertenecer a Google Maps.');
 }});
 const oldDetailClient=detailClient;
 detailClient=function(cid){
   oldDetailClient(cid);
   const c=client(cid),form=document.querySelector('#activeForm');
   if(!c||!form)return;
   const markup=mapsClientDetailsMarkup(c);
   if(!markup)return;
   const box=document.createElement('div');box.innerHTML=markup;
   form.insertBefore(box.firstElementChild,form.firstChild);
 };
 const oldCardClient=cardClient;
 cardClient=function(c){
   const original=oldCardClient(c);
   const link=mapsUrl(c.mapUrl);
   if(!link)return original;
   return original.replace('</article>',`<div class="client-map-row"><a class="client-map-link" target="_blank" rel="noopener noreferrer" href="${esc(link)}">⌖ Ver ubicación en Google Maps ↗</a></div></article>`);
 };
 const oldClientMenu=clientMenu;
 clientMenu=function(cid){
   oldClientMenu(cid);
   const c=client(cid),form=document.querySelector('#activeForm'),link=c&&mapsUrl(c.mapUrl);
   if(form&&link){const row=document.createElement('div');row.className='maps-menu-link';row.innerHTML=`<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${esc(link)}">⌖ Abrir ubicación en Google Maps</a>`;form.appendChild(row)}
 };
 // Disponible para el formulario de clientes sin tocar la capa de respaldos.
 window.micarteraMaps={validate:mapsUrl,clientField:mapsClientFieldMarkup};
})();
