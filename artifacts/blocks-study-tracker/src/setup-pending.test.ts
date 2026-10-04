import {describe,expect,it} from 'vitest';
import {LEGACY_SEED_PENDING_IDS} from './seed';
import {buildBacklogDraft,inferPendingTopics,pendingTopicKey,purgeLegacySeedPending} from './setup-pending';

describe('backlog draft',()=>{
 it('turns unfinished setup rows into backlog topics with no dates attached',()=>{
  const topics=inferPendingTopics([
   {subject:'maths',name:'Relations',finished:true,key:'maths-1'},
   {subject:'maths',name:'Integrals',finished:false,key:'maths-2'},
   {subject:'physics',name:' Optics',finished:false,key:'physics-1'}
  ]);
  expect(topics).toEqual([
   {id:'setup-maths-2',subject:'maths',name:'Integrals'},
   {id:'setup-physics-1',subject:'physics',name:'Optics'}
  ]);
 });

 it('merges existing, inferred and added topics, honoring removals, dedupe and overrides',()=>{
  const existing=[{id:'seed',subject:'maths' as const,name:'ITF',plannedStart:'2026-10-05',estimatedDays:4}];
  const inferred=[{id:'setup-physics-1',subject:'physics' as const,name:'Optics'}];
  const added=[{id:'custom-1',subject:'english' as const,name:'Essay writing'}];
  const result=buildBacklogDraft({existing,inferred,added,removedKeys:new Set([pendingTopicKey('physics','Optics')])});
  expect(result.map(t=>t.id)).toEqual(['seed','custom-1']);
  expect(result[0]).toMatchObject({plannedStart:'2026-10-05',estimatedDays:4});
 });

 it('drops topics that were already learned',()=>{
  const done=[{id:'done-1',subject:'maths' as const,name:'ITF',doneOn:'2026-10-04'}];
  const result=buildBacklogDraft({existing:done,inferred:[],added:[],removedKeys:new Set()});
  expect(result).toEqual([]);
 });

 it('drops topics whose chapter is already learned, so the count matches what setup saves',()=>{
  const existing=[{id:'p-maths-itf',subject:'maths' as const,name:'Inverse Trigonometric Functions (ITF)'}];
  const inferred=[{id:'setup-maths-9',subject:'maths' as const,name:'Vectors'}];
  const result=buildBacklogDraft({existing,inferred,added:[],removedKeys:new Set(),chapterKeys:new Set([pendingTopicKey('maths','Inverse Trigonometric Functions (ITF)')])});
  expect(result.map(t=>t.id)).toEqual(['setup-maths-9']);
 });

 it('keeps every topic when no chapters are learned yet',()=>{
  const existing=[{id:'p-maths-itf',subject:'maths' as const,name:'ITF'}];
  const result=buildBacklogDraft({existing,inferred:[],added:[],removedKeys:new Set(),chapterKeys:new Set()});
  expect(result.map(t=>t.id)).toEqual(['p-maths-itf']);
 });
});

describe('legacy seed purge',()=>{
 it('pins the ids the hardcoded seed used so the purge cannot drift',()=>{
  expect(LEGACY_SEED_PENDING_IDS).toEqual(['p-maths-itf','p-maths-defint','p-eng-macbeth5']);
 });

 it('removes un-acted seed topics and leaves everything else alone',()=>{
  const pending=[
   {id:'p-maths-itf',subject:'maths' as const,name:'Inverse Trigonometric Functions (ITF)'},
   {id:'p-eng-macbeth5',subject:'english' as const,name:'Literature: Macbeth Act 5'},
   {id:'custom-1',subject:'maths' as const,name:'Vectors'},
   {id:'setup-maths-2',subject:'maths' as const,name:'Integrals'}
  ];
  expect(purgeLegacySeedPending(pending).map(t=>t.id)).toEqual(['custom-1','setup-maths-2']);
 });

 it('keeps a seed topic that was already marked learned',()=>{
  const pending=[
   {id:'p-maths-itf',subject:'maths' as const,name:'Inverse Trigonometric Functions (ITF)',doneOn:'2026-10-01'},
   {id:'p-maths-defint',subject:'maths' as const,name:'Definite Integrals'}
  ];
  expect(purgeLegacySeedPending(pending).map(t=>t.id)).toEqual(['p-maths-itf']);
 });

 it('is a no-op on an empty backlog',()=>{
  expect(purgeLegacySeedPending([])).toEqual([]);
 });
});
