// RepCam offline support. Bump the version to force every phone to refresh its saved copy.
const VERSION='v7', SHELL='repcam-shell-'+VERSION, RUNTIME='repcam-runtime'; // RUNTIME keeps the model across versions
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
      if(res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put(req,copy));return res;}
      // site unpublished or host error: keep running from the saved copy
      return caches.match(req,{ignoreSearch:true}).then(hit=>hit||res);
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(hit=>hit||caches.match('./index.html'))));
  }else if(CDN.includes(url.hostname)){
    // Model and fonts: saved copy first, download only once
    e.respondWith(caches.match(req,{ignoreVary:true}).then(hit=>hit||fetch(req).then(res=>{
      if(res.ok||res.type==='opaque'){const copy=res.clone();caches.open(RUNTIME).then(c=>c.put(req,copy));}
      return res;
    })));
  }
});
// The page lists the model and font files it loaded; save any that are not saved yet.
// (On the very first launch they load before this worker is in control, so they would otherwise be missed.)
self.addEventListener('message',e=>{
  const d=e.data||{}; if(d.type!=='cache'||!Array.isArray(d.urls)) return;
  const ok=u=>{try{return CDN.includes(new URL(u).hostname);}catch(_){return false;}};
  e.waitUntil(caches.open(RUNTIME).then(c=>Promise.all(d.urls.filter(ok).map(u=>
    c.match(u,{ignoreVary:true}).then(hit=>hit||fetch(u).then(res=>{if(res.ok) return c.put(u,res);}).catch(()=>{}))))));
});
