import {describe,expect,it} from 'vitest';
import {addDays,buildRevisions,completeRevisionOn,getDueItems} from './dates';
import {derivePhases} from './phases';
import {scheduleBacklog} from './backlog';
import {behindFlags} from './flags';
import {DEFAULT_BUFFER_DAYS,DEFAULT_ESTIMATED_DAYS,inferPendingTopics,normalizePendingTopics,replanPendingTopic} from './setup-pending';
import type {Chapter,ExamDates,PendingTopic} from './types';

const exam:ExamDates={practicals:'2026-11-15',preBoards:'2026-12-01',boards:'2027-02-15',confirmed:{practicals:false,preBoards:false,boards:false}};
const chapter=(name:string,revisions:Chapter['revisions']):Chapter=>({id:name,subject:'maths',name,learnedOn:'2026-10-01',revisions,pyqDone:false});

describe('local date and revision schedule',()=>{
 it('builds R1 / R2 / R3 with the specified gaps',()=>expect(buildRevisions('2026-10-10').map(x=>x.dueOn)).toEqual(['2026-10-11','2026-10-17','2026-10-31']));
 it('maintains the minimum gap when a pass is completed late',()=>{const updated=completeRevisionOn(buildRevisions('2026-10-10'),'R1','2026-10-20');expect(updated[1].dueOn).toBe('2026-10-26')});
 it('keeps a failed retrieval open and schedules a retry tomorrow',()=>{const updated=completeRevisionOn(buildRevisions('2026-10-10'),'R1','2026-10-20','again');expect(updated[0]).toMatchObject({dueOn:'2026-10-21',lastResult:'again',attempts:[{date:'2026-10-20',result:'again'}]});expect(updated[0]).not.toHaveProperty('doneOn');expect(updated[1].dueOn).toBe('2026-10-17')});
 it('shortens the next interval after hard recall and logs the result',()=>{const updated=completeRevisionOn(buildRevisions('2026-10-10'),'R1','2026-10-20','hard');expect(updated[0]).toMatchObject({doneOn:'2026-10-20',lastResult:'hard'});expect(updated[1].dueOn).toBe('2026-10-23')});
 it('keeps the standard spacing after good recall',()=>expect(completeRevisionOn(buildRevisions('2026-10-10'),'R1','2026-10-20','good')[1].dueOn).toBe('2026-10-26'));
 it('sorts overdue before due and R1 before R3 within a status',()=>{const chapters=[chapter('due R3',[{pass:'R3',dueOn:'2026-10-20'}]),chapter('overdue R3',[{pass:'R3',dueOn:'2026-10-18'}]),chapter('overdue R1',[{pass:'R1',dueOn:'2026-10-19'}])];expect(getDueItems(chapters,'2026-10-20').map(x=>x.chapter.name)).toEqual(['overdue R1','overdue R3','due R3'])});
 it('adds calendar days without crossing local timezone boundaries',()=>expect(addDays('2026-10-31',1)).toBe('2026-11-01'));
});

describe('derived phases and backlog',()=>{
 it('derives the default practical and pre-board windows',()=>{const phases=derivePhases(exam);expect(phases[2]).toMatchObject({start:'2026-10-26',end:'2026-11-15'});expect(phases[3]).toMatchObject({start:'2026-11-16',end:'2026-11-30'})});
 it('moves the practical sprint when the guessed date changes',()=>expect(derivePhases({...exam,practicals:'2026-11-20'})[2].start).toBe('2026-10-31'));
 it('spreads R1 through the selected range and anchors later passes',()=>{const rows=scheduleBacklog(Array.from({length:12},(_,i)=>({subject:'maths' as const,name:`Chapter ${i}`})),'2026-10-05','2026-10-25');for(const c of rows){const r1=c.revisions[0].dueOn;expect(r1>='2026-10-05'&&r1<='2026-10-25').toBe(true);expect(c.revisions[1].dueOn).toBe(addDays(r1,6));expect(c.revisions[2].dueOn).toBe(addDays(r1,20))}});
});

describe('behind schedule flags',()=>{
 it('asks for a revised plan instead of shaming an expired learning target',()=>{const pending:PendingTopic[]=[{id:'late',subject:'maths',name:'ITF',due:'2026-10-11'}];const flags=behindFlags({pending,scores:[],days:{},chapters:[],today:'2026-10-12'});expect(flags[0]).toMatchObject({severity:'amber',id:'late-late',text:'MATHS: "ITF" needs a revised learning plan. Its target was 2026-10-11; adjust its study estimate or surplus in setup.'})});
 it('shows the learn-by target with the planned study time and surplus',()=>{const pending:PendingTopic[]=[{id:'soon',subject:'maths',name:'Application of Integrals',due:'2026-10-11',plannedStart:'2026-10-04',estimatedDays:5,bufferDays:2}];const flags=behindFlags({pending,scores:[],days:{},chapters:[],today:'2026-10-10'});expect(flags[0]).toMatchObject({severity:'amber',id:'soon-soon',text:'MATHS: "Application of Integrals" has a planned learn-by target tomorrow (5 study days + 2 surplus).'})});
});

describe('learning-time estimates and surplus',()=>{
 it('moves legacy active topics onto the editable 4-day estimate plus 2-day buffer',()=>{const [topic]=normalizePendingTopics([{id:'legacy',subject:'maths',name:'Application of Integrals',due:'2026-10-05'}],'2026-10-04');expect(topic).toMatchObject({plannedStart:'2026-10-04',estimatedDays:DEFAULT_ESTIMATED_DAYS,bufferDays:DEFAULT_BUFFER_DAYS,due:'2026-10-10'})});
 it('recomputes the learn-by date from a user estimate and surplus',()=>{const [topic]=normalizePendingTopics([{id:'new',subject:'maths',name:'Integrals',due:'2026-10-04'}],'2026-10-04');expect(replanPendingTopic(topic,{estimatedDays:4,bufferDays:3})).toMatchObject({estimatedDays:4,bufferDays:3,due:'2026-10-11'})});
 it('spreads planned starts across the available learning window',()=>{const drafts=[0,1,2].map(i=>({subject:'maths' as const,name:`Topic ${i}`,finished:false,key:`m-${i}`}));expect(inferPendingTopics(drafts,'2026-10-04','2026-10-06').map(topic=>[topic.plannedStart,topic.due])).toEqual([['2026-10-04','2026-10-10'],['2026-10-05','2026-10-11'],['2026-10-06','2026-10-12']])});
});