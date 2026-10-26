'use strict';
/* Mi Cartera iPhone 3.4.8 — Copias de seguridad en Google Drive.
 * La PWA nunca guarda contraseñas, refresh tokens ni access tokens permanentes.
 * Subida directa solo con OAuth explícito y Google Drive API habilitada.
 * Fallback fiable: descargar JSON y subirlo manualmente a Google Drive.
 * Compartir mediante la hoja nativa es opcional y puede ser denegado por el navegador.
 */
(function () {
  const CONFIG_KEY='micartera.drive.config.v1';
  const SCOPE='https://www.googleapis.com/auth/drive.file';
  const FOLDER_NAME='Mi Cartera - Respaldos';
  const MAX_FILE=125*1024*1024;
  const CLIENT_RE=/^[0-9]+-[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/;
  const PUBLISHED_CLIENT_ID = String(window.MI_CARTERA_GOOGLE_CLIENT_ID || '').trim();
  const sharedClientConfigured=CLIENT_RE.test(PUBLISHED_CLIENT_ID);
  let config={clientId:sharedClientConfigured?PUBLISHED_CLIENT_ID:'',mode:'download',lastUpload:null};
  try {
    const saved=JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}');
    if(CLIENT_RE.test(String(saved.clientId||'')))config.clientId=saved.clientId;
    if(saved.mode==='drive'&&config.clientId)config.mode='drive';
    if(saved.lastUpload&&typeof saved.lastUpload.name==='string'&&typeof saved.lastUpload.at==='string')config.lastUpload=saved.lastUpload;
  } catch(_) { /* sin configuración previa */ }
  // La configuración común publicada tiene prioridad; basta hacerlo una vez para todos los iPhone.
  if(sharedClientConfigured)config.clientId=PUBLISHED_CLIENT_ID;
  if(config.mode==='drive' && !config.clientId)config.mode='download';
  let accessToken='',expiryAt=0,folderId='',busy=false,sharePrepared=null,gisPromise=null;
  let sharePreparedName='';
  let preparedForManual=null;
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
    const auth=connected();
    const stateText=auth
      ? 'Google Drive está conectado. Puedes guardar una copia ahora.'
      : oauthOn
        ? 'La conexión ya está preparada. Solo necesitas autorizar tu cuenta de Google.'
        : 'Falta la activación inicial de Google. Es un paso único para la aplicación.';
    return `<div class="card drive-settings-card">
      <div class="cardtitle">☁ Respaldos en Google Drive</div>
      <p class="sub">Guarda <b>todas tus rutas y sus documentos</b> en una carpeta de Google Drive. La copia solo se considera terminada cuando Drive confirma la subida.</p>
      <div class="drive-state"><span class="pill ${auth?'green':'amber'}">${auth?'Conectado':oauthOn?'Pendiente de conectar':'Sin activar'}</span><span class="sub">${stateText}</span></div>
      <div class="drive-actions">
        ${oauthOn ? btn(auth?'↻ Reconectar Google':'Conectar mi Google Drive','drive-authorize','secondary') : btn('1. Activar Google Drive (una sola vez)','drive-setup','secondary')}
        ${btn('☁ Guardar respaldo en Google Drive','drive-upload','primary')}
      </div>
      <div class="drive-actions">
        ${btn('⬇ Descargar respaldo en el teléfono','drive-download','ghost')}
      </div>
      <p class="sub">${lastText()}</p>
      <details class="drive-advanced"><summary>Ayuda y configuración avanzada</summary>
        <p class="sub">${oauthOn ? 'Si se vence la sesión de Google, pulsa «Conectar mi Google Drive» de nuevo.' : 'Primero hay que registrar Mi Cartera en Google Cloud. Después todos los iPhone podrán conectarse con un botón.'}</p>
        <div class="drive-actions">${btn('Ver instrucciones de activación','drive-setup','secondary')}${btn('Introducir ID en este dispositivo','drive-config','ghost')}${btn('Abrir Google Drive','drive-open-site','ghost')}</div>
        <p class="sub">Si Google no funciona, descarga el respaldo y súbelo manualmente a Drive desde la aplicación Google Drive.</p>
      </details>
      <div class="sub">Solo se intenta la subida al pulsar el botón y mientras haya internet y autorización. La aplicación web no puede hacer copias en segundo plano cuando está cerrada.</div>
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

  function setupWizard(){
    openModal('Activar Google Drive una sola vez',`
      <p>Para que todos tus iPhone tengan el botón <b>«Conectar Google»</b>, es necesario registrar Mi Cartera una sola vez con Google. Solo tienes que copiar un identificador <b>público</b>.</p>
      <ol class="sub">
        <li>En Windows, abre <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud</a> y crea o selecciona un proyecto.</li>
        <li>Activa la <b>API de Google Drive</b> y configura la pantalla de consentimiento OAuth para tu cuenta.</li>
        <li>En <b>Google Auth Platform → Clients</b>, crea una credencial tipo <b>Aplicación web</b>.</li>
        <li>En <b>Orígenes autorizados de JavaScript</b> escribe exactamente: <code>https://jpruta725-ship-it.github.io</code></li>
        <li>Copia el <b>ID de cliente</b> que termina en <code>.apps.googleusercontent.com</code>. Puedes pegarlo aquí para este iPhone o en el archivo <code>google-client.js</code> de GitHub para todos los teléfonos.</li>
      </ol>
      <div class="note">Nunca escribas contraseñas, claves privadas ni secretos de cliente aquí. Solo el identificador público OAuth.</div>
      <div class="field"><label for="gclientId">ID de cliente OAuth web</label><input id="gclientId" name="clientId" autocomplete="off" autocapitalize="off" spellcheck="false" required value="${esc(config.clientId)}" placeholder="123456789-...apps.googleusercontent.com"></div>
      <p class="sub">Después de guardar, pulsa «Conectar mi Google Drive» y acepta el permiso en Google.</p>`,
      'Guardar identificador',async(f)=>{
        const id=String(f.get('clientId')||'').trim();
        if(!CLIENT_RE.test(id)){notify('El ID debe terminar en .apps.googleusercontent.com');return}
        if(id!==config.clientId){accessToken='';expiryAt=0;folderId='';}
        config.clientId=id;config.mode='download';persist();closeModal();refreshSettings();
        loadGis().then(()=>notify('Preparado. Pulsa «Conectar mi Google Drive».')).catch(()=>notify('Comprueba tu conexión y pulsa «Conectar mi Google Drive».'));
      });
  }
  function configModal(){setupWizard()}
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
    if(!config.clientId){setupWizard();return}
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
    const lookup=await googleRequest('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:query,fields:'files(id,name),nextPageToken',pageSize:'50'}));
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
  function safeLocalDownload(p){downloadBlob(p.blob,p.filename);notify('Se inició la descarga del respaldo. Comprueba el archivo antes de subirlo a Drive.')}
  function openDriveSite(){window.open('https://drive.google.com/drive/my-drive','_blank','noopener,noreferrer')}
  function downloadPrepared(){if(!preparedForManual){notify('Prepara primero el archivo para compartir.');return}safeLocalDownload(preparedForManual)}
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
    if(!connected()){notify(config.clientId?'Primero pulsa «Conectar mi Google Drive».':'Primero activa Google Drive una sola vez.');if(!config.clientId)setupWizard();return}
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
  function showManualBackupInstructions(reason='') {
    const prepared=preparedForManual;
    if(!prepared)return;
    const why=reason?`<div class="note" role="alert"><b>Compartir no está disponible:</b> ${esc(reason)}. No se ha subido ningún archivo a Google Drive.</div>`:'';
    openModal('Guardar respaldo en Google Drive',`<div class="note"><b>Archivo preparado:</b> ${esc(prepared.filename)}<br>${prepared.routeCount} ruta(s) y ${prepared.documentCount} documento(s).</div>
      ${why}
      <p class="sub"><b>Método compatible con PC y iPhone:</b></p>
      <ol class="sub"><li>Pulsa <b>«Descargar archivo»</b> aquí abajo.</li><li>Comprueba que el JSON exista en Descargas/Archivos.</li><li>Abre <b>Google Drive</b> y súbelo con <b>Nuevo → Subir archivo</b>. En iPhone puedes hacerlo desde Archivos.</li><li>Comprueba que aparezca en Drive. Hasta entonces, <b>no está respaldado en Google</b>.</li></ol>
      <div class="drive-actions">${btn('⬇ Descargar archivo','drive-download-prepared','primary')}${btn('↗ Abrir Google Drive','drive-open-site','secondary')}</div>
      <p class="sub">Si el navegador no descarga desde la aplicación instalada, abre Mi Cartera en <b>Safari</b> y utiliza «Descargar respaldo completo» desde allí. No borres los datos de la aplicación.</p>`,
      'Cerrar',()=>closeModal());
  }
  async function prepareShareAction(){
    if(busy)return;
    busy=true;
    try {
      const prepared=await buildPrepared();
      preparedForManual=prepared;
      sharePrepared=null;
      sharePreparedName=prepared.filename;
      let canShare=false;
      try {
        sharePrepared=new File([prepared.blob],prepared.filename,{type:'application/json'});
        const policy=document.permissionsPolicy||document.featurePolicy;
        const allowed=!(policy && typeof policy.allowsFeature==='function') || policy.allowsFeature('web-share');
        canShare=allowed && typeof navigator.share==='function' && (!navigator.canShare||navigator.canShare({files:[sharePrepared]}));
      } catch(_) {canShare=false}
      if(!canShare){
        showManualBackupInstructions('Este navegador no permite compartir archivos directamente');
        return;
      }
      openModal('Enviar respaldo a Google Drive',`<div class="note">Archivo preparado: <b>${esc(prepared.filename)}</b> (${prepared.routeCount} ruta(s), ${prepared.documentCount} documento(s)).</div>
        <p class="sub">Puedes intentar abrir el menú Compartir. Si el navegador lo impide, podrás descargar el JSON sin perder la copia.</p>
        <div class="drive-actions">${btn('⬇ Descargar archivo','drive-download-prepared','secondary')}${btn('↗ Abrir Google Drive','drive-open-site','ghost')}</div>
        <p class="sub">Compartir un archivo no confirma que Google Drive lo haya guardado. Comprueba la subida en Drive.</p>`,
        'Intentar compartir',()=>{
          // La hoja nativa exige interacción directa y permiso del navegador.
          let sharing;
          try { sharing=navigator.share({files:[sharePrepared],title:'Respaldo Mi Cartera'}); }
          catch(err){showManualBackupInstructions(String(err?.message||err||'permiso denegado'));return}
          return Promise.resolve(sharing).then(()=>{
            closeModal();notify('El archivo se entregó al menú Compartir. Comprueba su presencia en Google Drive.');
          }).catch(err=>{
            if(err?.name==='AbortError'){notify('Compartir cancelado; puedes descargar el archivo en su lugar.');return}
            showManualBackupInstructions(err?.name==='NotAllowedError'?'Permiso denegado por el navegador':String(err?.message||err||'error de compartir'));
          });
        });
    }catch(err){alert('No se pudo preparar el respaldo: '+String(err.message||err))}
    finally{busy=false}
  }
  const previousAction=handleAction;
  handleAction=function(action){
    if(action==='drive-setup'){setupWizard();return}
    if(action==='drive-config'){configModal();return}
    if(action==='drive-authorize'){authorize();return}
    if(action==='drive-upload'){directUploadAction();return}
    if(action==='drive-download'){localDownloadAction();return}
    if(action==='drive-download-prepared'){downloadPrepared();return}
    if(action==='drive-open-site'){openDriveSite();return}
    if(action==='drive-prepare-share'){prepareShareAction();return}
    return previousAction(action);
  };
  window.MiCarteraDriveTest={getStatus:()=>({mode:config.mode,connected:connected(),lastUpload:config.lastUpload}),
    settingsCard,uploadMultipart,uploadResumable,deliverBackup,prepareShareAction,buildPrepared};
})();
