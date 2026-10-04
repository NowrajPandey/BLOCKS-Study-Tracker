import {useEffect,useState} from 'react';
import {History} from 'lucide-react';
import {Button} from './Brut';
import {formatDate} from '../dates';
import {EXPORT_KEY,backupAgeDays,deleteSnapshot,listSnapshots,loadSnapshot,writeStamp} from '../backup';
import type {SnapshotMeta} from '../backup';

export function SnapshotsPanel({onRestore}:{onRestore:(json:string)=>void}){
 const [rows,setRows]=useState<SnapshotMeta[]>([]);
 const [notice,setNotice]=useState('');
 const [ageDays,setAgeDays]=useState<number|null>(null);

 const refresh=()=>{
  listSnapshots().then(items=>setRows(items)).catch(()=>setRows([]));
  setAgeDays(backupAgeDays());
 };
 useEffect(refresh,[]);

 const restore=(snapshot:SnapshotMeta)=>{
  if(!window.confirm(`Restore the automatic snapshot from ${formatDate(snapshot.t,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}?`))return;
  void loadSnapshot(snapshot.t).then(json=>{
   if(!json){setNotice('That snapshot could not be read.');return}
   onRestore(json);
   setNotice('Snapshot restored and queued to sync.');
  }).catch(()=>setNotice('That snapshot could not be read.'));
 };

 const drop=async(snapshot:SnapshotMeta)=>{
  if(!window.confirm('Delete this snapshot?'))return;
  await deleteSnapshot(snapshot.t);
  refresh();
 };

 return <div className="mt-4 space-y-3">
  <div className="brut-sm flex flex-wrap items-center gap-3 p-3" style={{background:'var(--biology)'}} data-testid="card-backup-status">
   <History size={20} strokeWidth={3}/>
   <span className="mono text-xs font-bold" data-testid="text-backup-age">{ageDays===null?'NO FILE BACKUP RECORDED':ageDays===0?'FILE BACKUP TODAY':`FILE BACKUP ${ageDays}D AGO`}</span>
   <div className="flex-1"/>
   <span className="mono text-xs font-bold" data-testid="text-snapshot-count">{rows.length} LOCAL SNAPSHOTS</span>
  </div>
  <p className="text-sm">BLOCKS writes a local snapshot of everything every few minutes and keeps the last 30. If an update, a reset or a bad merge ever wrecks your data, restore one here. Snapshots live in this browser only — the file backup is what survives losing this device.</p>
  {!rows.length
   ? <p className="mono border-2 border-black bg-white p-3 text-xs" data-testid="text-snapshot-empty">NO SNAPSHOTS YET. ONE IS WRITTEN WITHIN A FEW MINUTES OF YOUR FIRST CHANGE.</p>
   : <div className="space-y-1">{rows.map(snapshot=><div className="flex flex-wrap items-center gap-2 border-2 border-black bg-white p-2" key={snapshot.t} data-testid={`snapshot-${snapshot.t}`}><span className="mono flex-1 text-xs">{formatDate(snapshot.t,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · {Math.max(Math.round(snapshot.bytes/1024),1)} KB</span><Button variant="ghost" onClick={()=>restore(snapshot)} data-testid={`button-restore-snapshot-${snapshot.t}`}>RESTORE</Button><Button variant="ghost" onClick={()=>void drop(snapshot)} data-testid={`button-delete-snapshot-${snapshot.t}`}>DELETE</Button></div>)}</div>}
  {notice&&<p className="mono text-xs" role="status" data-testid="text-snapshot-notice">{notice}</p>}
  <p className="mono text-xs">ALREADY SAVED THE FILE YOURSELF? <button className="underline" onClick={()=>{writeStamp(EXPORT_KEY);refresh()}} data-testid="button-mark-backup-done">MARK IT DONE</button></p>
 </div>;
}
