import {describe,expect,it} from 'vitest';
import {filterForPaper,planRevisions} from './daily';
import type {Chapter,Revision,SubjectId} from './types';

const rev=(pass:'R1'|'R2'|'R3',dueOn:string,over:Partial<Revision>={}):Revision=>({pass,dueOn,...over});
const chapter=(id:string,subject:SubjectId,name:string,revisions:Revision[]):Chapter=>({id,subject,name,learnedOn:'2026-10-01',revisions,pyqDone:false});

describe('planRevisions',()=>{
 it('returns an empty plan when every revision is done',()=>{
  const chapters=[chapter('c1','maths','Integrals',[rev('R1','2026-10-01',{doneOn:'2026-10-01'})])];
  expect(planRevisions(chapters,'2026-10-05')).toEqual({today:[],schedule:[],daysToClear:0});
 });
 it('assigns one revision per day when nothing is overdue',()=>{
  const chapters=[chapter('c1','maths','Integrals',[rev('R1','2026-10-05')]),chapter('c2','physics','Current Electricity',[rev('R2','2026-10-05')])];
  const plan=planRevisions(chapters,'2026-10-05');
  expect(plan.today).toHaveLength(1);
  expect(plan.today[0]).toMatchObject({chapter:expect.objectContaining({id:'c1'}),revision:expect.objectContaining({pass:'R1'}),status:'due',scheduledOn:'2026-10-05'});
  expect(plan.schedule).toEqual([{date:'2026-10-06',items:[expect.objectContaining({chapter:expect.objectContaining({id:'c2'}),status:'queued'})]}]);
  expect(plan.daysToClear).toBe(1);
 });
 it('burns down an overdue backlog at two per day, oldest first',()=>{
  const chapters=[
   chapter('c1','maths','A',[rev('R1','2026-10-01')]),
   chapter('c2','maths','B',[rev('R1','2026-10-02')]),
   chapter('c3','maths','C',[rev('R1','2026-10-03')]),
   chapter('c4','maths','D',[rev('R1','2026-10-04')]),
   chapter('c5','maths','E',[rev('R1','2026-10-05')]),
  ];
  const plan=planRevisions(chapters,'2026-10-06');
  expect(plan.today).toHaveLength(2);
  expect(plan.today.map(item=>item.chapter.id)).toEqual(['c1','c2']);
  expect(plan.today.every(item=>item.status==='overdue')).toBe(true);
  expect(plan.schedule.map(day=>day.date)).toEqual(['2026-10-07','2026-10-08']);
  expect(plan.schedule[0].items.map(item=>item.chapter.id)).toEqual(['c3','c4']);
  expect(plan.schedule[1].items.map(item=>item.chapter.id)).toEqual(['c5']);
  expect(plan.daysToClear).toBe(2);
 });
 it('orders same-day items R1 before R2 before R3',()=>{
  const chapters=[chapter('c1','maths','A',[rev('R3','2026-10-05'),rev('R1','2026-10-05'),rev('R2','2026-10-05')])];
  const plan=planRevisions(chapters,'2026-10-05');
  expect(plan.today).toHaveLength(1);
  expect(plan.today[0].revision.pass).toBe('R1');
  expect(plan.schedule[0].items.map(item=>item.revision.pass)).toEqual(['R2','R3']);
 });
 it('pulls in items that fall due on later days of the horizon',()=>{
  const chapters=[chapter('c1','maths','A',[rev('R1','2026-10-05')]),chapter('c2','maths','B',[rev('R2','2026-10-07')])];
  const plan=planRevisions(chapters,'2026-10-05');
  expect(plan.today.map(item=>item.chapter.id)).toEqual(['c1']);
  expect(plan.schedule.map(day=>day.date)).toEqual(['2026-10-07']);
  expect(plan.schedule[0].items[0].status).toBe('queued');
  expect(plan.daysToClear).toBe(2);
 });
 it('projects items that fall due within the horizon even with an empty queue',()=>{
  const chapters=[chapter('c2','maths','B',[rev('R1','2026-10-10')])];
  const plan=planRevisions(chapters,'2026-10-05');
  expect(plan.today).toHaveLength(0);
  expect(plan.schedule.map(day=>day.date)).toEqual(['2026-10-10']);
  expect(plan.schedule[0].items[0].status).toBe('queued');
 });
});

describe('filterForPaper',()=>{
 it('keeps only the paper subject in today picks',()=>{
  const chapters=[
   chapter('c1','maths','Integrals',[rev('R1','2026-10-01')]),
   chapter('c2','physics','Current Electricity',[rev('R2','2026-10-01')]),
  ];
  const plan=planRevisions(chapters,'2026-10-05');
  expect(plan.today).toHaveLength(2);
  const physics=filterForPaper(plan,'physics');
  expect(physics).toHaveLength(1);
  expect(physics[0].chapter.id).toBe('c2');
 });
});
