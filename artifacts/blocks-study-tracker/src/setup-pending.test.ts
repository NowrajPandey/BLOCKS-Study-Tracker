import {describe,expect,it} from 'vitest';
import {inferPendingTopics,mergeSetupPending,pendingTopicKey} from './setup-pending';
import type {PendingTopic} from './types';

describe('setup pending topics',()=>{
 it('spreads planned starts across the window and adds study time plus surplus',()=>{
  const topics=inferPendingTopics([
   {subject:'maths',name:'Relations',finished:true,key:'maths-1'},
   {subject:'maths',name:'Integrals',finished:false,key:'maths-2'},
   {subject:'physics',name:'Optics',finished:false,key:'physics-1'}
  ],'2026-10-05','2026-10-11');
  expect(topics.map(({subject,name,plannedStart,estimatedDays,bufferDays,due})=>({subject,name,plannedStart,estimatedDays,bufferDays,due}))).toEqual([
   {subject:'maths',name:'Integrals',plannedStart:'2026-10-05',estimatedDays:4,bufferDays:2,due:'2026-10-11'},
   {subject:'physics',name:'Optics',plannedStart:'2026-10-11',estimatedDays:4,bufferDays:2,due:'2026-10-17'}
  ]);
 });

 it('keeps manual topics, recalculates estimates and surplus, and removes excluded topics',()=>{
  const existing:PendingTopic[]=[{id:'seed',subject:'maths',name:'ITF',plannedStart:'2026-10-05',estimatedDays:4,bufferDays:2,due:'2026-10-11'}];
  const inferred:PendingTopic[]=[{id:'setup-physics-1',subject:'physics',name:'Optics',plannedStart:'2026-10-07',estimatedDays:4,bufferDays:2,due:'2026-10-13'}];
  const added:PendingTopic[]=[{id:'custom-1',subject:'english',name:'Essay writing',plannedStart:'2026-10-08',estimatedDays:4,bufferDays:2,due:'2026-10-14'}];
  const result=mergeSetupPending({
   existing,inferred,added,
   removedKeys:new Set([pendingTopicKey('physics','Optics')]),
   startOverrides:{[pendingTopicKey('maths','ITF')]:'2026-10-06'},
   estimateOverrides:{[pendingTopicKey('maths','ITF')]:5},
   bufferOverrides:{[pendingTopicKey('maths','ITF')]:4}
  });
  expect(result).toEqual([{...existing[0],plannedStart:'2026-10-06',estimatedDays:5,bufferDays:4,due:'2026-10-15'},added[0]]);
 });
});