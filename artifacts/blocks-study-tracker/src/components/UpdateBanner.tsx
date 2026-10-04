import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {applyUpdate,subscribeUpdate,updateReady} from '../version';

export function UpdateBanner(){
 const [ready,setReady]=useState(updateReady());
 useEffect(()=>subscribeUpdate(()=>setReady(true)),[]);
 if(!ready)return null;
 return <div className="fixed inset-x-3 bottom-[78px] z-40 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-auto" role="status" data-testid="banner-update"><div className="brut flex flex-wrap items-center gap-3 bg-[var(--due)] p-3"><p className="font-bold">A new version is ready.</p><button className="brut-btn bg-white text-xs" onClick={applyUpdate} data-testid="button-reload-update"><RefreshCw size={16} strokeWidth={3}/> RELOAD</button></div></div>;
}
