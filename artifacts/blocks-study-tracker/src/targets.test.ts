import {describe,expect,it} from 'vitest';
import {distributeRevisions,resolveBlock} from './targets';
import {planRevisions} from './daily';
import type {QueuedRevision} from './daily';
import {WEEK_TEMPLATE} from './seed';
import type {PacedTopic} from './pacing';
import type {Chapter,ErrorEntry,PaperSlot,ScoreEntry,SubjectId} from './types';

const TODAY='2026-10-04';
const base={length:'75 min',today:TODAY,paperMode:false,chapters:[] as Chapter[],errors:[] as ErrorEntry[],scores:[] as ScoreEntry[],papers:[] as PaperSlot[],paced:[] as PacedTopic[]};
const testBlock=WEEK_TEMPLATE[0].A;
const analysisBlock=WEEK_TEMPLATE[0].B;
const mathsBlock=WEEK_TEMPLATE[1].A;
const chapter=(name:string,over:{learnedOn?:string;r1Done?:boolean;pyqDone?:boolean;subject?:SubjectId;revisions?:Chapter['revisions']}={}):Chapter=>({id:name,subject:over.subject??'maths',name,learnedOn:over.learnedOn??'2026-10-01',revisions:over.revisions??[{pass:'R1',dueOn:'2026-10-02',...(over.r1Done===false?{}:{doneOn:'2026-10-02'})},{pass:'R2',dueOn:'2026-10-08'},{pass:'R3',dueOn:'2026-10-22'}],pyqDone:over.pyqDone??false});
const paced=(name:string,over:Partial<PacedTopic>={}):PacedTopic=>({id:name,subject:'maths',name,plannedStart:'2026-10-05',estimatedDays:4,due:'2026-10-09',overridden:false,atRisk:false,...over});
const score=(label:string,type:ScoreEntry['type'],subject:SubjectId='physics',date='2026-09-27'):ScoreEntry=>({id:label,label,subject,type,obtained:80,total:100,date});
const error=(over:Partial<ErrorEntry> & {id:string}):ErrorEntry=>({date:'2026-09-30',subject:'chemistry',topic:'Solutions',reason:'calculation',fix:'R1 Test Fixes',redoOn:'2026-10-07',...over});

describe('core-only test blocks',()=>{
 it('reserves the full-length mock for an upcoming PCMB paper',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,papers:[{id:'p1',subject:'physics',date:'2026-10-09'}],scores:[score('Mock 1','full-paper'),score('Mock 2','full-paper'),score('Mock 3','full-paper')]});
  expect(resolved.heading).toBe('Mock Test #4 - Full Physics');
  expect(resolved.schedule).toBe('3 h · Sunday morning');
 });

 it('never builds a mock out of a minor-subject paper',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,papers:[{id:'p1',subject:'english',date:'2026-10-06'}],chapters:[chapter('Definite Integrals',{learnedOn:'2026-10-01'})]});
  expect(resolved.heading).toBe('Chapter test: Maths - Definite Integrals');
  expect(resolved.schedule).toBe('90 min · Sunday morning');
 });

 it('ignores papers more than a week away and runs a chapter test instead',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,papers:[{id:'p1',subject:'physics',date:'2026-10-20'}],chapters:[chapter('Vectors',{learnedOn:'2026-09-20'}),chapter('Definite Integrals',{learnedOn:'2026-10-01'})]});
  expect(resolved.heading).toBe('Chapter test: Maths - Definite Integrals');
  expect(resolved.schedule).toBe('90 min · Sunday morning');
 });

 it('never tests a minor subject, even when it is the newest chapter',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,chapters:[chapter('Language: Grammar',{subject:'english',learnedOn:'2026-10-02'}),chapter('Older maths chapter',{learnedOn:'2026-09-20'})]});
  expect(resolved.heading).toBe('Chapter test: Maths - Older maths chapter');
 });

 it('skips core chapters that have not passed R1 yet',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,chapters:[chapter('Fresh chapter',{learnedOn:'2026-10-03',r1Done:false}),chapter('Ready chapter',{learnedOn:'2026-09-20'})]});
  expect(resolved.heading).toBe('Chapter test: Maths - Ready chapter');
 });

 it('falls back to backlog learning instead of a dead test card',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,paced:[paced('Definite Integrals')]});
  expect(resolved.heading).toBe('Backlog: Definite Integrals');
  expect(resolved.schedule).toBe('75 min · Sunday morning');
 });

 it('falls back to a revision when the backlog is empty',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,chapters:[chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R2',dueOn:TODAY}]})]});
  expect(resolved.heading).toBe('Revision: Solutions · R2');
 });

 it('falls back to practice when only minor subjects exist',()=>{
  const resolved=resolveBlock({...base,plan:testBlock,chapters:[chapter('Language: Grammar',{subject:'english'})]});
  expect(resolved.heading).toBe('Practice PYQs: Language: Grammar');
 });
});

describe('dynamic analysis blocks',()=>{
 it('prefers the error whose redo date has arrived',()=>{
  const resolved=resolveBlock({...base,plan:analysisBlock,errors:[error({id:'e1',date:'2026-09-20',topic:'Half cells',redoOn:'2026-10-03'}),error({id:'e2',date:'2026-10-01',redoOn:'2026-10-12'})]});
  expect(resolved.heading).toBe('Error analysis: Half cells - R1 Test Fixes');
 });

 it('otherwise analyzes the most recent open error',()=>{
  const resolved=resolveBlock({...base,plan:analysisBlock,errors:[error({id:'e1',date:'2026-09-20',topic:'Half cells'}),error({id:'e2',date:'2026-10-01'})]});
  expect(resolved.heading).toBe('Error analysis: Solutions - R1 Test Fixes');
 });

 it('falls back to the last logged test when the log is clear',()=>{
  const resolved=resolveBlock({...base,plan:analysisBlock,scores:[score('Unit test','unit','chemistry','2026-10-01'),score('Mock #3','full-paper','maths','2026-09-27')]});
  expect(resolved.heading).toBe('Error analysis: Maths Mock #3');
 });

 it('falls back to active backlog learning instead of a dead placeholder',()=>{
  const resolved=resolveBlock({...base,plan:analysisBlock,paced:[paced('Inverse Trigonometric Functions',{plannedStart:TODAY,due:'2026-10-08'})]});
  expect(resolved.heading).toBe('Backlog: Inverse Trigonometric Functions');
 });

 it('falls back to spaced-repetition revision when there is no backlog',()=>{
  const resolved=resolveBlock({...base,plan:analysisBlock,chapters:[chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R1',dueOn:'2026-10-01'}]})]});
  expect(resolved.heading).toBe('Revision: Solutions · R1 · overdue');
 });

 it('keeps the plan text only in a completely empty app',()=>{
  expect(resolveBlock({...base,plan:analysisBlock}).heading).toBe('Error analysis + fixes');
 });
});

describe('every block names its target',()=>{
 it('shows the active chapter on a subject block',()=>{
  const resolved=resolveBlock({...base,plan:mathsBlock,paced:[paced('Inverse Trigonometric Functions',{plannedStart:TODAY,due:'2026-10-08'})]});
  expect(resolved.heading).toBe('New topic or practice');
  expect(resolved.target).toBe('Active: Inverse Trigonometric Functions · START TODAY');
 });

 it('points to the next scheduled chapter when none is active',()=>{
  const resolved=resolveBlock({...base,plan:mathsBlock,paced:[paced('Definite Integrals',{plannedStart:'2026-10-12',due:'2026-10-16'})]});
  expect(resolved.target).toBe('Next: Definite Integrals · starts 12 Oct');
 });

 it('falls back to a PYQ practice target once everything is learned',()=>{
  const resolved=resolveBlock({...base,plan:mathsBlock,chapters:[chapter('Vectors',{learnedOn:'2026-09-20'})]});
  expect(resolved.target).toBe('Practice PYQs: Vectors');
 });

 it('leaves the card without a target when there is nothing to point at',()=>{
  expect(resolveBlock({...base,plan:mathsBlock}).target).toBeUndefined();
 });

 it('names both chapters on a mixed block',()=>{
  const resolved=resolveBlock({...base,plan:WEEK_TEMPLATE[4].B,paced:[paced('Solutions',{subject:'chemistry',plannedStart:'2026-10-01',due:'2026-10-08'}),paced('Ecology',{subject:'biology',plannedStart:'2026-10-01',due:'2026-10-08'})]});
  expect(resolved.target).toBe('Chemistry: Solutions · Biology: Ecology');
 });

 it('surfaces what is behind on a flex block',()=>{
  const resolved=resolveBlock({...base,plan:WEEK_TEMPLATE[5].C,chapters:[chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R2',dueOn:'2026-10-01'}]})]});
  expect(resolved.target).toBe('Overdue: R2 on Solutions');
 });

 it('keeps paper-mode cards on their focus',()=>{
  const resolved=resolveBlock({...base,plan:{subject:'physics',focus:'Revise only for PHYSICS'},paperMode:true,paced:[paced('Electromagnetic Induction',{subject:'physics',plannedStart:TODAY,due:'2026-10-08'})]});
  expect(resolved).toEqual({heading:'Revise only for PHYSICS'});
 });
});

describe('revision distribution',()=>{
 const monday=WEEK_TEMPLATE[1];
 it('places a revision in the block matching its subject',()=>{
  const revisions=planRevisions([chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R1',dueOn:TODAY}]})],TODAY).today;
  const dist=distributeRevisions(monday,revisions);
  expect(dist.C).toHaveLength(1);
  expect(dist.A).toHaveLength(0);
  expect(dist.B).toHaveLength(0);
 });
 it('overflows an unmatched revision to Block C',()=>{
  const revisions=planRevisions([chapter('Ecology',{subject:'biology',revisions:[{pass:'R1',dueOn:TODAY}]})],TODAY).today;
  const dist=distributeRevisions(monday,revisions);
  expect(dist.C).toHaveLength(1);
 });
 it('fills Block C before overflowing to B',()=>{
  const chapters=[chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R1',dueOn:'2026-10-01'}]}),chapter('Ecology',{subject:'biology',revisions:[{pass:'R1',dueOn:'2026-10-01'}]})];
  const revisions=planRevisions(chapters,TODAY).today;
  expect(revisions).toHaveLength(2);
  const dist=distributeRevisions(monday,revisions);
  expect(dist.C).toHaveLength(2);
  expect(dist.B).toHaveLength(0);
 });
 it('caps every block at two revisions',()=>{
  const item=(id:string):QueuedRevision=>({chapter:{id,subject:'biology',name:id,learnedOn:TODAY,revisions:[],pyqDone:false},revision:{pass:'R1',dueOn:TODAY},dueOn:TODAY,scheduledOn:TODAY,status:'due'});
  const dist=distributeRevisions(monday,[item('1'),item('2'),item('3')]);
  expect(dist.C).toHaveLength(2);
  expect(dist.B).toHaveLength(1);
  expect(dist.A).toHaveLength(0);
 });
 it('attaches assigned revisions to the resolution',()=>{
  const revisions=planRevisions([chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R1',dueOn:TODAY}]})],TODAY).today;
  const dist=distributeRevisions(monday,revisions);
  const resolved=resolveBlock({...base,plan:monday.C,revisions:dist.C});
  expect(resolved.revisions).toHaveLength(1);
  expect(resolved.revisions?.[0].chapter.name).toBe('Solutions');
 });
 it('omits revisions from the resolution when none are assigned',()=>{
  const resolved=resolveBlock({...base,plan:monday.A,revisions:[]});
  expect(resolved.revisions).toBeUndefined();
 });
 it('surfaces a distributed overdue revision on the flex block',()=>{
  const revisions=planRevisions([chapter('Ecology',{subject:'biology',revisions:[{pass:'R1',dueOn:'2026-10-01'}]})],TODAY).today;
  const resolved=resolveBlock({...base,plan:WEEK_TEMPLATE[5].C,revisions});
  expect(resolved.target).toBe('Overdue: R1 on Ecology');
 });
 it('uses the assigned revision as the test-block fallback',()=>{
  const revisions=planRevisions([chapter('Solutions',{subject:'chemistry',revisions:[{pass:'R1',dueOn:'2026-10-01'}]})],TODAY).today;
  const resolved=resolveBlock({...base,plan:WEEK_TEMPLATE[0].A,revisions});
  expect(resolved.heading).toBe('Revision: Solutions · R1 · overdue');
 });
});
