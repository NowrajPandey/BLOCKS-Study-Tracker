import {addDays} from './dates';
import {PHASES} from './seed';
import type {ExamDates} from './types';
export const APP_START='2026-10-03';
export const DEFAULT_EXAM_DATES:ExamDates={practicals:'2026-11-15',preBoards:'2026-12-01',boards:'2027-02-15',confirmed:{practicals:false,preBoards:false,boards:false}};
export function derivePhases(d:ExamDates,appStart=APP_START){
 const p2Start=addDays(d.practicals,-20);let p1Start=addDays(appStart,2);const p1End=addDays(p2Start,-1);const squeezed=p1End<p1Start;if(squeezed)p1Start=p1End;
 const ranges=[{start:appStart,end:addDays(appStart,1)},{start:p1Start,end:p1End},{start:p2Start,end:d.practicals},{start:addDays(d.practicals,1),end:addDays(d.preBoards,-1)},{start:d.preBoards,end:d.boards}];
 return PHASES.map((p,i)=>({...p,...ranges[i],squeezed:i===1&&squeezed}));
}
export const currentPhase=(d:ExamDates,today:string)=>derivePhases(d).find(p=>today>=p.start&&today<=p.end);