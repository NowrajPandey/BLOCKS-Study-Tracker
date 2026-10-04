import {useEffect,useState} from 'react';
import {Smartphone} from 'lucide-react';
import {canInstall,promptInstall,subscribeInstall} from '../install';

const DISMISS_KEY='blocks-install-dismissed-v1';

export function InstallBanner(){
 const [available,setAvailable]=useState(canInstall);
 const [hidden,setHidden]=useState(()=>{
  try{return localStorage.getItem(DISMISS_KEY)==='1'}catch{return false}
 });
 const [busy,setBusy]=useState(false);
 useEffect(()=>subscribeInstall(()=>setAvailable(canInstall())),[]);
 if(!available||hidden)return null;
 return <div className="brut-sm flex flex-wrap items-center gap-3 p-3" style={{background:'var(--due)'}} data-testid="banner-install"><Smartphone size={20} strokeWidth={3}/><p className="min-w-0 flex-1 font-bold">Install BLOCKS on this device — it opens full screen and keeps working offline.</p><button className="brut-btn bg-white text-xs" disabled={busy} onClick={()=>{setBusy(true);void promptInstall().finally(()=>setBusy(false))}} data-testid="button-install">INSTALL</button><button className="brut-btn text-xs" style={{background:'transparent',borderColor:'black'}} onClick={()=>{try{localStorage.setItem(DISMISS_KEY,'1')}catch{}setHidden(true)}} data-testid="button-install-dismiss">NOT NOW</button></div>;
}
