const CACHE='micartera-iphone-v347-exit-lock-optional';
const FILES=['./','./index.html','./styles.css','./app.js','./parity.js','./documents.js','./improvements.js','./integrity.js','./quality.js','./maps.js','./routes.js','./drive.js','./security.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('micartera-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request, url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.searchParams.has('version_check')){event.respondWith(fetch(request));return;}
 event.respondWith((async()=>{
  // Una URL con ?v=34 debe seguir funcionando sin conexión gracias al archivo precargado.
  const cached=(await caches.match(request)) || (await caches.match(url.origin+url.pathname));
  try {const response=await fetch(request);if(response.ok){const cache=await caches.open(CACHE);cache.put(request,response.clone()).catch(()=>{})}return response}
  catch{return cached||((request.mode==='navigate')?await caches.match('./index.html'):Response.error())}
 })());
});
