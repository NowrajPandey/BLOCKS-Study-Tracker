import {LEGACY_SEED_PENDING_IDS} from './seed';
import type {PendingTopic,SubjectId} from './types';

export interface SetupChapterDraft {
 subject:SubjectId;
 name:string;
 finished:boolean;
 key:string;
}

export const pendingTopicKey=(subject:SubjectId,name:string)=>`${subject}:${name.trim().toLowerCase()}`;

export function inferPendingTopics(rows:SetupChapterDraft[]):PendingTopic[]{
 return rows.filter(row=>!row.finished&&row.name.trim()).map(row=>({id:`setup-${row.key}`,subject:row.subject,name:row.name.trim()}));
}

export function purgeLegacySeedPending(pending:PendingTopic[]):PendingTopic[]{
 return pending.filter(topic=>!(LEGACY_SEED_PENDING_IDS.includes(topic.id)&&!topic.doneOn));
}

export function buildBacklogDraft(args:{
 existing:PendingTopic[];
 inferred:PendingTopic[];
 added:PendingTopic[];
 removedKeys:Set<string>;
 chapterKeys?:Set<string>;
}):PendingTopic[]{
 const seen=new Set<string>();
 const result:PendingTopic[]=[];
 for(const topic of [...args.existing,...args.inferred,...args.added]){
  if(topic.doneOn)continue;
  const key=pendingTopicKey(topic.subject,topic.name);
  if(args.removedKeys.has(key)||seen.has(key))continue;
  if(args.chapterKeys?.has(key))continue;
  seen.add(key);
  result.push(topic);
 }
 return result;
}
