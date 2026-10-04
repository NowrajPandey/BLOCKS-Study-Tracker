import {describe,expect,it} from 'vitest';
import {allocateBlocks,DEFAULT_HARDNESS,priorityScore,schoolHas,subjectPressure} from './priority';
import {paceBacklog} from './pacing';
import {WEEK_TEMPLATE} from './seed';
import type {BlockId,PendingTopic,SchoolSync,SubjectId} from './types';
import type {BlockPlan} from './seed';

const TODAY='2026-10-04';
const DEADLINE='2026-12-01';
const topic=(id:string,subject:SubjectId='maths',name=id):PendingTopic=>({id,subject,name});

describe('priorityScore',()=>{
 const base={subject:'maths' as const,unlearned:true,schoolDone:false,today:TODAY,examDate:DEADLINE};

 it('scores an unlearned core chapter with no school date as hardness times importance',()=>{
  expect(priorityScore(base)).toBe(1);
  expect(priorityScore({...base,subject:'physics'})).toBeCloseTo(0.9,5);
  expect(priorityScore({...base,subject:'english'})).toBeCloseTo(0.16,5);
 });

 it('adds the full pacing gap when school has not set a finish date',()=>{
  expect(priorityScore({...base,schoolDate:TODAY})).toBe(59);
 });

 it('shrinks the gap as school gets closer to finishing the subject',()=>{
  expect(priorityScore({...base,schoolDate:'2026-10-14'})).toBe(49);
 });

 it('drops to zero once school has finished the chapter',()=>{
  expect(priorityScore({...base,schoolDate:TODAY,schoolDone:true})).toBe(0);
 });

 it('scores a learned chapter by gap alone because B is zero',()=>{
  expect(priorityScore({...base,unlearned:false,schoolDate:TODAY})).toBe(58);
 });

 it('respects a custom hardness weight',()=>{
  expect(priorityScore({...base,hardness:{...DEFAULT_HARDNESS,maths:1.5}})).toBe(1.5);
 });

 it('ranks core maths above english at the same gap',()=>{
  const maths=priorityScore({...base,schoolDate:TODAY});
  const english=priorityScore({...base,subject:'english',schoolDate:TODAY});
  expect(maths).toBeGreaterThan(english);
 });
});

describe('schoolHas',()=>{
 const sync:SchoolSync={done:{maths:[' inverse trigonometric functions (itf) ']},expected:{}};
 it('matches school-finished chapters case-insensitively and trimmed',()=>{
  expect(schoolHas(sync,'maths','Inverse Trigonometric Functions (ITF)')).toBe(true);
  expect(schoolHas(sync,'maths','Definite Integrals')).toBe(false);
  expect(schoolHas(sync,'physics','Inverse Trigonometric Functions (ITF)')).toBe(false);
  expect(schoolHas(undefined,'maths','anything')).toBe(false);
 });
});

describe('subjectPressure',()=>{
 const pending=[topic('m1','maths','Algebra'),topic('m2','maths','Calculus')];
 const ctx={pending,today:TODAY,deadline:DEADLINE};

 it('sums the priority of every open chapter in the subject',()=>{
  expect(subjectPressure('maths',ctx)).toBe(2);
  expect(subjectPressure('physics',ctx)).toBe(0);
 });

 it('gives school-finished chapters zero weight',()=>{
  const school:SchoolSync={done:{maths:['Algebra']},expected:{}};
  expect(subjectPressure('maths',{...ctx,school})).toBe(1);
 });

 it('raises pressure when school still has ground to cover',()=>{
  const school:SchoolSync={done:{},expected:{maths:'2026-10-14'}};
  expect(subjectPressure('maths',{...ctx,school})).toBe(98);
 });

 it('ignores chapters already learned',()=>{
  const learned={pending:[{...topic('m0','maths','Vectors'),doneOn:TODAY}],today:TODAY,deadline:DEADLINE};
  expect(subjectPressure('maths',learned)).toBe(0);
 });
});

describe('pacer priority ordering',()=>{
 it('pushes school-finished chapters behind chapters you must self-study first',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,school:{done:{maths:['m1']},expected:{}}});
  const start=(id:string)=>paced.find(p=>p.id===id)!.plannedStart;
  expect(start('m0')).toBe('2026-10-05');
  expect(start('m2')).toBe('2026-10-10');
  expect(start('m1')).toBe('2026-10-15');
  expect(start('m0')<start('m2')).toBe(true);
  expect(start('m2')<start('m1')).toBe(true);
 });

 it('keeps curriculum order when scores tie',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,school:{done:{},expected:{}}});
  const ordered=[...paced].sort((a,b)=>a.plannedStart.localeCompare(b.plannedStart));
  expect(ordered.map(p=>p.id)).toEqual(['m0','m1','m2']);
 });

 it('holds parallel subjects while school-finished chapters wait their turn',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('p0','physics')],{today:TODAY,deadline:DEADLINE,school:{done:{maths:['m1']},expected:{}}});
  const start=(id:string)=>paced.find(p=>p.id===id)!.plannedStart;
  expect(start('m0')).toBe('2026-10-05');
  expect(start('p0')).toBe('2026-10-05');
  expect(start('m1')).toBe('2026-10-10');
 });
});

describe('allocateBlocks',()=>{
 const day={A:{subject:'maths',focus:'a'} as BlockPlan,B:{subject:'physics',focus:'b'} as BlockPlan,C:{subject:'chemistry',focus:'c'} as BlockPlan};
 const ctx=(pending:PendingTopic[],school?:SchoolSync,hardness?:Record<SubjectId,number>)=>({pending,today:TODAY,deadline:DEADLINE,...(school?{school}:{}),...(hardness?{hardness}:{})});

 it('keeps the template when block A already owns the highest-pressure core subject',()=>{
  const out=allocateBlocks(WEEK_TEMPLATE[1] as Record<BlockId,BlockPlan>,ctx([topic('m1')]));
  expect(out).toBe(WEEK_TEMPLATE[1]);
 });

 it('swaps the highest-pressure core subject into the morning slot as a pair',()=>{
  const out=allocateBlocks(day,ctx([topic('p1','physics'),topic('p2','physics'),topic('p3','physics'),topic('m1')]));
  expect(out.A.subject).toBe('physics');
  expect(out.A.focus).toBe('b');
  expect(out.B.subject).toBe('maths');
  expect(out.B.focus).toBe('a');
  expect(out.C.subject).toBe('chemistry');
 });

 it('leaves the Sunday test block alone',()=>{
  const sunday={A:{subject:'test',focus:'Timed test, 3 h'} as BlockPlan,B:day.B,C:day.C};
  expect(allocateBlocks(sunday,ctx([topic('p1','physics'),topic('p2','physics')]))).toBe(sunday);
 });

 it('never lets english own the morning slot',()=>{
  const custom={A:{subject:'english',focus:'review'} as BlockPlan,B:{subject:'maths',focus:'a'} as BlockPlan,C:day.C};
  const out=allocateBlocks(custom,ctx([]));
  expect(out.A.subject).not.toBe('english');
  expect(out.A.subject).toBe('maths');
  expect(out.B.subject).toBe('english');
 });

 it('keeps the template on tied pressure so the routine stays stable',()=>{
  const out=allocateBlocks(day,ctx([topic('m1'),topic('p1','physics'),topic('p2','physics')],undefined,{...DEFAULT_HARDNESS,physics:0.5}));
  expect(out).toBe(day);
 });

 it('follows the school finish date when it shifts the pressure',()=>{
  const school:SchoolSync={done:{},expected:{physics:'2026-10-14'}};
  const out=allocateBlocks(day,ctx([topic('m1'),topic('p1','physics')],school));
  expect(out.A.subject).toBe('physics');
  expect(out.B.subject).toBe('maths');
 });
});
