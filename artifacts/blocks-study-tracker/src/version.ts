const listeners=new Set<()=>void>();
let ready=false;

export const updateReady=()=>ready;

export function subscribeUpdate(fn:()=>void):()=>void{
 listeners.add(fn);
 return()=>{listeners.delete(fn)};
}

function notify(){
 if(ready)return;
 ready=true;
 listeners.forEach(fn=>fn());
}

export function applyUpdate(){window.location.reload()}

export function watchForUpdates(){
 if(!('serviceWorker' in navigator))return;
 let controlled=Boolean(navigator.serviceWorker.controller);
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(controlled)notify();
  controlled=true;
 });
 navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then(registration=>{
  if(registration.waiting&&controlled)notify();
 }).catch(()=>undefined);
}

export function requestDurableStorage(){
 if(!navigator.storage?.persist)return;
 navigator.storage.persist().catch(()=>undefined);
}
