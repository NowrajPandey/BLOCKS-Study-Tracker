import {describe,expect,it} from 'vitest';
import {addDays,daysBetween,fromISO} from './dates';
import {applyPendingOverride,clearPendingOverride,paceBacklog,STUDY_DAYS_PER_TOPIC,syllabusProjection} from './pacing';
import {WEEK_TEMPLATE} from './seed';
import type {Chapter,PendingTopic,SubjectId} from './types';

const TODAY='2026-10-04';
const DEADLINE='2026-12-01';
const topic=(id:string,subject:SubjectId='maths',name=id):PendingTopic=>({id,subject,name});
type PacedTopicList=ReturnType<typeof paceBacklog>;
const startOf=(list:PacedTopicList,id:string)=>list.find(p=>p.id===id)!.plannedStart;
const chapterWith=(id:string,revisionDueOn:string,doneOn?:string):Chapter=>({id,subject:'maths',name:id,learnedOn:'2026-09-01',revisions:[{pass:'R1',dueOn:'2026-09-02',doneOn:'2026-09-02'},{pass:'R2',dueOn:'2026-09-08',doneOn:'2026-09-08'},{pass:'R3',dueOn:revisionDueOn,...(doneOn?{doneOn}:{})}],pyqDone:false});

describe('subject-wise serialization',()=>{
 it('chains one subject so the next chapter starts only after the previous learn-by',()=>{
  const paced=paceBacklog(Array.from({length:6},(_,i)=>topic(`m${i}`)),{today:TODAY,deadline:DEADLINE});
  expect(paced).toHaveLength(6);
  const ordered=[...paced].sort((a,b)=>a.plannedStart.localeCompare(b.plannedStart));
  expect(ordered.map(p=>p.id)).toEqual(['m0','m1','m2','m3','m4','m5']);
  ordered.forEach((p,i)=>{
   expect(p.due).toBe(addDays(p.plannedStart,STUDY_DAYS_PER_TOPIC));
   expect(p.overridden).toBe(false);
   if(i>0)expect(p.plannedStart>ordered[i-1].due).toBe(true);
  });
 });

 it('keeps different subjects moving in parallel from the start',()=>{
  const paced=paceBacklog([topic('m1','maths'),topic('p1','physics'),topic('c1','chemistry'),topic('b1','biology'),topic('e1','english')],{today:TODAY,deadline:DEADLINE});
  expect(paced).toHaveLength(5);
  expect(new Set(paced.map(p=>p.subject)).size).toBe(5);
  paced.forEach(p=>expect(daysBetween(TODAY,p.plannedStart)).toBeLessThanOrEqual(7));
 });

 it('never overlaps an overridden window in the same subject',()=>{
  const over=applyPendingOverride(topic('m9'),{plannedStart:'2026-10-10',estimatedDays:4});
  const paced=paceBacklog([over,topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE});
  expect(paced.find(p=>p.id==='m1')).toMatchObject({plannedStart:'2026-10-05',due:'2026-10-09'});
  expect(paced.find(p=>p.id==='m2')!.plannedStart>'2026-10-14').toBe(true);
  expect(paced.find(p=>p.id==='m9')).toMatchObject({plannedStart:'2026-10-10',due:'2026-10-14',overridden:true});
 });
});

describe('scheduling onto subject days',()=>{
 it('snaps starts onto days the subject is scheduled and never doubles a subject onto one day',()=>{
  const paced=paceBacklog([topic('b1','biology'),topic('b2','biology'),topic('b3','biology')],{today:TODAY,deadline:DEADLINE});
  expect(paced).toHaveLength(3);
  expect(new Set(paced.map(p=>p.plannedStart)).size).toBe(3);
  paced.forEach(p=>expect([2,3]).toContain(fromISO(p.plannedStart).getDay()));
  const english=paceBacklog([topic('e1','english')],{today:TODAY,deadline:DEADLINE});
  expect(fromISO(english[0].plannedStart).getDay()).toBe(0);
 });

 it('keeps a manual override untouched and clears back to auto',()=>{
  const over=applyPendingOverride(topic('m1'),{plannedStart:'2026-11-20',estimatedDays:7});
  expect(over).toMatchObject({plannedStart:'2026-11-20',estimatedDays:7});
  expect(over.due).toBeUndefined();
  const paced=paceBacklog([topic('a'),over],{today:TODAY,deadline:DEADLINE});
  expect(paced.find(p=>p.id==='m1')).toMatchObject({plannedStart:'2026-11-20',estimatedDays:7,due:'2026-11-27',overridden:true});
  expect(paced.find(p=>p.id==='a')).toMatchObject({overridden:false});
  const cleared=clearPendingOverride(over);
  expect(cleared.plannedStart).toBeUndefined();
  expect(cleared.estimatedDays).toBeUndefined();
 });

 it('re-paces the remaining backlog when a topic leaves it',()=>{
  const before=paceBacklog([topic('a'),topic('b'),topic('c'),topic('d')],{today:TODAY,deadline:DEADLINE});
  const after=paceBacklog([topic('a'),topic('c'),topic('d')],{today:TODAY,deadline:DEADLINE});
  expect(startOf(after,'c')).not.toBe(startOf(before,'c'));
 });

 it('skips topics that are already learned',()=>{
  const paced=paceBacklog([{...topic('x'),doneOn:TODAY},topic('y')],{today:TODAY,deadline:DEADLINE});
  expect(paced.map(p=>p.id)).toEqual(['y']);
 });

 it('keeps chaining from today and flags topics that run past the deadline',()=>{
  const paced=paceBacklog([topic('a'),topic('b')],{today:TODAY,deadline:addDays(TODAY,2)});
  expect(paced.map(p=>p.plannedStart)).toEqual(['2026-10-05','2026-10-10']);
  expect(paced.every(p=>p.atRisk)).toBe(true);
  expect(paceBacklog([],{today:TODAY,deadline:DEADLINE})).toEqual([]);
 });
});

describe('multi-subject daily variety',()=>{
 it('gives every weekday three different block subjects',()=>{
  ([1,2,3,4,5,6] as const).forEach(day=>{
   const plan=WEEK_TEMPLATE[day];
   expect(new Set([plan.A.subject,plan.B.subject,plan.C.subject]).size).toBe(3);
  });
 });
});

describe('syllabus projection',()=>{
 it('projects the later of the backlog finish and the last pending revision',()=>{
  const projection=syllabusProjection({pending:[topic('a'),topic('b')],chapters:[chapterWith('c1','2026-11-20')],today:TODAY,deadline:DEADLINE});
  expect(projection.projected).toBe('2026-11-20');
  expect(projection.ok).toBe(true);
  expect(projection.margin).toBe(daysBetween('2026-11-20',DEADLINE));
  expect(projection.covered).toBe(false);
 });

 it('projects the last backlog chapter when revisions are all done',()=>{
  const projection=syllabusProjection({pending:[topic('a'),topic('b')],chapters:[chapterWith('c1','2026-11-20','2026-10-01')],today:TODAY,deadline:DEADLINE});
  expect(projection.projected).toBe('2026-10-14');
  expect(projection.ok).toBe(true);
 });

 it('reports at risk when the chain runs past pre-boards',()=>{
  const pending=Array.from({length:30},(_,i)=>topic(`m${i}`));
  const projection=syllabusProjection({pending,chapters:[],today:TODAY,deadline:DEADLINE});
  expect(projection.ok).toBe(false);
  expect(projection.margin).toBeLessThan(0);
  expect(projection.projected>DEADLINE).toBe(true);
 });

 it('reports covered when nothing is pending',()=>{
  const projection=syllabusProjection({pending:[],chapters:[],today:TODAY,deadline:DEADLINE});
  expect(projection).toMatchObject({covered:true,ok:true,projected:TODAY});
 });
});
