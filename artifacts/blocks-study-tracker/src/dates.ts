import type { Chapter,DayLog,Pass,RecallResult,Revision } from './types';
export const toISO=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const fromISO=(s:string)=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
export const todayISO=()=>toISO(new Date());
export const addDays=(s:string,n:number)=>{const d=fromISO(s);d.setDate(d.getDate()+n);return toISO(d)};
export const daysBetween=(a:string,b:string)=>Math.round((fromISO(b).getTime()-fromISO(a).getTime())/86400000);
export const mondayOf=(s:string)=>{const d=fromISO(s);d.setDate(d.getDate()-((d.getDay()+6)%7));return toISO(d)};
export const formatDate=(s:string,options:Intl.DateTimeFormatOptions={day:'numeric',month:'short'})=>fromISO(s).toLocaleDateString('en-IN',options);
export const GAPS:Record<Pass,number>={R1:1,R2:7,R3:21}; const ORDER:Pass[]=['R1','R2','R3'];
export const buildRevisions=(learnedOn:string):Revision[]=>ORDER.map(pass=>({pass,dueOn:addDays(learnedOn,GAPS[pass])}));
export function completeRevisionOn(revs:Revision[],pass:Pass,today:string,result:RecallResult='good'):Revision[]{
 const index=ORDER.indexOf(pass),next=ORDER[index+1],current=revs.find(r=>r.pass===pass);
 if(!current||current.doneOn)return revs;
 const attempts=[...(current.attempts??[]),{date:today,result}];
 if(result==='again')return revs.map(r=>r.pass===pass?{...r,lastResult:result,attempts,dueOn:addDays(today,1)}:r);
 const nextGap=next?GAPS[next]-GAPS[pass]:0;
 const followUpGap=result==='hard'?Math.max(2,Math.ceil(nextGap/2)):nextGap;
 return revs.map(r=>{
  if(r.pass===pass)return {...r,doneOn:today,lastResult:result,attempts};
  if(next&&r.pass===next&&!r.doneOn)return {...r,dueOn:addDays(today,followUpGap)};
  return r;
 });
}
export type RevStatus='done'|'overdue'|'due'|'future';
export const revStatus=(r:Revision,today:string):RevStatus=>r.doneOn?'done':r.dueOn<today?'overdue':r.dueOn===today?'due':'future';
export interface DueItem {chapter:Chapter;revision:Revision;status:'overdue'|'due'}
export function getDueItems(chapters:Chapter[],today:string):DueItem[]{const out:DueItem[]=[];chapters.forEach(ch=>ch.revisions.forEach(revision=>{const status=revStatus(revision,today);if(status==='overdue'||status==='due')out.push({chapter:ch,revision,status})}));return out.sort((a,b)=>a.status!==b.status?(a.status==='overdue'?-1:1):ORDER.indexOf(a.revision.pass)-ORDER.indexOf(b.revision.pass)||a.revision.dueOn.localeCompare(b.revision.dueOn))}
export function missedYesterday(days:Record<string,DayLog>,today:string,appStart:string){const y=addDays(today,-1);if(y<appStart)return false;const d=days[y];return !d||(!Object.values(d.blocksDone).some(Boolean)&&!d.minimumDone.maths&&!d.minimumDone.revision)}