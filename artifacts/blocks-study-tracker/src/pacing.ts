import {addDays,daysBetween,fromISO} from './dates';
import {WEEK_TEMPLATE} from './seed';
import {priorityScore,schoolHas} from './priority';
import {sameName} from './sequence';
import type {Chapter,PendingTopic,SchoolSync,SubjectId} from './types';

export const STUDY_DAYS_PER_TOPIC=4;
const SUBJECT_PRIORITY:SubjectId[]=['maths','physics','chemistry','biology','english'];

export interface PacedTopic extends PendingTopic{plannedStart:string;estimatedDays:number;due:string;overridden:boolean;atRisk:boolean}

const subjectScheduledOn=(subject:SubjectId,date:string)=>Object.values(WEEK_TEMPLATE[fromISO(date).getDay()]).some(block=>block.subject===subject);

function nextScheduledDay(onOrAfter:string,subject:SubjectId):string{
 let cursor=onOrAfter;
 for(let i=0;i<14;i++){if(subjectScheduledOn(subject,cursor))return cursor;cursor=addDays(cursor,1)}
 return onOrAfter;
}

export function paceBacklog(pending:PendingTopic[],opts:{today:string;deadline:string;school?:SchoolSync;hardness?:Record<SubjectId,number>;order?:Partial<Record<SubjectId,string[]>>}):PacedTopic[]{
 const active=pending.filter(t=>!t.doneOn);
 const auto:PendingTopic[]=[],manual:PendingTopic[]=[];
 active.forEach(t=>{if(typeof t.plannedStart==='string')manual.push(t);else auto.push(t)});
 const scores=new Map(auto.map(t=>[t.id,priorityScore({subject:t.subject,unlearned:true,schoolDone:schoolHas(opts.school,t.subject,t.name),today:opts.today,examDate:opts.deadline,schoolDate:opts.school?.expected?.[t.subject],hardness:opts.hardness})]));
 const byScore=(a:PendingTopic,b:PendingTopic)=>(scores.get(b.id)??0)-(scores.get(a.id)??0);
 auto.sort((a,b)=>{
  const subjectRank=SUBJECT_PRIORITY.indexOf(a.subject)-SUBJECT_PRIORITY.indexOf(b.subject);
  if(subjectRank!==0)return subjectRank;
  const order=opts.order?.[a.subject];
  if(!order)return byScore(a,b);
  const rank=(topic:PendingTopic)=>{const i=order.findIndex(n=>sameName(n,topic.name));return i<0?order.length:i};
  const ra=rank(a),rb=rank(b);
  if(ra!==rb)return ra-rb;
  return byScore(a,b);
 });
 const windows:Record<string,{start:string;end:string}[]>={};
 const overridden:PacedTopic[]=manual.map(topic=>{
  const plannedStart=topic.plannedStart as string;
  const estimatedDays=Number.isInteger(topic.estimatedDays)&&(topic.estimatedDays as number)>=1?topic.estimatedDays as number:STUDY_DAYS_PER_TOPIC;
  const due=addDays(plannedStart,estimatedDays);
  (windows[topic.subject]??=[]).push({start:plannedStart,end:due});
  return {...topic,plannedStart,estimatedDays,due,overridden:true,atRisk:due>opts.deadline};
 });
 const cursor:Record<string,string>={};
 const paced:PacedTopic[]=auto.map(topic=>{
  const from=cursor[topic.subject]&&cursor[topic.subject]>opts.today?cursor[topic.subject]:opts.today;
  const subjectWindows=windows[topic.subject]??[];
  let plannedStart=nextScheduledDay(from,topic.subject);
  let due=addDays(plannedStart,STUDY_DAYS_PER_TOPIC);
  let clash=subjectWindows.find(window=>plannedStart<=window.end&&due>=window.start);
  while(clash){plannedStart=nextScheduledDay(addDays(clash.end,1),topic.subject);due=addDays(plannedStart,STUDY_DAYS_PER_TOPIC);clash=subjectWindows.find(window=>plannedStart<=window.end&&due>=window.start)}
  cursor[topic.subject]=addDays(due,1);
  return {...topic,plannedStart,estimatedDays:STUDY_DAYS_PER_TOPIC,due,overridden:false,atRisk:due>opts.deadline};
 });
 return [...paced,...overridden].sort((a,b)=>a.due.localeCompare(b.due));
}

export interface SyllabusProjection {projected:string;deadline:string;margin:number;ok:boolean;covered:boolean}

export function syllabusProjection(a:{pending:PendingTopic[];chapters:Chapter[];today:string;deadline:string}):SyllabusProjection{
 let latest:string|undefined;
 paceBacklog(a.pending,{today:a.today,deadline:a.deadline}).forEach(p=>{if(!latest||p.due>latest)latest=p.due});
 a.chapters.forEach(chapter=>chapter.revisions.forEach(revision=>{if(!revision.doneOn&&(!latest||revision.dueOn>latest))latest=revision.dueOn}));
 if(!latest)return{projected:a.today,deadline:a.deadline,margin:daysBetween(a.today,a.deadline),ok:true,covered:true};
 const projected=latest<a.today?a.today:latest;
 return{projected,deadline:a.deadline,margin:daysBetween(projected,a.deadline),ok:projected<=a.deadline,covered:false};
}

export function applyPendingOverride(topic:PendingTopic,patch:{plannedStart:string;estimatedDays:number}):PendingTopic{
 return {id:topic.id,subject:topic.subject,name:topic.name,...(topic.doneOn?{doneOn:topic.doneOn}:{}),plannedStart:patch.plannedStart,estimatedDays:patch.estimatedDays};
}

export function clearPendingOverride(topic:PendingTopic):PendingTopic{
 return {id:topic.id,subject:topic.subject,name:topic.name,...(topic.doneOn?{doneOn:topic.doneOn}:{})};
}
