'use strict';
/* Mi Cartera iPhone 3.4.2 — Copias de seguridad en Google Drive.
 * La PWA nunca guarda contraseñas, refresh tokens ni access tokens permanentes.
 * Subida directa solo con OAuth explícito y Google Drive API habilitada.
 * Fallback disponible: Compartir en Drive (hoja nativa de iOS) o descargar JSON.
 */
(function () {
  const CONFIG_KEY='micartera.drive.config.v1';
  const SCOPE='https://www.googleapis.com/auth/drive.file';
  const FOLDER_NAME='Mi Cartera - Respaldos';
  const MAX_FILE=125*1024*1024;
  const CLIENT_RE=/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
  let config={clientId:'',mode:'download',lastUpload:null};
  try {
    const saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');
    if(CLIENT_RE.test(String(saved.clientId||'')))config.clientId=saved.clientId;
    if(saved.mode==='drive'&&config.clientId)config.mode='drive';
    if(saved.lastUpload&&typeof saved.lastUpload.name==='string'&&typeof saved.lastUpload.at==='string')config.lastUpload=saved.lastUpload;
  } catch(_) { /* sin configuración previa */ }
  let accessToken='',expiryAt=0,folderId='',busy=false,sharePrepared=null,gisPromise=null;
  let sharePreparedName='';
  const connected=()=>Boolean(accessToken && Date.now()<expiryAt-60_000);
  function persist(){
    try {localStorage.setItem(CONFIG_KEY,JSON.stringify(config));return true}
    catch(_){notify('No se pudo guardar la configuración de Drive.');return false}
  }
  function readinessText(){
    if(!config.clientId)return 'Sin configurar. Puedes compartir manualmente usando la app Google Drive.';
    if(connected())return 'Conectado para esta sesión. Cada respaldo nuevo puede subirse directamente.';
    if(config.mode==='drive')return 'Integración configurada. Autoriza Google otra vez para subir respaldos.';
    return 'Integración configurada, pendiente de autorización.';
  }
  function lastText(){
    const recent=config.lastUpload;
    if(!recent)return 'Todavía no hay subidas directas confirmadas por Google Drive.';
    const date=new Date(recent.at);
    const at=Number.isNaN(+date)?recent.at:date.toLocaleString('es',{dateStyle:'short',timeStyle:'short'});
    return 'Última subida confirmada: '+esc(at)+' · '+esc(recent.name);
  }
  function settingsCard(){
    const oauthOn=!!config.clientId;
    return `<div class="card drive-settings-card">
      <div class="cardtitle">☁ Copias de seguridad en Google Drive</div>
      <p class="sub">Guarda <b>todas las rutas y sus documentos</b> fuera del iPhone. La subida directa necesita internet, autorización de Google y configurar un cliente OAuth web.</p>
      <div class="drive-state"><span class="pill ${connected()?'green':'amber'}">${connected()?'Autorizado':oauthOn?'Sin sesión activa':'Sin configurar'}</span><span class="sub">${readinessText()}</span></div>
      ${oauthOn?`<div class="drive-actions">${btn(connected()?'↻ Renovar autorización':'Conectar Google Drive','drive-authorize','secondary')}${btn('⚙ Configurar acceso','drive-config','ghost')}</div>`:
                 `<div class="drive-actions">${btn('⚙ Configurar subida directa','drive-config','secondary')}</div>`}
      <div class="drive-actions">
        ${btn('☁ Guardar respaldo en Drive','drive-upload','primary')}
        ${btn('Compartir con Google Drive','drive-prepare-share','secondary')}
        ${btn('Descargar JSON local','drive-download','ghost')}
      </div>
      <p class="sub">${lastText()}</p>
      <div class="note">${config.mode==='drive'?'Al usar «Exportar copia» intentará subir directamente a Drive. Si la autorización caduca o falla la subida, ofrecerá una copia local e indicará el error.':'Sin autorización directa, el botón habitual «Exportar copia» descarga el JSON. Para compartirlo en Drive, utiliza el botón «Compartir».'}</div>
      <div class="sub">La primera vez que conectes Google deberás autorizar el acceso. iOS no permite garantizar subidas en segundo plano con la aplicación cerrada. Los respaldos JSON no están cifrados: protege tu cuenta de Google.</div>
    </div>`;
  }
  const renderSettingsBefore=renderSettings;
  renderSettings=function(){
    renderSettingsBefore();
    const target=document.querySelector('#settings');
    if(target){const card=document.createElement('div');card.innerHTML=settingsCard();target.insertBefore(card.firstElementChild,target.firstChild)}
    if(config.clientId && navigator.onLine) loadGis().catch(()=>{});
  };
  function refreshSettings(){if(typeof currentTab!=='undefined'&&currentTab==='settings')renderSettings()}

  function configModal(){
    openModal('Conectar Google Drive',`<p class="sub">Para subir copias directamente, crea un <b>ID de cliente OAuth 2.0 de tipo Aplicación web</b> y activa la API de Google Drive en <b>Google Cloud</b>.</p>
      <div class="field"><label for="gclientId">ID de cliente OAuth web</label><input id="gclientId" name="clientId" autocomplete="off" autocapitalize="off" spellcheck="false" required value="${esc(config.clientId)}" placeholder="123456789-...apps.googleusercontent.com"></div>
      <div class="note">Origen JavaScript autorizado: <b>https://jpruta725-ship-it.github.io</b> (sin «/cartera»). Nunca introduzcas una contraseña, un secreto de cliente ni una clave privada.</div>
      <p class="sub">Después de guardar pulsa «Conectar Google Drive» para autorizar tu propia cuenta. Cada iPhone autoriza la suya por separado.</p>`,
      'Guardar configuración',async(f)=>{
        const id=String(f.get('clientId')||'').trim();
        if(!CLIENT_RE.test(id)){notify('Introduce un ID OAuth de aplicación web válido.');return}
        if(id!==config.clientId){accessToken='';expiryAt=0;folderId='';}
        config.clientId=id;config.mode='download';persist();closeModal();refreshSettings();
        loadGis().then(()=>notify('Google preparado: ahora pulsa «Conectar Google Drive».')).catch(()=>notify('No se pudo cargar Google. Comprueba internet.'));
      });
  }
  function loadGis(){
    if(window.google?.accounts?.oauth2?.initTokenClient)return Promise.resolve();
    if(gisPromise)return gisPromise;
    gisPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='https://accounts.google.com/gsi/client';
      script.async=true;
      script.onload=()=>window.google?.accounts?.oauth2?.initTokenClient?resolve():reject(new Error('La biblioteca Google no se inicializó'));
      script.onerror=()=>reject(new Error('No hay acceso a Google Identity Services'));
      document.head.appendChild(script);
    }).catch(err=>{gisPromise=null;throw err});
    return gisPromise;
  }
  // Debe invocarse en el clic del usuario: Safari puede bloquear OAuth si se abre más tarde.
  function authorize(){
    if(!config.clientId){configModal();return}
    if(!window.google?.accounts?.oauth2?.initTokenClient){
      notify('Preparando Google… vuelve a pulsar Conectar cuando termine.');
      loadGis().then(()=>notify('Listo. Pulsa Conectar de nuevo para autorizar.')).catch(()=>notify('No se pudo cargar Google. Comprueba internet.'));
      return;
    }
    try {
      const client=window.google.accounts.oauth2.initTokenClient({
        client_id:config.clientId,
        scope:SCOPE,
        callback:(response)=>{
          if(response?.error||!response?.access_token){notify('Google no autorizó el acceso a Drive.');return}
          const granted=String(response.scope||SCOPE).split(/\s+/).includes(SCOPE);
          if(!granted){notify('No se concedió permiso para guardar archivos en Drive.');return}
          accessToken=response.access_token;
          expiryAt=Date.now()+Math.max(60,Number(response.expires_in)||3600)*1000;
          folderId='';config.mode='drive';persist();
          refreshSettings();notify('Google Drive conectado. Los siguientes respaldos se subirán directamente.');
        },
        error_callback:(err)=>notify('No se pudo abrir Google: '+String(err?.type||'autoriza desde Safari'))
      });
      client.requestAccessToken({prompt:'consent'});
    }catch(err){notify('No se pudo iniciar la autorización: '+String(err.message||err))}
  }
  async function googleRequest(url,options={}){
    const res=await fetch(url,{...options,headers:{'Authorization':'Bearer '+accessToken,...options.headers}});
    if(!res.ok){
      let message='HTTP '+res.status;
      try {const error=await res.json();message=String(error?.error?.message||message).slice(0,250)}catch(_){ }
      if(res.status===401){accessToken='';expiryAt=0;}
      throw Error('Google Drive respondió: '+message);
    }
    return res;
  }
  async function ensureFolder(){
    if(folderId)return folderId;
    const query=`name = '${FOLDER_NAME.replaceAll("'","\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    const lookup=await googleRequest('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:query,fields:'files(id,name),nextPageToken',page_size:'50'}));
    const listing=await lookup.json();
    let id=Array.isArray(listing.files)?listing.files.find(x=>x.name===FOLDER_NAME)?.id:null;
    if(!id){
      const made=await googleRequest('https://www.googleapis.com/drive/v3/files?fields=id,name',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({name:FOLDER_NAME,mimeType:'application/vnd.google-apps.folder'})
      });
      id=(await made.json()).id;
    }
    if(!id)throw Error('Google Drive no devolvió el identificador de la carpeta');
    folderId=id;return id;
  }
  async function uploadMultipart(blob,name,parent){
    const boundary='micartera_'+Math.random().toString(36).slice(2);
    const body=new Blob([
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({name,mimeType:'application/json',parents:[parent]}),
      `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
      blob,`\r\n--${boundary}--\r\n`
    ],{type:'multipart/related; boundary='+boundary});
    const result=await googleRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{
      method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body
    });
    return result.json();
  }
  async function uploadResumable(blob,name,parent){
    const start=await googleRequest('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',{
      method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','X-Upload-Content-Type':'application/json','X-Upload-Content-Length':String(blob.size)},
      body:JSON.stringify({name,mimeType:'application/json',parents:[parent]})
    });
    const location=start.headers.get('Location');
    if(!location||!/^https:\/\/(?:[a-z0-9-]+\.)*googleapis\.com\//i.test(location))throw Error('Google Drive no autorizó la sesión de subida grande');
    const uploaded=await googleRequest(location,{method:'PUT',headers:{'Content-Type':'application/json'},body:blob});
    return uploaded.json();
  }
  async function uploadToDrive(prepared){
    if(!connected())throw Error('La autorización de Google ha caducado. En Ajustes pulsa «Conectar Google Drive».');
    if(!navigator.onLine)throw Error('No hay internet: Google Drive no está disponible.');
    const blob=prepared?.blob;
    if(!(blob instanceof Blob)||blob.size<2||blob.size>MAX_FILE)throw Error('Archivo de respaldo inválido o demasiado grande');
    const parent=await ensureFolder();
    const uploaded=blob.size<=5*1024*1024
      ? await uploadMultipart(blob,prepared.filename,parent)
      : await uploadResumable(blob,prepared.filename,parent);
    if(!uploaded?.id)throw Error('Google Drive no confirmó que haya guardado el archivo.');
    config.lastUpload={at:new Date().toISOString(),name:prepared.filename,id:String(uploaded.id)};
    persist();
    notify('Respaldo confirmado en Google Drive: '+prepared.filename);
    refreshSettings();
    return uploaded;
  }
  async function buildPrepared(){
    if(typeof window.MiCarteraBuildCompleteBackup!=='function')throw Error('No está disponible la copia completa de rutas');
    return window.MiCarteraBuildCompleteBackup();
  }
  function safeLocalDownload(p){downloadBlob(p.blob,p.filename);notify('Respaldo descargado localmente (no en Google Drive).')}
  async function deliverBackup(prepared){
    if(busy){notify('Ya hay un respaldo en proceso');return}
    busy=true;
    try {
      if(config.mode==='drive'){
        try {await uploadToDrive(prepared)}
        catch(err){safeLocalDownload(prepared);alert('NO SE GUARDÓ EN GOOGLE DRIVE.\n\n'+String(err.message||err)+'\n\nSe intentó descargar una copia local. Comprueba que el archivo esté en Archivos/Descargas y vuelve a conectar Google.');}
      } else safeLocalDownload(prepared);
    }finally{busy=false}
  }
  window.MiCarteraBackupDelivery=deliverBackup;
  async function directUploadAction(){
    if(busy){notify('Ya se está creando una copia');return}
    if(!connected()){notify('Primero conecta tu cuenta de Google Drive desde Ajustes.');if(!config.clientId)configModal();return}
    busy=true;
    try {
      const prepared=await buildPrepared();
      try{await uploadToDrive(prepared)}catch(err){safeLocalDownload(prepared);alert('No se pudo guardar en Google Drive: '+String(err.message||err)+'\n\nSe intentó descargar una copia local.');}
    }catch(err){alert('No se pudo generar el respaldo: '+String(err.message||err))}
    finally{busy=false}
  }
  async function localDownloadAction(){
    if(busy)return;
    busy=true;
    try {safeLocalDownload(await buildPrepared())}catch(err){alert('No se pudo crear el respaldo: '+String(err.message||err))}
    finally{busy=false}
  }
  async function prepareShareAction(){
    if(busy)return;
    busy=true;
    try {
      const prepared=await buildPrepared();
      sharePrepared=new File([prepared.blob],prepared.filename,{type:'application/json'});
      sharePreparedName=prepared.filename;
      const canShare=typeof navigator.share==='function' && (!navigator.canShare||navigator.canShare({files:[sharePrepared]}));
      if(!canShare){
        safeLocalDownload(prepared);
        alert('Safari no permite compartir este archivo directamente. Se intentó descargar el JSON. Ábrelo en Archivos y usa Compartir → Google Drive.');
        return;
      }
      openModal('Enviar respaldo a Google Drive',`<div class="note">El archivo completo <b>${esc(prepared.filename)}</b> ya está preparado (${prepared.routeCount} ruta(s), ${prepared.documentCount} documento(s)).</div>
        <p class="sub">Pulsa «Abrir Compartir». En la hoja de iPhone selecciona <b>Google Drive</b> y confirma <b>Guardar/Subir</b>. Hasta confirmar en la app de Drive no se considera respaldado.</p>
        <p class="sub">Este método no necesita configurar Google Cloud, pero requiere seleccionar Drive manualmente en cada copia.</p>`,
        'Abrir Compartir',()=>{
          // La llamada a navigator.share es inmediata al toque, imprescindible para iOS.
          const promise=navigator.share({files:[sharePrepared],title:'Respaldo Mi Cartera'});
          promise.then(()=>{closeModal();notify('Archivo compartido. Comprueba que Google Drive haya terminado la subida.');})
            .catch(err=>{if(err?.name==='AbortError'){notify('Compartir cancelado. No se confirmó un respaldo.');return}alert('No se pudo compartir: '+String(err.message||err))});
          return promise.catch(()=>{});
        });
    }catch(err){alert('No se pudo preparar el respaldo: '+String(err.message||err))}
    finally{busy=false}
  }
  const previousAction=handleAction;
  handleAction=function(action){
    if(action==='drive-config'){configModal();return}
    if(action==='drive-authorize'){authorize();return}
    if(action==='drive-upload'){directUploadAction();return}
    if(action==='drive-download'){localDownloadAction();return}
    if(action==='drive-prepare-share'){prepareShareAction();return}
    return previousAction(action);
  };
  window.MiCarteraDriveTest={getStatus:()=>({mode:config.mode,connected:connected(),lastUpload:config.lastUpload}),
    settingsCard,uploadMultipart,uploadResumable,deliverBackup,prepareShareAction,buildPrepared};
})();
