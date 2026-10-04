import {create} from 'zustand';
import {mergeStates,same} from './merge';
import {useStore} from './store';

export const CONFIG_KEY='blocks-study-sync-config-v1';
const BASE_KEY='blocks-study-sync-base-v1';
export const OVERRIDE_KEY='blocks-override-v1';
export const PUSH_DEBOUNCE_MS=5_000;
export const PULL_INTERVAL_MS=15_000;

const supabaseUrl=(import.meta.env.VITE_SUPABASE_URL??'').replace(/\/+$/,'');
const supabaseAnon=import.meta.env.VITE_SUPABASE_ANON_KEY??'';

export type SyncPhase='off'|'idle'|'syncing'|'synced'|'error';
export interface SyncConfig {key:string;device:string;createdAt:number}
export interface HistoryEntry {id:string;createdAt:string;device:string}

export const syncConfigured=()=>Boolean(supabaseUrl&&supabaseAnon);

export const useSyncStore=create<{phase:SyncPhase;lastSyncedAt:number|null;error:string;hasKey:boolean;device:string}>(()=>({phase:'off',lastSyncedAt:null,error:'',hasKey:false,device:''}));

function readConfig():SyncConfig|null{
 try{
  const raw=localStorage.getItem(CONFIG_KEY);
  if(!raw)return null;
  const parsed=JSON.parse(raw) as Partial<SyncConfig>;
  if(typeof parsed.key!=='string'||!parsed.key)return null;
  return{key:parsed.key,device:parsed.device??deviceLabel(),createdAt:parsed.createdAt??Date.now()};
 }catch{return null}
}

function writeConfig(config:SyncConfig|null){
 try{
  if(config)localStorage.setItem(CONFIG_KEY,JSON.stringify(config));
  else localStorage.removeItem(CONFIG_KEY);
 }catch{}
 refreshSyncMeta();
}

export function generateSyncKey():string{
 const bytes=new Uint8Array(16);
 crypto.getRandomValues(bytes);
 return [...bytes].map(value=>value.toString(16).padStart(2,'0')).join('');
}

export function deviceLabel():string{
 const kind=typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches?'Phone':'Computer';
 const bytes=new Uint8Array(2);
 crypto.getRandomValues(bytes);
 return `${kind} ${[...bytes].map(value=>value.toString(16).padStart(2,'0')).join('')}`;
}

export function refreshSyncMeta(){
 const config=readConfig();
 useSyncStore.setState({hasKey:Boolean(config),device:config?.device??'',phase:config?(useSyncStore.getState().phase==='off'?'idle':useSyncStore.getState().phase):'off'});
}

export function startSync(){
 const existing=readConfig();
 writeConfig(existing??{key:generateSyncKey(),device:deviceLabel(),createdAt:Date.now()});
 void syncNow({pull:true});
}

export function stopSync(){
 writeConfig(null);
 try{localStorage.removeItem(BASE_KEY)}catch{}
 useSyncStore.setState({phase:'off',lastSyncedAt:null,error:''});
}

export function pairDevice(key:string){
 const clean=key.trim().replace(/\s+/g,'');
 if(!/^[0-9a-f]{32}$/i.test(clean))return false;
 writeConfig({key:clean.toLowerCase(),device:deviceLabel(),createdAt:Date.now()});
 void syncNow({pull:true});
 return true;
}

export function maskedKey():string{
 const config=readConfig();
 if(!config)return '';
 return `${config.key.slice(0,4)}••••••••${config.key.slice(-4)}`;
}

export function markOverride(){
 try{localStorage.setItem(OVERRIDE_KEY,String(Date.now()))}catch{}
}

function readBase():Record<string,unknown>|null{
 try{
  const raw=localStorage.getItem(BASE_KEY);
  return raw?(JSON.parse(raw) as Record<string,unknown>):null;
 }catch{return null}
}

function writeBase(state:Record<string,unknown>){
 try{localStorage.setItem(BASE_KEY,JSON.stringify(state))}catch{}
}

function forcedByUser():boolean{
 const stamp=Number(localStorage.getItem(OVERRIDE_KEY)??0);
 const synced=useSyncStore.getState().lastSyncedAt??readBaseStamp();
 return Number.isFinite(stamp)&&stamp>0&&stamp>synced;
}

function readBaseStamp():number{
 const config=readConfig();
 if(!config)return 0;
 return config.createdAt;
}

async function rpc<T>(fn:string,args:Record<string,unknown>,keepalive=false):Promise<T>{
 const response=await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`,{
  method:'POST',
  keepalive,
  headers:{'Content-Type':'application/json',apikey:supabaseAnon,Authorization:`Bearer ${supabaseAnon}`},
  body:JSON.stringify(args)
 });
 if(!response.ok)throw new Error(`${fn} failed (${response.status})`);
 const text=await response.text();
 return (text?JSON.parse(text):undefined) as T;
}

function localState():Record<string,unknown>{
 return JSON.parse(useStore.getState().exportAll()) as Record<string,unknown>;
}

let suppress=false;
let running=false;
let lastPullAt=0;
let timer:ReturnType<typeof setTimeout>|null=null;
let dirty=false;
let pulledOnce=false;
let remoteState:Record<string,unknown>|null=null;

async function pullRemote(key:string,keepalive:boolean):Promise<Record<string,unknown>|null>{
 const rows=await rpc<Record<string,unknown>[]|null>('sync_pull',{p_key:key},keepalive);
 lastPullAt=Date.now();
 pulledOnce=true;
 if(!Array.isArray(rows)||rows.length===0){remoteState=null;return null}
 const first=rows[0] as {state?:Record<string,unknown>}|undefined;
 remoteState=first?.state??null;
 return remoteState;
}

export async function syncNow(options:{pull?:boolean;keepalive?:boolean}={}){
 const config=readConfig();
 if(!syncConfigured()||!config){refreshSyncMeta();return}
 if(running)return;
 running=true;
 suppress=true;
 useSyncStore.setState({phase:'syncing',error:''});
 try{
  const force=forcedByUser();
  const keepalive=Boolean(options.keepalive);
  const stale=Date.now()-lastPullAt>PULL_INTERVAL_MS;
  if(!force&&options.pull!==false&&(!pulledOnce||keepalive||stale)){
   await pullRemote(config.key,keepalive);
  }
  let target=localState();
  if(!force&&pulledOnce&&remoteState){
   const merged=mergeStates(readBase(),target,remoteState);
   if(!same(merged,target)){
    useStore.getState().importAll(JSON.stringify(merged));
    target=merged;
   }
   if(same(target,remoteState)){
    writeBase(target);
    useSyncStore.setState({phase:'synced',lastSyncedAt:Date.now(),error:''});
    return;
   }
  }
  await rpc<string>('sync_push',{p_key:config.key,p_state:target,p_device:config.device},keepalive);
  writeBase(target);
  try{localStorage.removeItem(OVERRIDE_KEY)}catch{}
  useSyncStore.setState({phase:'synced',lastSyncedAt:Date.now(),error:''});
 }catch(error){
  useSyncStore.setState({phase:'error',error:error instanceof Error?error.message:'Sync failed'});
 }finally{
  running=false;
  suppress=false;
 }
}

function schedule(){
 if(timer)clearTimeout(timer);
 timer=setTimeout(()=>{
  timer=null;
  if(!dirty)return;
  dirty=false;
  void syncNow({pull:true});
 },PUSH_DEBOUNCE_MS);
}

export function startSyncWatcher(){
 refreshSyncMeta();
 useStore.subscribe((state,previous)=>{
  if(state===previous||suppress)return;
  dirty=true;
  schedule();
 });
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&dirty){dirty=false;void syncNow({pull:true,keepalive:true})}
 });
 window.addEventListener('pagehide',()=>{
  if(dirty){dirty=false;void syncNow({pull:true,keepalive:true})}
 });
 if(syncConfigured()&&readConfig())void syncNow({pull:true});
}

export async function fetchHistory():Promise<HistoryEntry[]>{
 const config=readConfig();
 if(!config||!syncConfigured())return[];
 const rows=await rpc<{id:number;created_at:string;device:string}[]|null>('sync_history',{p_key:config.key,p_limit:20});
 return (rows??[]).map(row=>({id:String(row.id),createdAt:row.created_at,device:row.device??''}));
}

export async function restoreHistory(id:string):Promise<boolean>{
 const config=readConfig();
 if(!config||!syncConfigured())return false;
 const state=await rpc<Record<string,unknown>|null>('sync_history_get',{p_key:config.key,p_id:Number(id)});
 if(!state||typeof state!=='object')return false;
 useStore.getState().importAll(JSON.stringify(state));
 markOverride();
 await syncNow({pull:false});
 return true;
}
