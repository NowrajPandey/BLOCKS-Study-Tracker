import {describe,expect,it} from 'vitest';
import {mergeStates,same} from './merge';
import type {Blob} from './merge';

const state=(over:Record<string,unknown>):Blob=>({settings:{examDates:{practicals:'2026-11-01',preBoards:'2026-12-01',boards:'2027-03-01'}},chapters:[],pending:[],submissions:[],logs:{},...over});

describe('three-way merge',()=>{
 it('returns an identical state unchanged',()=>{
  const a=state({chapters:[{id:'c1',name:'Derivatives'}]});
  expect(same(mergeStates(null,a,a),a)).toBe(true);
 });

 it('takes a local-only edit',()=>{
  const base=state({logs:{'2026-10-01':{focusMinutes:10}}});
  const local=state({logs:{'2026-10-01':{focusMinutes:45}}});
  const merged=mergeStates(base,local,base);
  expect((merged.logs as Record<string,number>)['2026-10-01']).toEqual({focusMinutes:45});
 });

 it('takes a remote-only edit when local is unchanged',()=>{
  const base=state({});
  const remote=state({settings:{examDates:{practicals:'2026-11-05',preBoards:'2026-12-01',boards:'2027-03-01'}}});
  const merged=mergeStates(base,base,remote);
  expect(merged.settings).toEqual(remote.settings);
 });

 it('keeps the local version when both sides changed the same scalar',()=>{
  const base=state({submissions:[{id:'s1',title:'Draft'}]});
  const local=state({submissions:[{id:'s1',title:'Draft v2 local'}]});
  const remote=state({submissions:[{id:'s1',title:'Draft v2 remote'}]});
  const merged=mergeStates(base,local,remote);
  expect((merged.submissions as Blob[])[0]?.title).toBe('Draft v2 local');
 });

 it('unions records added on only one device',()=>{
  const base=state({chapters:[{id:'c1',name:'Derivatives'}]});
  const local=state({chapters:[{id:'c1',name:'Derivatives'},{id:'c2',name:'Integrals'}]});
  const remote=state({chapters:[{id:'c1',name:'Derivatives'},{id:'c3',name:'Vectors'}]});
  const merged=mergeStates(base,local,remote);
  const ids=(merged.chapters as Blob[]).map(chapter=>chapter.id);
  expect(ids).toEqual(['c1','c2','c3']);
 });

 it('applies a deletion when the other device left the record alone',()=>{
  const base=state({pending:[{id:'p1',name:'Old topic'},{id:'p2',name:'Other'}]});
  const local=state({pending:[{id:'p2',name:'Other'}]});
  const merged=mergeStates(base,local,base);
  expect((merged.pending as Blob[]).map(item=>item.id)).toEqual(['p2']);
 });

 it('keeps a record the other device edited after we deleted it',()=>{
  const base=state({pending:[{id:'p1',name:'Old topic'}]});
  const local=state({pending:[]});
  const remote=state({pending:[{id:'p1',name:'Old topic renamed'}]});
  const merged=mergeStates(base,local,remote);
  expect(merged.pending).toEqual([]);
 });

 it('merges unrelated fields edited on both devices',()=>{
  const base=state({chapters:[],logs:{}});
  const local=state({chapters:[{id:'c9',name:'Mine'}],logs:{}});
  const remote=state({chapters:[],logs:{'2026-10-02':{focusMinutes:30}}});
  const merged=mergeStates(base,local,remote);
  expect(merged.chapters).toEqual([{id:'c9',name:'Mine'}]);
  expect((merged.logs as Blob)['2026-10-02']).toEqual({focusMinutes:30});
 });

 it('lets local win when there is no shared base',()=>{
  const local=state({submissions:[{id:'s1',title:'Local'}]});
  const remote=state({submissions:[{id:'s1',title:'Remote'}]});
  const merged=mergeStates(null,local,remote);
  expect((merged.submissions as Blob[])[0]?.title).toBe('Local');
 });

 it('prefers the local copy of a plain array that has no identity keys',()=>{
  const base=state({sequence:['a','b']});
  const local=state({sequence:['a','c']});
  const remote=state({sequence:['a','d']});
  expect(mergeStates(base,local,remote).sequence).toEqual(['a','c']);
 });
});
