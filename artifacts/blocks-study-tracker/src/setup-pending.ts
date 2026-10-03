import {addDays,daysBetween} from './dates';
import type {PendingTopic,SubjectId} from './types';

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
 return unfinished.map((row,index)=>({
  id:`setup-${row.key}`,
  subject:row.subject,
  name:row.name.trim(),
  due:addDays(start,unfinished.length<2?0:Math.round(index*span/(unfinished.length-1)))
 }));
}

export function mergeSetupPending(args:{
 existing:PendingTopic[];
 inferred:PendingTopic[];
 added:PendingTopic[];
 removedKeys:Set<string>;
 dueOverrides:Record<string,string>;
}):PendingTopic[]{
 const seen=new Set<string>();
 const result:PendingTopic[]=[];
 for(const topic of [...args.existing,...args.inferred,...args.added]){
  if(topic.doneOn)continue;
  const key=pendingTopicKey(topic.subject,topic.name);
  if(args.removedKeys.has(key)||seen.has(key))continue;
  seen.add(key);
  result.push({...topic,due:args.dueOverrides[key]??topic.due});
 }
 return result;
}