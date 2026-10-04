import {daysBetween} from './dates';
import {CORE_SUBJECTS} from './seed';
import type {BlockId,PendingTopic,SchoolSync,SubjectId} from './types';
import type {BlockPlan} from './seed';

export const DEFAULT_HARDNESS:Record<SubjectId,number>={maths:1,physics:.9,chemistry:.8,biology:.6,english:.4};
export const IMPORTANCE:Record<SubjectId,number>={physics:1,chemistry:1,maths:1,biology:1,english:.4};

export interface PriorityInput {subject:SubjectId;unlearned:boolean;schoolDone:boolean;today:string;examDate:string;schoolDate?:string;hardness?:Record<SubjectId,number>}

export function schoolHas(sync:SchoolSync|undefined,subject:SubjectId,name:string):boolean{
 const key=name.trim().toLowerCase();
 return (sync?.done[subject]??[]).some(n=>n.trim().toLowerCase()===key);
}

export function priorityScore(a:PriorityInput):number{
 if(a.schoolDone)return 0;
 const hardness=a.hardness?.[a.subject]??DEFAULT_HARDNESS[a.subject];
 const B=a.unlearned?1:0,H=hardness,I=IMPORTANCE[a.subject];
 const gap=daysBetween(a.today,a.examDate)-daysBetween(a.today,a.schoolDate??a.examDate);
 return (B*H*I)+gap;
}

export function subjectPressure(subject:SubjectId,a:{pending:PendingTopic[];today:string;deadline:string;school?:SchoolSync;hardness?:Record<SubjectId,number>}):number{
 let sum=0;
 for(const topic of a.pending){
  if(topic.subject!==subject||topic.doneOn)continue;
  sum+=priorityScore({subject,unlearned:true,schoolDone:schoolHas(a.school,subject,topic.name),today:a.today,examDate:a.deadline,schoolDate:a.school?.expected?.[subject],hardness:a.hardness});
 }
 return sum;
}

export function allocateBlocks(plan:Record<BlockId,BlockPlan>,a:{pending:PendingTopic[];today:string;deadline:string;school?:SchoolSync;hardness?:Record<SubjectId,number>}):Record<BlockId,BlockPlan>{
 if(plan.A.subject==='test')return plan;
 const slots=['A','B','C'] as const;
 const coreOf=(slot:BlockId):SubjectId|undefined=>{const subject=plan[slot].subject;return CORE_SUBJECTS.includes(subject as SubjectId)?subject as SubjectId:undefined};
 const candidates=slots.filter(slot=>coreOf(slot));
 if(!candidates.length)return plan;
 let best=candidates[0];
 for(const slot of candidates){if(subjectPressure(coreOf(slot)!,a)>subjectPressure(coreOf(best)!,a))best=slot}
 if(best==='A')return plan;
 return {...plan,A:plan[best],[best]:plan.A};
}
