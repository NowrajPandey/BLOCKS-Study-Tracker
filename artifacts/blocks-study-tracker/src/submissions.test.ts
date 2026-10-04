import {describe,expect,it} from 'vitest';
import {addDays} from './dates';
import {planSubmissions,dueLabel,sliceLabel} from './submissions';
import {resolveBlock} from './targets';
import type {SubmissionPlan} from './submissions';
import type {BlockCtx} from './targets';
import type {Submission} from './types';

const TODAY='2026-10-04';
const sub=(over:Partial<Submission>):Submission=>({id:'s',title:'Project',subject:'maths',deadline:addDays(TODAY,5),hours:4,...over});

describe('submission slicing',()=>{
 it('spreads the estimated hours evenly across the days left',()=>{
  const plan=planSubmissions([sub({deadline:addDays(TODAY,3),hours:4})],TODAY)[0];
  expect(plan.daysLeft).toBe(3);
  expect(plan.totalMin).toBe(240);
  expect(plan.paceMin).toBe(60);
  expect(plan.minutesToday).toBe(60);
  expect(plan.atRisk).toBe(false);
 });

 it('never claims more than the per-submission daily cap',()=>{
  const plan=planSubmissions([sub({deadline:addDays(TODAY,1),hours:8})],TODAY)[0];
  expect(plan.paceMin).toBe(240);
  expect(plan.minutesToday).toBe(90);
  expect(plan.atRisk).toBe(true);
 });

 it('shares the day budget, earliest deadline first, and reports what did not fit',()=>{
  const plans=planSubmissions([
   sub({id:'a',title:'Alpha',deadline:addDays(TODAY,1),hours:3}),
   sub({id:'b',title:'Beta',deadline:addDays(TODAY,1),hours:3}),
   sub({id:'c',title:'Gamma',deadline:addDays(TODAY,1),hours:3})
  ],TODAY);
  expect(plans.map(p=>[p.submission.title,p.minutesToday])).toEqual([['Alpha',90],['Beta',90],['Gamma',0]]);
  expect(plans[2].atRisk).toBe(true);
 });

 it('keeps a submission that is not due yet out of the urgent set',()=>{
  const plan=planSubmissions([sub({deadline:addDays(TODAY,4)})],TODAY)[0];
  expect(plan.daysLeft).toBe(4);
  expect(plan.urgent).toBe(false);
  expect(plan.overdue).toBe(false);
 });

 it('marks anything due within three days urgent',()=>{
  const plans=planSubmissions([sub({id:'a',deadline:addDays(TODAY,3)}),sub({id:'b',deadline:TODAY}),sub({id:'c',deadline:addDays(TODAY,-2)})],TODAY);
  expect(plans.map(p=>p.urgent)).toEqual([true,true,true]);
 });

 it('keeps overdue work in the plan and flags it',()=>{
  const plans=planSubmissions([sub({deadline:addDays(TODAY,-2),hours:2})],TODAY);
  expect(plans).toHaveLength(1);
  expect(plans[0].overdue).toBe(true);
  expect(plans[0].daysLeft).toBe(-2);
  expect(plans[0].paceMin).toBe(120);
 });

 it('skips submissions that were already handed in',()=>{
  const plans=planSubmissions([sub({doneOn:TODAY}),sub({id:'b',title:'Still open'})],TODAY);
  expect(plans.map(p=>p.submission.id)).toEqual(['b']);
 });

 it('orders by deadline, then title',()=>{
  const plans=planSubmissions([
   sub({id:'late',title:'Zeta',deadline:addDays(TODAY,9)}),
   sub({id:'first',title:'Beta',deadline:addDays(TODAY,1)}),
   sub({id:'second',title:'Alpha',deadline:addDays(TODAY,1)})
  ],TODAY);
  expect(plans.map(p=>p.submission.id)).toEqual(['second','first','late']);
 });

 it('labels urgency and the daily slice for the UI',()=>{
  expect(dueLabel(planSubmissions([sub({deadline:addDays(TODAY,-1)})],TODAY)[0])).toBe('OVERDUE 1D');
  expect(dueLabel(planSubmissions([sub({deadline:TODAY})],TODAY)[0])).toBe('DUE TODAY');
  expect(dueLabel(planSubmissions([sub({deadline:addDays(TODAY,1)})],TODAY)[0])).toBe('DUE TOMORROW');
  expect(dueLabel(planSubmissions([sub({deadline:addDays(TODAY,5)})],TODAY)[0])).toBe('DUE IN 5D');
  expect(sliceLabel(planSubmissions([sub({deadline:addDays(TODAY,1),hours:3})],TODAY)[0])).toBe('90 MIN TODAY');
  expect(sliceLabel(planSubmissions([
   sub({id:'a',title:'Alpha',deadline:addDays(TODAY,1),hours:3}),
   sub({id:'b',title:'Beta',deadline:addDays(TODAY,1),hours:3}),
   sub({id:'c',title:'Gamma',deadline:addDays(TODAY,1),hours:3})
  ],TODAY)[2])).toBe('NO ROOM TODAY');
 });
});

describe('block takeover',()=>{
 const ctx=(slices:SubmissionPlan[]):BlockCtx=>({plan:{subject:'maths',focus:'New topic or practice'},length:'75 min',today:TODAY,paperMode:false,chapters:[],errors:[],scores:[],papers:[],paced:[],slices});
 const plan=(over:Partial<Submission>)=>planSubmissions([sub(over)],TODAY)[0];

 it('lets an urgent submission take over the block and keeps the original task as the follow-on',()=>{
  const res=resolveBlock(ctx([plan({deadline:addDays(TODAY,2),hours:2})]));
  expect(res.heading).toBe('Project');
  expect(res.target).toContain('DUE IN 2D');
  expect(res.target).toMatch(/\d+ min submission/);
  expect(res.target).toContain('then New topic or practice');
  expect(res.schedule).toContain('SUBMISSION FIRST');
 });

 it('leaves the study plan alone while a deadline is still far off',()=>{
  const res=resolveBlock(ctx([plan({deadline:addDays(TODAY,8)})]));
  expect(res.heading).toBe('New topic or practice');
  expect(res.target).toBeUndefined();
  expect(res.submissions).toHaveLength(1);
 });

 it('resolves normally when no submissions are scheduled',()=>{
  const res=resolveBlock(ctx([]));
  expect(res.heading).toBe('New topic or practice');
  expect(res.submissions).toBeUndefined();
 });
});
