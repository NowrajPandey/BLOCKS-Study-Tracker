import {addDays,buildRevisions,daysBetween} from './dates';
import type {Chapter,SubjectId} from './types';
const BACKLOG_ORDER:SubjectId[]=['chemistry','maths','physics','biology','english'];
export function scheduleBacklog(finished:{subject:SubjectId;name:string}[],start:string,end:string):Chapter[]{
 const sorted=[...finished].sort((a,b)=>BACKLOG_ORDER.indexOf(a.subject)-BACKLOG_ORDER.indexOf(b.subject));const n=sorted.length;if(!n)return[];
 const span=Math.max(daysBetween(start,end)+1,1);
 return sorted.map((c,i)=>{const r1=addDays(start,Math.floor(i*span/n)),anchor=addDays(r1,-1);return{id:crypto.randomUUID(),subject:c.subject,name:c.name,learnedOn:anchor,revisions:buildRevisions(anchor),pyqDone:false}})
}