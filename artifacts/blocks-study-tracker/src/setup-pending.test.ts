import {describe,expect,it} from 'vitest';
import {inferPendingTopics,mergeSetupPending,pendingTopicKey} from './setup-pending';
import type {PendingTopic} from './types';

describe('setup pending topics',()=>{
 it('turns unchecked chapters into pending topics with dates spread across the current plan window',()=>{
  const topics=inferPendingTopics([
   {subject:'maths',name:'Relations',finished:true,key:'maths-1'},
   {subject:'maths',name:'Integrals',finished:false,key:'maths-2'},
   {subject:'physics',name:'Optics',finished:false,key:'physics-1'}
  ],'2026-10-05','2026-10-11');
  expect(topics.map(({subject,name,due})=>({subject,name,due}))).toEqual([
   {subject:'maths',name:'Integrals',due:'2026-10-05'},
   {subject:'physics',name:'Optics',due:'2026-10-11'}
  ]);
 });

 it('keeps manual topics, applies deadline edits, and removes excluded topics',()=>{
  const existing:PendingTopic[]=[{id:'seed',subject:'maths',name:'ITF',due:'2026-10-11'}];
  const inferred:PendingTopic[]=[{id:'setup-physics-1',subject:'physics',name:'Optics',due:'2026-10-08'}];
  const added:PendingTopic[]=[{id:'custom-1',subject:'english',name:'Essay writing',due:'2026-10-10'}];
  const result=mergeSetupPending({
   existing,inferred,added,
   removedKeys:new Set([pendingTopicKey('physics','Optics')]),
   dueOverrides:{[pendingTopicKey('maths','ITF')]:'2026-10-15'}
  });
  expect(result).toEqual([{...existing[0],due:'2026-10-15'},added[0]]);
 });
});