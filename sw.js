// RepCam offline support. Bump the version to force every phone to refresh its saved copy.
const VERSION='v2', SHELL='repcam-shell-'+VERSION, RUNTIME='repcam-runtime-'+VERSION;
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png'];
// Fonts and the rep-counting model come from these hosts; they are saved after first use.
const CDN=['cdn.jsdelivr.net','storage.googleapis.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(SHELL).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==SHELL&&k!==RUNTIME).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.protocol!=='http:'&&url.protocol!=='https:') return;
  if(url.origin===self.location.origin){
    // The app itself: newest version when online, saved copy when offline
    e.respondWith(fetch(req).then(res=>{
      if(res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put(req,copy));}
      return res;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(hit=>hit||caches.match('./index.html'))));
  }else if(CDN.includes(url.hostname)){
    // Model and fonts: saved copy first, download only once
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{
      if(res.ok||res.type==='opaque'){const copy=res.clone();caches.open(RUNTIME).then(c=>c.put(req,copy));}
      return res;
    })));
  }
});
