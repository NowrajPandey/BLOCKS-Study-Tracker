import {addDays,daysBetween,todayISO} from './dates';
import type {PendingTopic,SubjectId} from './types';

export const DEFAULT_ESTIMATED_DAYS=4;
export const DEFAULT_BUFFER_DAYS=2;

export function replanPendingTopic(topic:PendingTopic,patch:Partial<Pick<PendingTopic,'plannedStart'|'estimatedDays'|'bufferDays'>>,today=todayISO()):PendingTopic{
 const plannedStart=patch.plannedStart??topic.plannedStart??today;
 const estimatedDays=patch.estimatedDays??topic.estimatedDays??DEFAULT_ESTIMATED_DAYS;
 const bufferDays=patch.bufferDays??topic.bufferDays??DEFAULT_BUFFER_DAYS;
 return {...topic,plannedStart,estimatedDays,bufferDays,due:addDays(plannedStart,estimatedDays+bufferDays)};
}

export function normalizePendingTopics(topics:Array<Partial<PendingTopic>&Pick<PendingTopic,'id'|'subject'|'name'|'due'>>,today=todayISO()):PendingTopic[]{
 return topics.map(topic=>{
  const hasPlan=typeof topic.plannedStart==='string'&&Number.isInteger(topic.estimatedDays)&&Number.isInteger(topic.bufferDays);
  if(topic.doneOn&&!hasPlan)return {...topic} as PendingTopic;
  const plannedStart=topic.plannedStart??today;
  const estimatedDays=topic.estimatedDays??DEFAULT_ESTIMATED_DAYS;
  const bufferDays=topic.bufferDays??DEFAULT_BUFFER_DAYS;
  return {...topic,plannedStart,estimatedDays,bufferDays,due:hasPlan?topic.due:addDays(plannedStart,estimatedDays+bufferDays)} as PendingTopic;
 });
}

export interface SetupChapterDraft {
 subject:SubjectId;
 name:string;
 finished:boolean;
 key:string;
}

export const pendingTopicKey=(subject:SubjectId,name:string)=>`${subject}:${name.trim().toLowerCase()}`;

export function inferPendingTopics(rows:SetupChapterDraft[],start:string,end:string):PendingTopic[]{
 const unfinished=rows.filter(row=>!row.finished&&row.name.trim());
 const span=Math.max(0,daysBetween(start,end));
 return unfinished.map((row,index)=>{
  const plannedStart=addDays(start,unfinished.length<2?0:Math.round(index*span/(unfinished.length-1)));
  return {id:`setup-${row.key}`,subject:row.subject,name:row.name.trim(),plannedStart,estimatedDays:DEFAULT_ESTIMATED_DAYS,bufferDays:DEFAULT_BUFFER_DAYS,due:addDays(plannedStart,DEFAULT_ESTIMATED_DAYS+DEFAULT_BUFFER_DAYS)};
 });
}

export function mergeSetupPending(args:{
 existing:PendingTopic[];
 inferred:PendingTopic[];
 added:PendingTopic[];
 removedKeys:Set<string>;
  startOverrides:Record<string,string>;
  estimateOverrides:Record<string,number>;
  bufferOverrides:Record<string,number>;
}):PendingTopic[]{
 const seen=new Set<string>();
 const result:PendingTopic[]=[];
 for(const topic of [...args.existing,...args.inferred,...args.added]){
  if(topic.doneOn)continue;
  const key=pendingTopicKey(topic.subject,topic.name);
  if(args.removedKeys.has(key)||seen.has(key))continue;
  seen.add(key);
   result.push(replanPendingTopic(topic,{
    plannedStart:args.startOverrides[key],
    estimatedDays:args.estimateOverrides[key],
    bufferDays:args.bufferOverrides[key]
   }));
 }
 return result;
}