/* Mi Cartera iPhone 3.4.7 — PIN, bloqueo por inactividad y al salir configurables.
 * Barrera de privacidad de la interfaz; NO cifra los datos financieros.
 * El PIN nunca se guarda en texto claro. No usa red, cuentas ni backend.
 */
'use strict';
(function () {
  const STORAGE_KEY = 'micartera.security.pin.v1';
  const ITERATIONS = 210000;
  // Se guardan segundos permitidos en la configuración del PIN de este dispositivo.
  const IDLE_OPTIONS = [30, 60, 120, 300, 600, 900, 1800, 3600];
  const DEFAULT_IDLE_SECONDS = 300;
  const idleSeconds = candidate => IDLE_OPTIONS.includes(candidate?.idleLockSeconds)
    ? candidate.idleLockSeconds : DEFAULT_IDLE_SECONDS;
  const idleLabel = seconds => seconds < 60 ? `${seconds} segundos` : `${seconds / 60} ${seconds === 60 ? 'minuto' : 'minutos'}`;
  // Para los PIN creados en versiones anteriores el bloqueo al salir permanece activado.
  const lockOnExitEnabled = candidate => candidate?.lockOnExit !== false;
  const idleHelpText = () => `Se bloqueará tras ${idleLabel(idleSeconds(config))} sin actividad${lockOnExitEnabled(config) ? '. También se bloquea inmediatamente si sales o cambias de aplicación.' : ', incluso si cambias temporalmente de aplicación. En una apertura nueva siempre se solicita el PIN.'}`;
  const gate = document.getElementById('securityGate');
  if (!gate) return;

  const bytesToHex = bytes => Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  const hexToBytes = hex => new Uint8Array(hex.match(/.{2}/g).map(x => parseInt(x, 16)));
  const validPin = pin => /^\d{6}$/.test(String(pin || ''));
  const cryptoReady = () => Boolean(window.crypto && crypto.subtle && crypto.getRandomValues);
  const readSecurity = () => {
    try {
      const v = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return v && v.version === 1 && typeof v.hash === 'string' && /^[0-9a-f]{64}$/.test(v.hash) && /^[0-9a-f]{32}$/.test(v.salt) && Number.isInteger(v.iterations) && v.iterations >= 100000 ? v : null;
    } catch (_) { return null; }
  };
  let config = readSecurity();
  let unlocked = !config;
  let revealAuth = !config || !config.discreet;
  let attempts = 0;
  let waitUntil = 0;
  let lastInteraction = Date.now();
  let longPressTimer = null;
  let gateMessage = '';
  let gateBusy = false;

  async function hashPin(pin, salt, iterations = ITERATIONS) {
    if (!cryptoReady()) throw new Error('Esta instalación no admite cifrado de PIN. Abre la app desde su dirección HTTPS.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), {name:'PBKDF2'}, false, ['deriveBits']);
    const result = await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:hexToBytes(salt), iterations}, key, 256);
    return bytesToHex(new Uint8Array(result));
  }
  async function verifyPin(pin, candidate = config) {
    if (!candidate || !validPin(pin)) return false;
    const hash = await hashPin(pin, candidate.salt, candidate.iterations);
    // Compare every byte instead of returning at the first unequal character.
    let mismatch = 0;
    for (let i = 0; i < hash.length; i++) mismatch |= hash.charCodeAt(i) ^ candidate.hash.charCodeAt(i);
    return mismatch === 0;
  }
  function storeConfig(next) {
    // Do not update the active settings if the write failed.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    config = next;
  }
  async function freshConfig(pin, discreet = false) {
    if (!validPin(pin)) throw new Error('La clave debe tener exactamente 6 dígitos.');
    if (!cryptoReady()) throw new Error('Esta versión necesita HTTPS para proteger la verificación del PIN.');
    const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    return {version:1, salt, hash:await hashPin(pin, salt), iterations:ITERATIONS, discreet:Boolean(discreet), idleLockSeconds:config ? idleSeconds(config) : DEFAULT_IDLE_SECONDS, lockOnExit:lockOnExitEnabled(config)};
  }
  function showGate() {
    const protectedNow = !!config && !unlocked;
    document.body.classList.toggle('mc-locked', protectedNow);
    document.documentElement.classList.remove('mc-prelocked');
    gate.hidden = !protectedNow;
    if (!protectedNow) {
      gate.replaceChildren();
      lastInteraction = Date.now();
      return;
    }
    const neutral = !!config.discreet && !revealAuth;
    if (neutral) {
      gate.innerHTML = `<div class="security-discreet">
          <div class="security-symbol" id="securitySymbol" role="button" tabindex="0" aria-label="Mantener pulsado para acceder">◉</div>
          <h1>Espacio privado</h1><p>Contenido protegido</p>
          <span class="security-footnote">Mantén pulsado el círculo para acceder</span>
          <button type="button" id="securityReveal" class="security-text-link">Acceder</button>
        </div>`;
      const symbol = document.getElementById('securitySymbol');
      const cancelPress = () => {if (longPressTimer) clearTimeout(longPressTimer); longPressTimer = null;};
      const startPress = e => {e.preventDefault(); cancelPress(); longPressTimer = setTimeout(() => {longPressTimer=null; revealAuth=true; showGate();}, 1150);};
      symbol.addEventListener('pointerdown', startPress);
      symbol.addEventListener('contextmenu', e => e.preventDefault());
      ['pointerup','pointercancel','pointerleave'].forEach(ev => symbol.addEventListener(ev, cancelPress));
      symbol.addEventListener('keydown', e => {if(e.key==='Enter'||e.key===' '){e.preventDefault();revealAuth=true;showGate();}});
      document.getElementById('securityReveal').addEventListener('click', () => {revealAuth=true;showGate();});
      return;
    }
    gate.innerHTML = `<section class="security-panel" role="dialog" aria-modal="true" aria-labelledby="securityTitle">
      <div class="security-logo" aria-hidden="true">✦</div>
      <div class="security-eyebrow">ACCESO PROTEGIDO</div>
      <h1 id="securityTitle">Desbloquear Mi Cartera</h1>
      <p>Introduce tu clave de seis dígitos para ver tus rutas, clientes y cobros.</p>
      <form id="securityUnlockForm" autocomplete="off">
        <label for="securityPin">Clave de acceso</label>
        <input id="securityPin" type="password" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" minlength="6" autocomplete="off" placeholder="••••••" required aria-describedby="securityError" />
        <div class="security-error" id="securityError" role="alert">${gateMessage}</div>
        <button class="security-submit" type="submit" ${gateBusy||Date.now()<waitUntil?'disabled':''}>${gateBusy?'Comprobando…':'Desbloquear'}</button>
      </form>
      <p class="security-hint">La clave se guarda únicamente en este iPhone. Sin ella, necesitarás tu respaldo externo para recuperar la información en otra instalación.</p>
      </section>`;
    const input = document.getElementById('securityPin');
    input?.focus({preventScroll:true});
    document.getElementById('securityUnlockForm').addEventListener('submit', async event => {
      event.preventDefault();
      if (gateBusy || Date.now() < waitUntil) return;
      const supplied = input.value;
      input.value = '';
      if (!validPin(supplied)) {gateMessage='Escribe exactamente 6 números.';showGate();return;}
      gateBusy = true;
      try {
        if (await verifyPin(supplied)) {
          attempts=0; waitUntil=0; gateMessage=''; unlocked=true;
          if(config?.discreet) {
            try {storeConfig({...config,discreet:false});} catch (_) { /* unlocking still succeeds */ }
          }
          revealAuth=true;
          showGate();
          return;
        }
        attempts++;
        gateMessage='Clave incorrecta. Vuelve a intentarlo.';
        if (attempts%5===0) {
          const seconds = attempts>=10 ? 120 : 30;
          waitUntil=Date.now()+seconds*1000;
          gateMessage=`Demasiados intentos. Inténtalo en ${seconds} segundos.`;
          setTimeout(()=>{if(!unlocked){gateMessage='';showGate();}},seconds*1000+150);
        }
      } catch (err) {gateMessage=String(err.message||'No se pudo comprobar la clave.');}
      finally {gateBusy=false;}
      showGate();
    });
  }
  function lockNow(discreet) {
    if (!config) return;
    if (discreet === true && !config.discreet) {
      try {storeConfig({...config,discreet:true});} catch (_) {notify('No se pudo activar el modo discreto.');return;}
    }
    gateMessage='';
    unlocked=false;
    revealAuth=!config.discreet;
    try {closeModal();} catch (_) { /* no open modal */ }
    showGate();
  }
  function securityCard() {
    const status = config ? '<span class="security-status is-on">Activa</span>' : '<span class="security-status">No configurada</span>';
    return `<div class="card security-settings-card">
       <div class="rowtop"><div><div class="cardtitle">🔐 Privacidad y acceso</div><p class="sub">Bloqueo por PIN y pantalla discreta en este dispositivo.</p></div>${status}</div>
       ${!config ? `<div class="note">Crea una clave de 6 números para solicitarla al volver a abrir Mi Cartera.</div>
         <div class="stickyactions">${btn('Crear clave de acceso','security-setup','primary')}</div>` : `
         <div class="security-settings-actions">
           ${btn('Bloquear ahora','security-lock','secondary')}
           ${btn('Modo discreto','security-hide','primary')}
           ${btn('Cambiar PIN','security-change','secondary')}
           ${btn('Desactivar clave','security-disable','ghost')}
         </div>
         <div class="field security-idle-setting">
           <label for="securityIdleDelay">Bloqueo automático por inactividad</label>
           <select id="securityIdleDelay" aria-describedby="securityIdleHelp">
             ${IDLE_OPTIONS.map(seconds => `<option value="${seconds}" ${idleSeconds(config) === seconds ? 'selected' : ''}>${idleLabel(seconds)}</option>`).join('')}
           </select>
           <p class="sub" id="securityIdleHelp">${idleHelpText()}</p>
         </div>
         <div class="field security-exit-setting">
           <label for="securityLockOnExit">Bloquear al salir de Mi Cartera</label>
           <select id="securityLockOnExit" aria-describedby="securityExitHelp">
             <option value="1" ${lockOnExitEnabled(config) ? 'selected' : ''}>Activado (más seguro)</option>
             <option value="0" ${!lockOnExitEnabled(config) ? 'selected' : ''}>Desactivado</option>
           </select>
           <p class="sub" id="securityExitHelp">${lockOnExitEnabled(config) ? 'Al cambiar de app o apagar la pantalla se solicita el PIN al regresar.' : 'Puedes salir y volver sin PIN mientras la sesión siga abierta y no haya vencido el tiempo de inactividad. Al reiniciar la página o la app, se solicita el PIN.'}</p>
         </div>
         <div class="note">El modo discreto sustituye los importes por una pantalla neutra; mantén pulsado el círculo para volver a acceder con tu PIN.</div>`}
       <p class="sub security-limit">Protección de pantalla: <b>no cifra la base de datos local</b> ni puede ocultar el icono del sistema. Guarda copias de seguridad y protege el acceso físico al iPhone.</p>
       ${btn('¿Se puede ocultar el icono en iPhone?','security-icon-help','ghost')}
    </div>`;
  }
  const previousSettings = renderSettings;
  renderSettings = function () {
    previousSettings();
    document.querySelector('#settings')?.insertAdjacentHTML('afterbegin', securityCard());
  };
  function modalPinField(name,label) {
    return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="password" inputmode="numeric" autocomplete="off" pattern="[0-9]{6}" maxlength="6" minlength="6" placeholder="6 dígitos" required></div>`;
  }
  function setupPin() {
    if (config) return notify('Ya hay una clave. Usa Cambiar PIN.');
    if (!cryptoReady()) return notify('Para activar la clave debes abrir Mi Cartera desde HTTPS.');
    openModal('Crear clave de acceso', `${modalPinField('pin','Clave nueva')}${modalPinField('repeat','Repetir clave')}
      <div class="note">Usa seis números que recuerdes y no sean fáciles de adivinar. Cada iPhone debe configurar su propia clave. No se incluye en los respaldos.</div>`, 'Activar clave', async f => {
      const a=f.get('pin'), b=f.get('repeat');
      if(!validPin(a)||a!==b)return notify('Las claves deben coincidir y tener seis dígitos.');
      try {storeConfig(await freshConfig(a));closeModal();renderSettings();notify('Clave activada. Usa Bloquear ahora para probarla.');}
      catch(err){notify('No se pudo guardar la clave: '+String(err.message||err));}
    });
  }
  function changePin() {
    if (!config) return setupPin();
    openModal('Cambiar clave', `${modalPinField('old','Clave actual')}${modalPinField('pin','Nueva clave')}${modalPinField('repeat','Repetir nueva clave')}`, 'Cambiar PIN', async f => {
      const old=f.get('old'),pin=f.get('pin'),repeat=f.get('repeat');
      if(!validPin(pin)||pin!==repeat)return notify('La clave nueva debe tener seis números y coincidir.');
      try {
        if(!await verifyPin(old))return notify('La clave actual no es correcta.');
        storeConfig(await freshConfig(pin,config.discreet));
        closeModal();renderSettings();notify('Clave actualizada.');
      }catch(err){notify('No se pudo cambiar la clave: '+String(err.message||err));}
    });
  }
  function disablePin() {
    if(!config)return;
    openModal('Desactivar protección',`${modalPinField('old','Clave actual')}<div class="note">Esto quitará el bloqueo al abrir la aplicación. No elimina tus datos financieros.</div>`, 'Desactivar',async f=>{
      try {
        if(!await verifyPin(f.get('old')))return notify('Clave incorrecta.');
        if(!confirm('¿Desactivar la clave y el modo discreto en este iPhone?'))return;
        localStorage.removeItem(STORAGE_KEY);
        config=null;unlocked=true;
        closeModal();renderSettings();notify('Protección desactivada.');
      }catch(err){notify('No se pudo quitar el PIN: '+String(err.message||err));}
    });
  }
  function discreetMode() {
    if(!config)return setupPin();
    if(!confirm('Mi Cartera mostrará una pantalla neutra y exigirá tu PIN para volver. ¿Activar modo discreto?'))return;
    lockNow(true);
  }
  const previousAppMenu = openAppMenu;
  openAppMenu = function () {
    previousAppMenu();
    const form = document.getElementById('activeForm');
    if (form) form.insertAdjacentHTML('afterbegin', `<div class="menu-list">${config ? `${btn('🔒 Bloquear cartera','security-lock','menu-choice')}${btn('◉ Activar pantalla discreta','security-hide','menu-choice')}` : btn('🔐 Crear clave de acceso','security-setup','menu-choice')}</div>`);
  };
  const previousAction = handleAction;
  handleAction = function (action) {
    if (config && !unlocked) return;
    if (action==='security-setup') return setupPin();
    if (action==='security-change') return changePin();
    if (action==='security-disable') return disablePin();
    if (action==='security-lock') return lockNow();
    if (action==='security-hide') return discreetMode();
    if (action==='security-icon-help') {
      return openModal('Ocultar el icono en iPhone',`<div class="note">Mi Cartera se instala desde Safari como aplicación web. <b>iOS no permite que esta web se oculte o cambie su icono automáticamente.</b></div>
       <p class="sub">La función «Ocultar y requerir Face ID» de iOS está limitada a determinadas apps descargadas de la App Store, por lo que puede no aparecer en Mi Cartera.</p>
       <p class="sub">El modo discreto de Mi Cartera oculta su contenido dentro de la app, pero no quita el icono del inicio ni cambia su nombre.</p>`, 'Cerrar', null);
    }
    return previousAction(action);
  };

  // Delegación: el selector se vuelve a crear al renderizar Ajustes.
  document.addEventListener('change', event => {
    if (event.target?.id !== 'securityIdleDelay' || !config || !unlocked) return;
    const seconds = Number(event.target.value);
    if (!Number.isInteger(seconds) || !IDLE_OPTIONS.includes(seconds)) {
      event.target.value = String(idleSeconds(config));
      return;
    }
    try {
      storeConfig({...config, idleLockSeconds:seconds});
      lastInteraction = Date.now();
      const help = document.getElementById('securityIdleHelp');
      if (help) help.textContent = idleHelpText();
      notify(`Bloqueo automático configurado: ${idleLabel(seconds)}.`);
    } catch (_) {
      event.target.value = String(idleSeconds(config));
      notify('No se pudo guardar el tiempo de bloqueo. Revisa el almacenamiento del iPhone.');
    }
  });

  document.addEventListener('change', event => {
    if (event.target?.id !== 'securityLockOnExit' || !config || !unlocked) return;
    const selected = event.target.value;
    if (selected !== '0' && selected !== '1') {
      event.target.value = lockOnExitEnabled(config) ? '1' : '0';
      return;
    }
    try {
      storeConfig({...config, lockOnExit:selected === '1'});
      const help = document.getElementById('securityExitHelp');
      if (help) help.textContent = lockOnExitEnabled(config)
        ? 'Al cambiar de app o apagar la pantalla se solicita el PIN al regresar.'
        : 'Puedes salir y volver sin PIN mientras la sesión siga abierta y no haya vencido el tiempo de inactividad. Al reiniciar la página o la app, se solicita el PIN.';
      const idleHelp = document.getElementById('securityIdleHelp');
      if (idleHelp) idleHelp.textContent = idleHelpText();
      notify(lockOnExitEnabled(config) ? 'Bloqueo al salir activado.' : 'Bloqueo al salir desactivado. El tiempo de inactividad sigue activo.');
    } catch (_) {
      event.target.value = lockOnExitEnabled(config) ? '1' : '0';
      notify('No se pudo guardar la preferencia. Revisa el almacenamiento del iPhone.');
    }
  });

  const idleTimeElapsed = () => Date.now() - lastInteraction >= idleSeconds(config) * 1000;
  document.addEventListener('visibilitychange', () => {
    if (!config || !unlocked) return;
    if (document.hidden) {
      if (lockOnExitEnabled(config)) lockNow();
    } else if (idleTimeElapsed()) {
      // El temporizador de iOS puede estar suspendido mientras la PWA está en segundo plano.
      lockNow();
    }
  });
  window.addEventListener('pagehide', () => {
    if (config && unlocked && (lockOnExitEnabled(config) || idleTimeElapsed())) lockNow();
  });
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('#securityGate'))lastInteraction=Date.now();},{passive:true});
  document.addEventListener('keydown',e=>{if(!e.target.closest('#securityGate'))lastInteraction=Date.now();});
  setInterval(()=>{if(config && unlocked && Date.now()-lastInteraction >= idleSeconds(config)*1000)lockNow();},15000);
  showGate();
  if(currentTab==='settings')renderSettings();

  // Read-only testing/diagnostics, not a bypass for unlocking.
  window.MiCarteraAccessStatus=()=>({configured:Boolean(config),locked:Boolean(config&&!unlocked),discreet:Boolean(config?.discreet),idleLockSeconds:idleSeconds(config),lockOnExit:lockOnExitEnabled(config)});
})();
