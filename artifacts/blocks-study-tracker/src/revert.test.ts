import {describe,expect,it} from 'vitest';
import {revertLearned} from './revert';
import type {Chapter,PendingTopic} from './types';

const pending=(over:Partial<PendingTopic>={}):PendingTopic=>({id:'p1',subject:'maths',name:'Integrals',doneOn:'2026-10-08',...over});
const chapter=(over:Partial<Chapter>={}):Chapter=>({id:'c1',subject:'maths',name:'Integrals',learnedOn:'2026-10-08',revisions:[{pass:'R1',dueOn:'2026-10-12'}],pyqDone:false,...over});

describe('revertLearned',()=>{
 it('clears doneOn so the topic returns to the backlog',()=>{
  const {pending:next,chapters}=revertLearned([pending()],[chapter()],'p1');
  expect(next[0].doneOn).toBeUndefined();
  expect(chapters).toHaveLength(0);
 });
 it('removes the chapter the mistaken tap created',()=>{
  const {chapters}=revertLearned([pending()],[chapter()],'p1');
  expect(chapters).toEqual([]);
 });
 it('keeps a chapter that has a completed revision',()=>{
  const {chapters}=revertLearned([pending()],[chapter({revisions:[{pass:'R1',dueOn:'2026-10-12',doneOn:'2026-10-09'}]})],'p1');
  expect(chapters).toHaveLength(1);
 });
 it('keeps a chapter with the PYQ ticked',()=>{
  const {chapters}=revertLearned([pending()],[chapter({pyqDone:true})],'p1');
  expect(chapters).toHaveLength(1);
 });
 it('keeps a chapter learned on another day',()=>{
  const {chapters}=revertLearned([pending()],[chapter({learnedOn:'2026-09-01'})],'p1');
  expect(chapters).toHaveLength(1);
 });
 it('matches chapter names case-insensitively with surrounding space',()=>{
  const {chapters}=revertLearned([pending()],[chapter({name:'  Integrals '})],'p1');
  expect(chapters).toEqual([]);
 });
 it('is a no-op for a topic that was never marked learned',()=>{
  const original=[pending({doneOn:undefined})],chapters=[chapter()];
  expect(revertLearned(original,chapters,'p1')).toEqual({pending:original,chapters});
 });
 it('is a no-op for an unknown id',()=>{
  const original=[pending()],chapters=[chapter()];
  expect(revertLearned(original,chapters,'nope')).toEqual({pending:original,chapters});
 });
 it('only touches the requested topic',()=>{
  const other=pending({id:'p2',name:'Vectors',doneOn:'2026-10-08'});
  const {pending:next}=revertLearned([pending(),other],[chapter()],'p1');
  expect(next.find(item=>item.id==='p1')?.doneOn).toBeUndefined();
  expect(next.find(item=>item.id==='p2')?.doneOn).toBe('2026-10-08');
 });
});
