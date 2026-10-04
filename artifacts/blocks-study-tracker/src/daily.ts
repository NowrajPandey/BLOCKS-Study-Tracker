import {addDays,daysBetween} from './dates';
import {SUBJECT_ORDER} from './seed';
import type {Chapter,Revision,SubjectId} from './types';

export interface QueuedRevision {chapter:Chapter;revision:Revision;dueOn:string;scheduledOn:string;status:'overdue'|'due'|'queued'}
export interface RevisionDay {date:string;items:QueuedRevision[]}
export interface RevisionPlan {today:QueuedRevision[];schedule:RevisionDay[];daysToClear:number}

const PASS_ORDER:Record<string,number>={R1:0,R2:1,R3:2};

function byAge(a:{chapter:Chapter;revision:Revision},b:{chapter:Chapter;revision:Revision}){
 return a.revision.dueOn.localeCompare(b.revision.dueOn)||PASS_ORDER[a.revision.pass]-PASS_ORDER[b.revision.pass]||SUBJECT_ORDER.indexOf(a.chapter.subject)-SUBJECT_ORDER.indexOf(b.chapter.subject)||a.chapter.name.localeCompare(b.chapter.name);
}

export function planRevisions(chapters:Chapter[],today:string,horizonDays=7):RevisionPlan{
 const queue:{chapter:Chapter;revision:Revision}[]=[];
 const byDue=new Map<string,{chapter:Chapter;revision:Revision}[]>();
 chapters.forEach(chapter=>chapter.revisions.forEach(revision=>{
  if(revision.doneOn)return;
  if(revision.dueOn<=today)queue.push({chapter,revision});
  else{const list=byDue.get(revision.dueOn)??[];list.push({chapter,revision});byDue.set(revision.dueOn,list)}
 }));
 queue.sort(byAge);
 const assigned:QueuedRevision[]=[];
 const end=addDays(today,horizonDays);
 let cursor=today;
 while(cursor<=end){
  const falling=(byDue.get(cursor)??[]).sort(byAge);
  if(falling.length){queue.push(...falling);byDue.delete(cursor)}
  const capacity=queue.some(item=>item.revision.dueOn<cursor)?2:1;
  for(let i=0;i<capacity&&queue.length;i++){
   const item=queue.shift()!;
   assigned.push({...item,dueOn:item.revision.dueOn,scheduledOn:cursor,status:cursor===today?(item.revision.dueOn<today?'overdue':'due'):'queued'});
  }
  cursor=addDays(cursor,1);
 }
 const schedule:RevisionDay[]=[];
 assigned.forEach(item=>{
  if(item.scheduledOn===today)return;
  const day=schedule.find(x=>x.date===item.scheduledOn);
  if(day)day.items.push(item);
  else schedule.push({date:item.scheduledOn,items:[item]});
 });
 const daysToClear=schedule.length?daysBetween(today,schedule[schedule.length-1].date):0;
 return{today:assigned.filter(item=>item.scheduledOn===today),schedule,daysToClear};
}

export function filterForPaper(plan:RevisionPlan,subject:SubjectId):QueuedRevision[]{
 return plan.today.filter(item=>item.chapter.subject===subject);
}
