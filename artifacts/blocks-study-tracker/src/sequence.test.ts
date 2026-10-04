import {describe,expect,it} from 'vitest';
import {moveName,sameName} from './sequence';
import {paceBacklog} from './pacing';
import {resolveBlock} from './targets';
import {WEEK_TEMPLATE} from './seed';
import type {Chapter,ErrorEntry,PaperSlot,ScoreEntry} from './types';
import type {PendingTopic,SubjectId} from './types';

const TODAY='2026-10-04';
const DEADLINE='2026-12-01';
const topic=(id:string,subject:SubjectId='maths',name=id):PendingTopic=>({id,subject,name});
const starts=(list:ReturnType<typeof paceBacklog>)=>Object.fromEntries(list.map(p=>[p.id,p.plannedStart]));

describe('sameName',()=>{
 it('matches names regardless of case and stray spaces',()=>{
  expect(sameName('Inverse Trigonometric Functions',' inverse trigonometric functions ')).toBe(true);
  expect(sameName('Definite Integrals','Definite Integrals')).toBe(true);
  expect(sameName('Definite Integrals','Indefinite Integrals')).toBe(false);
 });
});

describe('moveName',()=>{
 const names=['alpha','beta','gamma'];
 it('moves a name up the list',()=>{
  expect(moveName(names,'gamma',0)).toEqual(['gamma','alpha','beta']);
 });
 it('moves a name down the list',()=>{
  expect(moveName(names,'alpha',2)).toEqual(['beta','gamma','alpha']);
 });
 it('clamps an out-of-range target to the end',()=>{
  expect(moveName(names,'alpha',99)).toEqual(['beta','gamma','alpha']);
  expect(moveName(names,'gamma',-5)).toEqual(['gamma','alpha','beta']);
 });
 it('matches the name case-insensitively',()=>{
  expect(moveName(['Alpha','beta'],'alpha',1)).toEqual(['beta','Alpha']);
 });
 it('returns the same list when the name is unknown or the position is unchanged',()=>{
  expect(moveName(names,'delta',0)).toBe(names);
  expect(moveName(names,'alpha',0)).toBe(names);
 });
});

describe('paceBacklog follows the manual sequence',()=>{
 it('chains topics in the exact manual order instead of curriculum order',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,order:{maths:['m2','m0','m1']}});
  const at=starts(paced);
  expect(at.m2).toBe('2026-10-05');
  expect(at.m0).toBe('2026-10-10');
  expect(at.m1).toBe('2026-10-15');
 });

 it('lets manual order override a school-finished chapter sinking',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,order:{maths:['m1','m0','m2']},school:{done:{maths:['m1']},expected:{}}});
  const at=starts(paced);
  expect(at.m1).toBe('2026-10-05');
  expect(at.m0).toBe('2026-10-10');
  expect(at.m2).toBe('2026-10-15');
 });

 it('places every unplaced chapter after every placed chapter',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,order:{maths:['m1']}});
  const at=starts(paced);
  expect(at.m1).toBe('2026-10-05');
  expect(at.m0).toBe('2026-10-10');
  expect(at.m2).toBe('2026-10-15');
 });

 it('leaves other subjects on automatic order',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('p0','physics')],{today:TODAY,deadline:DEADLINE,order:{maths:['m1','m0']}});
  const at=starts(paced);
  expect(at.m1).toBe('2026-10-05');
  expect(at.m0).toBe('2026-10-10');
  expect(at.p0).toBe('2026-10-05');
 });

 it('falls back to priority order when the saved order for a subject is empty',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,order:{maths:[]}});
  expect(starts(paced).m0).toBe('2026-10-05');
  expect(starts(paced).m1).toBe('2026-10-10');
  expect(starts(paced).m2).toBe('2026-10-15');
 });
});

describe('blocks follow the manual sequence',()=>{
 const ctx={length:'75 min',today:'2026-10-06',paperMode:false,chapters:[] as Chapter[],errors:[] as ErrorEntry[],scores:[] as ScoreEntry[],papers:[] as PaperSlot[]};
 it('points the morning maths block at the first chapter of the custom order',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1')],{today:TODAY,deadline:DEADLINE,order:{maths:['m1','m0']}});
  const resolved=resolveBlock({...ctx,plan:WEEK_TEMPLATE[1].A,paced});
  expect(resolved.target).toBe('Active: m1');
 });
 it('falls back to the default first chapter when no order is saved',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1')],{today:TODAY,deadline:DEADLINE});
  const resolved=resolveBlock({...ctx,plan:WEEK_TEMPLATE[1].A,paced});
  expect(resolved.target).toBe('Active: m0');
 });
 it('never surfaces a later chapter while an earlier one in the sequence is unfinished',()=>{
  const paced=paceBacklog([topic('m0'),topic('m1'),topic('m2')],{today:TODAY,deadline:DEADLINE,order:{maths:['m2','m0','m1']}});
  const resolved=resolveBlock({...ctx,plan:WEEK_TEMPLATE[1].A,paced});
  expect(resolved.target).toBe('Active: m2');
  expect(resolved.target).not.toContain('m0');
 });
});
