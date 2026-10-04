import {Cloud,RefreshCw} from 'lucide-react';
import {syncConfigured,useSyncStore} from '../sync';

export function SyncChip({onOpen}:{onOpen:()=>void}){
 const phase=useSyncStore(state=>state.phase);
 const hasKey=useSyncStore(state=>state.hasKey);
 if(!syncConfigured()||!hasKey||phase==='off')return null;
 const label=phase==='syncing'?'SYNCING':phase==='error'?'SYNC ERROR':phase==='synced'?'SYNCED':'SYNC';
 const color=phase==='error'?'var(--overdue)':phase==='synced'?'var(--biology)':'var(--due)';
 return <button className="brut-btn flex items-center gap-1 text-xs" style={{background:color,color:phase==='error'?'white':'var(--ink)'}} onClick={onOpen} data-testid="chip-sync-status">{phase==='syncing'?<RefreshCw size={15} strokeWidth={3}/>:<Cloud size={15} strokeWidth={3}/>} {label}</button>;
}
