export const SNAPSHOT_DB='blocks-backup';
export const SNAPSHOT_STORE='snapshots';
export const MAX_SNAPSHOTS=30;
export const SNAPSHOT_INTERVAL_MS=5*60_000;
export const BACKUP_REMINDER_DAYS=14;
export const REMIND_COOLDOWN_MS=7*24*60*60_000;
export const INSTALL_KEY='blocks-installed-v1';
export const EXPORT_KEY='blocks-last-export-v1';
export const REMIND_KEY='blocks-backup-remind-v1';

export interface SnapshotMeta {t:string;bytes:number}

const canStore=()=>typeof indexedDB!=='undefined';

function openDb():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(SNAPSHOT_DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(SNAPSHOT_STORE))request.result.createObjectStore(SNAPSHOT_STORE,{keyPath:'t'})};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error??new Error('snapshot store unavailable'));
 });
}

export function shouldSnapshot(lastAt:number,now:number):boolean{
 return now-lastAt>=SNAPSHOT_INTERVAL_MS;
}

export function daysBetweenMs(from:number,to:number):number{
 return Math.floor((to-from)/86_400_000);
}

export function isBackupOverdue(lastBackupAt:number,now:number):boolean{
 return daysBetweenMs(lastBackupAt,now)>=BACKUP_REMINDER_DAYS;
}

export function shouldRemind(lastBackupAt:number,now:number,dismissedAt:number):boolean{
 if(!isBackupOverdue(lastBackupAt,now))return false;
 return now-dismissedAt>=REMIND_COOLDOWN_MS;
}

export async function saveSnapshot(json:string):Promise<void>{
 if(!canStore()||!json)return;
 const db=await openDb();
 const keys=await new Promise<IDBValidKey[]>((resolve,reject)=>{
  const tx=db.transaction(SNAPSHOT_STORE,'readwrite');
  const store=tx.objectStore(SNAPSHOT_STORE);
  store.put({t:new Date().toISOString(),json,bytes:new Blob([json]).size});
  const request=store.getAllKeys();
  const collected:{keys:IDBValidKey[]}={keys:[]};
  request.onsuccess=()=>{collected.keys=request.result};
  tx.oncomplete=()=>resolve(collected.keys);
  tx.onerror=()=>reject(tx.error??new Error('snapshot write failed'));
 });
 if(keys.length>MAX_SNAPSHOTS)await prune(db,keys);
}

async function prune(db:IDBDatabase,keys:IDBValidKey[]):Promise<void>{
 if(keys.length<=MAX_SNAPSHOTS)return;
 const oldest=[...keys].sort((a,b)=>String(a).localeCompare(String(b))).slice(0,keys.length-MAX_SNAPSHOTS);
 const tx=db.transaction(SNAPSHOT_STORE,'readwrite');
 oldest.forEach(key=>tx.objectStore(SNAPSHOT_STORE).delete(key));
 await new Promise<void>(resolve=>{tx.oncomplete=()=>resolve();tx.onerror=()=>resolve()});
}

export async function listSnapshots():Promise<SnapshotMeta[]>{
 if(!canStore())return[];
 const db=await openDb();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(SNAPSHOT_STORE,'readonly');
  const request=tx.objectStore(SNAPSHOT_STORE).getAll();
  request.onsuccess=()=>{
   const rows=(request.result as {t:string;json:string;bytes:number}[]).sort((a,b)=>b.t.localeCompare(a.t));
   resolve(rows.slice(0,MAX_SNAPSHOTS).map(row=>({t:row.t,bytes:row.bytes})));
  };
  request.onerror=()=>reject(request.error??new Error('snapshot read failed'));
 });
}

export async function loadSnapshot(t:string):Promise<string|null>{
 if(!canStore())return null;
 const db=await openDb();
 return new Promise(resolve=>{
  const tx=db.transaction(SNAPSHOT_STORE,'readonly');
  const request=tx.objectStore(SNAPSHOT_STORE).get(t);
  request.onsuccess=()=>resolve((request.result as {json:string}|undefined)?.json??null);
  request.onerror=()=>resolve(null);
 });
}

export async function deleteSnapshot(t:string):Promise<void>{
 if(!canStore())return;
 const db=await openDb();
 await new Promise<void>(resolve=>{
  const tx=db.transaction(SNAPSHOT_STORE,'readwrite');
  tx.objectStore(SNAPSHOT_STORE).delete(t);
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>resolve();
 });
}

export function readStamp(key:string):number|null{
 const raw=localStorage.getItem(key);
 if(!raw)return null;
 const value=Number(raw);
 return Number.isFinite(value)&&value>0?value:null;
}

export function writeStamp(key:string,now=Date.now()):void{
 try{localStorage.setItem(key,String(now))}catch{}
}

export function downloadBackup(json:string,label='blocks-backup'):void{
 const blob=new Blob([json],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const anchor=document.createElement('a');
 anchor.href=url;
 anchor.download=`${label}-${new Date().toLocaleDateString('en-CA')}.json`;
 document.body.appendChild(anchor);
 anchor.click();
 anchor.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 writeStamp(EXPORT_KEY);
}

export function lastBackupStamp():number|null{
 const exported=readStamp(EXPORT_KEY);
 const installed=readStamp(INSTALL_KEY);
 if(exported===null&&installed===null)return null;
 return Math.max(exported??0,installed??0);
}

export function backupAgeDays(now=Date.now()):number|null{
 const stamp=lastBackupStamp();
 return stamp===null?null:daysBetweenMs(stamp,now);
}

export function markInstall():void{
 if(readStamp(INSTALL_KEY)===null)writeStamp(INSTALL_KEY);
}

export const SNAPSHOT_DEBOUNCE_MS=5_000;

let watcherStarted=false;
let readJson:()=>string=()=>'';

export function startBackupWatcher():void{
 if(watcherStarted||!canStore())return;
 watcherStarted=true;
 let lastAt=0;
 let dirty=false;
 let timer:ReturnType<typeof setTimeout>|null=null;

 const flush=()=>{
  if(timer){clearTimeout(timer);timer=null}
  if(!shouldSnapshot(lastAt,Date.now()))return;
  dirty=false;
  lastAt=Date.now();
  void saveSnapshot(readJson()).catch(()=>undefined);
 };
 const schedule=()=>{
  if(timer)clearTimeout(timer);
  timer=setTimeout(flush,SNAPSHOT_DEBOUNCE_MS);
 };

 import('./store').then(({useStore})=>{
  readJson=()=>useStore.getState().exportAll();
  useStore.subscribe((state,previous)=>{
   if(state===previous)return;
   dirty=true;
   schedule();
  });
 }).catch(()=>undefined);

 window.addEventListener('pagehide',()=>{if(dirty)flush()});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dirty)flush()});
}

