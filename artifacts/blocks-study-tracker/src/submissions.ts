import {daysBetween} from './dates';
import type {Submission} from './types';

export const URGENT_DAYS=3;
export const SLICE_CAP_MIN=90;
export const DAY_BUDGET_MIN=180;

export interface SubmissionPlan {
 submission:Submission;
 daysLeft:number;
 totalMin:number;
 paceMin:number;
 minutesToday:number;
 urgent:boolean;
 overdue:boolean;
 atRisk:boolean;
}

export function planSubmissions(submissions:Submission[],today:string):SubmissionPlan[]{
 const active=[...submissions].filter(s=>!s.doneOn).sort((a,b)=>a.deadline.localeCompare(b.deadline)||a.title.localeCompare(b.title));
 let budget=DAY_BUDGET_MIN;
 return active.map(submission=>{
  const daysLeft=daysBetween(today,submission.deadline);
  const totalMin=Math.max(Math.round(submission.hours*60),1);
  const paceMin=Math.ceil(totalMin/Math.max(daysLeft+1,1));
  const minutesToday=Math.min(Math.min(paceMin,SLICE_CAP_MIN),budget);
  budget=Math.max(0,budget-minutesToday);
  return{submission,daysLeft,totalMin,paceMin,minutesToday,urgent:daysLeft<=URGENT_DAYS,overdue:daysLeft<0,atRisk:minutesToday<paceMin};
 });
}

export function dueLabel(plan:SubmissionPlan):string{
 if(plan.overdue)return `OVERDUE ${Math.abs(plan.daysLeft)}D`;
 if(plan.daysLeft===0)return 'DUE TODAY';
 if(plan.daysLeft===1)return 'DUE TOMORROW';
 return `DUE IN ${plan.daysLeft}D`;
}

export function sliceLabel(plan:SubmissionPlan):string{
 if(plan.minutesToday<=0)return 'NO ROOM TODAY';
 return `${plan.minutesToday} MIN TODAY`;
}
