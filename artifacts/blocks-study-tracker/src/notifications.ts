const OPTIN_KEY='blocks-notify-due-v1';
const FIRED_KEY='blocks-notify-last-fired-v1';

export type NotifyState='unsupported'|'default'|'granted'|'denied';

const supported=()=>typeof window!=='undefined'&&'Notification'in window;

export function notifyState():NotifyState{
 if(!supported())return 'unsupported';
 return Notification.permission as NotifyState;
}

export function dueNotificationsOn():boolean{
 try{return localStorage.getItem(OPTIN_KEY)==='1'}catch{return false}
}

export async function enableDueNotifications():Promise<boolean>{
 if(!supported())return false;
 if(Notification.permission==='default'){
  const result=await Notification.requestPermission();
  if(result!=='granted')return false;
 }
 if(Notification.permission!=='granted')return false;
 try{localStorage.setItem(OPTIN_KEY,'1')}catch{}
 return true;
}

export function disableDueNotifications():void{
 try{localStorage.setItem(OPTIN_KEY,'0')}catch{}
}

function shouldFire(today:string):boolean{
 try{return localStorage.getItem(FIRED_KEY)!==today}catch{return false}
}

function markFired(today:string):void{
 try{localStorage.setItem(FIRED_KEY,today)}catch{}
}

export function notifyDueToday(today:string,title:string,body:string):boolean{
 if(!dueNotificationsOn())return false;
 if(!supported()||Notification.permission!=='granted')return false;
 if(shouldFire(today))return false;
 markFired(today);
 try{new Notification(title,{body,tag:'blocks-due-today'})}catch{return false}
 return true;
}
