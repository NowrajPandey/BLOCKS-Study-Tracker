import {useState} from 'react';
import {Bell,BellOff} from 'lucide-react';
import {Button} from './Brut';
import {disableDueNotifications,dueNotificationsOn,enableDueNotifications,notifyState} from '../notifications';
import type {NotifyState} from '../notifications';

export function NotifyPanel(){
 const [permission,setPermission]=useState<NotifyState>(notifyState);
 const [on,setOn]=useState(()=>dueNotificationsOn()&&notifyState()==='granted');
 const [busy,setBusy]=useState(false);

 const enable=async()=>{
  setBusy(true);
  const ok=await enableDueNotifications();
  setBusy(false);
  setPermission(notifyState());
  setOn(ok);
 };
 const disable=()=>{
  disableDueNotifications();
  setOn(false);
 };

 if(permission==='unsupported')return <p className="mono border-2 border-black bg-white p-3 text-sm" data-testid="text-notify-unsupported">THIS BROWSER DOES NOT SUPPORT NOTIFICATIONS.</p>;
 return <div className="mt-4 space-y-3">
  <div className="brut-sm flex flex-wrap items-center gap-3 p-3" style={{background:on?'var(--biology)':'white'}} data-testid="card-notify-status">
   {on?<Bell size={20} strokeWidth={3}/>:<BellOff size={20} strokeWidth={3}/>}
   <span className="mono text-xs font-bold" data-testid="text-notify-status">{on?'DUE-TODAY REMINDERS ON':permission==='denied'?'BLOCKED BY THE BROWSER':permission==='granted'?'REMINDERS OFF':'REMINDERS OFF'}</span>
   <div className="flex-1"/>
   {permission==='denied'
    ? <span className="mono text-xs">UNBLOCK NOTIFICATIONS FOR THIS SITE IN YOUR BROWSER SETTINGS.</span>
    : on
     ? <Button variant="ghost" onClick={disable} data-testid="button-notify-off">TURN OFF</Button>
     : <Button onClick={()=>void enable()} disabled={busy} data-testid="button-notify-on">{busy?'ASKING…':'TURN ON'}</Button>}
  </div>
  <p className="text-sm">When you open BLOCKS, one notification lists what is actually due today — overdue revisions and anything you promised to hand in. It fires at most once a day and only when there is something real to do.</p>
 </div>;
}
