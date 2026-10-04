import {useEffect,useState} from 'react';
import {Copy,Link2,RefreshCw,Trash2} from 'lucide-react';
import {Button} from './Brut';
import {formatDate} from '../dates';
import {fetchHistory,maskedKey,pairDevice,restoreHistory,startSync,stopSync,syncConfigured,useSyncStore} from '../sync';
import type {HistoryEntry} from '../sync';

function relTime(at:number|null):string{
 if(!at)return '';
 const minutes=Math.floor((Date.now()-at)/60_000);
 if(minutes<1)return 'just now';
 if(minutes<60)return `${minutes}m ago`;
 const hours=Math.floor(minutes/60);
 if(hours<24)return `${hours}h ago`;
 return `${Math.floor(hours/24)}d ago`;
}

export function SyncPanel(){
 const {phase,lastSyncedAt,error,hasKey,device}=useSyncStore();
 const [pairing,setPairing]=useState(false);
 const [pasted,setPasted]=useState('');
 const [copied,setCopied]=useState(false);
 const [notice,setNotice]=useState('');
 const [history,setHistory]=useState<HistoryEntry[]>([]);

 const loadHistory=()=>{fetchHistory().then(rows=>setHistory(rows)).catch(()=>setHistory([]))};
 useEffect(()=>{if(hasKey&&syncConfigured())loadHistory()},[hasKey]);

 if(!syncConfigured()){
  return <p className="mono border-2 border-black bg-white p-3 text-sm" data-testid="text-sync-unconfigured">CLOUD SYNC IS NOT CONFIGURED FOR THIS BUILD. SET VITE_SUPABASE_URL AND VITE_SUPABASE_ANON_KEY WHEN BUILDING, AND RUN supabase/sync.sql ONCE — SEE README.</p>;
 }

 const status=phase==='syncing'?'SYNCING…':phase==='error'?`SYNC ERROR`:phase==='synced'?`SYNCED ${relTime(lastSyncedAt)}`:phase==='off'?'NOT SET UP':'READY';
 const statusColor=phase==='error'?'var(--overdue)':phase==='synced'?'var(--biology)':phase==='syncing'?'var(--due)':'white';

 const copyKey=async()=>{
  const config=localStorage.getItem('blocks-study-sync-config-v1');
  if(!config)return;
  const key=(JSON.parse(config) as {key:string}).key;
  try{await navigator.clipboard.writeText(key);setCopied(true);window.setTimeout(()=>setCopied(false),1500)}catch{setNotice('Copy failed — reveal the key and copy it manually.')}
 };

 const doPair=()=>{
  if(!pairDevice(pasted)){setNotice('That does not look like a sync key. It is 32 hex characters.');return}
  setNotice('Paired. Pulling your data now…');setPasted('');
  window.setTimeout(loadHistory,1200);
 };

 const doRestore=async(entry:HistoryEntry)=>{
  if(!window.confirm(`Restore the state saved ${formatDate(entry.createdAt,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}?`))return;
  setNotice('Restoring…');
  const ok=await restoreHistory(entry.id).catch(()=>false);
  setNotice(ok?'Restored, and pushed to your other devices.':'Restore failed. Your current data is untouched.');
  if(ok)loadHistory();
 };

 return <div className="mt-4 space-y-3">
  <div className="brut-sm flex flex-wrap items-center gap-3 p-3" style={{background:statusColor}} data-testid="card-sync-status">
   <span className="mono border-2 border-black bg-white px-2 py-1 text-xs font-bold" data-testid="text-sync-status">{status}</span>
   {device&&<span className="mono text-xs font-bold" data-testid="text-sync-device">{device}</span>}
   <div className="flex-1"/>
   {hasKey&&<Button variant="ghost" onClick={()=>{setNotice('');startSync()}} data-testid="button-sync-now"><RefreshCw size={16} strokeWidth={3}/> SYNC NOW</Button>}
  </div>
  {error&&<p className="mono border-2 border-black bg-[var(--overdue)] p-2 text-xs text-white" role="alert" data-testid="text-sync-error">{error}</p>}

  {!hasKey
   ? <div className="brut-sm p-3"><p className="font-bold">Turn on cloud sync.</p><p className="mt-1 text-sm">This creates a private key on this device. Paste that key on your other device and both copies stay identical — losing this browser then loses nothing.</p><Button className="mt-3" onClick={()=>{setNotice('');startSync()}} data-testid="button-sync-enable"><Link2 size={17} strokeWidth={3}/> TURN ON SYNC</Button></div>
   : <div className="brut-sm space-y-3 p-3"><div className="flex flex-wrap items-center gap-2"><span className="mono text-xs font-bold">THIS DEVICE’S KEY</span><code className="mono border-2 border-black bg-white px-2 py-1 text-xs" data-testid="text-sync-key">{maskedKey()}</code><Button variant="ghost" onClick={()=>void copyKey()} data-testid="button-copy-sync-key">{copied?<><Copy size={15} strokeWidth={3}/> COPIED</>:<><Copy size={15} strokeWidth={3}/> COPY</>}</Button></div>
   <p className="mono text-xs">KEEP IT PRIVATE — ANYONE WITH THIS KEY READS AND WRITES YOUR DATA.</p>
   {!pairing
    ? <Button variant="ghost" onClick={()=>setPairing(true)} data-testid="button-pair-open">PAIR ANOTHER DEVICE</Button>
    : <div className="flex flex-wrap items-end gap-2"><label className="flex-1"><span className="mono text-xs font-bold">PASTE THE KEY FROM YOUR OTHER DEVICE</span><input className="w-full" value={pasted} onChange={e=>setPasted(e.target.value)} placeholder="32 hex characters" data-testid="input-pair-key"/></label><Button onClick={doPair} data-testid="button-pair-save">PAIR</Button><Button variant="ghost" onClick={()=>{setPairing(false);setPasted('')}} data-testid="button-pair-cancel">CANCEL</Button></div>}
   <div className="flex flex-wrap gap-2 border-t-2 border-black pt-3"><Button variant="danger" onClick={()=>{if(window.confirm('Turn sync off on this device? Your local data stays exactly as it is.'))stopSync()}} data-testid="button-sync-off"><Trash2 size={16} strokeWidth={3}/> TURN SYNC OFF</Button></div></div>}

  {hasKey&&<div className="brut-sm p-3"><div className="flex items-center justify-between gap-2"><span className="mono text-xs font-bold">ROLLBACK HISTORY</span><Button variant="ghost" onClick={loadHistory} data-testid="button-sync-history">REFRESH</Button></div>{!history.length?<p className="mt-2 text-sm">Nothing yet. History appears after your devices have synced a few changes.</p>:<div className="mt-2 space-y-1">{history.map(entry=><div className="flex flex-wrap items-center gap-2 border-2 border-black bg-white p-2" key={entry.id} data-testid={`sync-history-${entry.id}`}><span className="mono flex-1 text-xs">{formatDate(entry.createdAt,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · {entry.device}</span><Button variant="ghost" onClick={()=>void doRestore(entry)} data-testid={`button-sync-restore-${entry.id}`}>RESTORE</Button></div>)}</div>}</div>}

  {notice&&<p className="mono text-xs" role="status" data-testid="text-sync-notice">{notice}</p>}
 </div>;
}
