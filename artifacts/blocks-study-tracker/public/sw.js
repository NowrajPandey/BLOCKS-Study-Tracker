const VERSION='v2';
const CACHE=`blocks-static-${VERSION}`;
const BASE=self.location.pathname.replace(/sw\.js$/,'');
const SHELL=['', 'manifest.webmanifest','blocks-icon.svg','favicon.svg'].map(p=>BASE+p);

const open=()=>caches.open(CACHE);

self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await open();
  await Promise.all(SHELL.map(async url=>{
   try{const response=await fetch(url,{cache:'reload'});if(response&&response.ok)await cache.put(url,response)}catch{}
  }));
  await self.skipWaiting();
 })());
});

self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('blocks-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});

async function navigate(event){
 const cache=await open();
 try{
  const fresh=await fetch(event.request);
  if(fresh&&fresh.ok){
   const copy=fresh.clone();
   await cache.put(BASE,copy);
  }
  return fresh;
 }catch(error){
  return (await cache.match(BASE))||Response.error();
 }
}

async function asset(event){
 const cache=await open();
 const cached=await cache.match(event.request);
 const network=fetch(event.request).then(response=>{
  if(response&&response.ok&&response.status===200&&response.type==='basic')cache.put(event.request,response.clone()).catch(()=>{});
  return response;
 }).catch(()=>undefined);
 if(cached)return cached;
 return (await network)||Response.error();
}

self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 if(new URL(request.url).origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(navigate(event));return}
 event.respondWith(asset(event));
});
