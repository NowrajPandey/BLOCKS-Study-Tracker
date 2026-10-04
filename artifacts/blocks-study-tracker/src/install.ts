interface InstallPromptEvent extends Event {
 prompt():Promise<void>;
 userChoice:Promise<{outcome:'accepted'|'dismissed'}>;
}

type Listener=()=>void;

let deferred:InstallPromptEvent|null=null;
const listeners=new Set<Listener>();

function notify():void{
 listeners.forEach(listener=>listener());
}

if(typeof window!=='undefined'){
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();
  deferred=event as InstallPromptEvent;
  notify();
 });
 window.addEventListener('appinstalled',()=>{
  deferred=null;
  notify();
 });
}

export function canInstall():boolean{
 return deferred!==null;
}

export async function promptInstall():Promise<boolean>{
 if(!deferred)return false;
 const prompt=deferred;
 deferred=null;
 try{await prompt.prompt()}catch{return false}
 const choice=await prompt.userChoice.catch(()=>null);
 notify();
 return choice?.outcome==='accepted';
}

export function subscribeInstall(listener:Listener):()=>void{
 listeners.add(listener);
 return()=>listeners.delete(listener);
}
