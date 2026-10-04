import {useState} from 'react';
import {AlertTriangle} from 'lucide-react';
import {useStore} from '../store';
import {REMIND_KEY,backupAgeDays,downloadBackup,lastBackupStamp,shouldRemind,writeStamp} from '../backup';

export function BackupReminder(){
 const exportAll=useStore(state=>state.exportAll);
 const [hidden,setHidden]=useState(false);
 if(hidden)return null;
 const now=Date.now();
 const last=lastBackupStamp();
 if(last===null)return null;
 const dismissed=Number(localStorage.getItem(REMIND_KEY)??0);
 if(!shouldRemind(last,now,dismissed))return null;
 const age=backupAgeDays(now)??0;
 return <div className="brut-sm flex flex-wrap items-center gap-3 p-3" style={{background:'var(--overdue)',color:'white'}} role="status" data-testid="banner-backup-reminder"><AlertTriangle size={20} strokeWidth={3}/><p className="min-w-0 flex-1 font-bold">It has been {age} days since your last file backup. Two minutes now beats losing a term of data.</p><button className="brut-btn bg-white text-xs" onClick={()=>{downloadBackup(exportAll());setHidden(true)}} data-testid="button-backup-reminder">SAVE BACKUP NOW</button><button className="brut-btn text-xs" style={{background:'transparent',borderColor:'white',color:'white'}} onClick={()=>{writeStamp(REMIND_KEY,now);setHidden(true)}} data-testid="button-backup-reminder-later">REMIND ME LATER</button></div>;
}
