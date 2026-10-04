import {describe,expect,it} from 'vitest';
import {addDays,buildRevisions,completeRevisionOn,getDueItems} from './dates';
import {derivePhases} from './phases';
import {scheduleBacklog} from './backlog';
import {behindFlags} from './flags';
import type {Chapter,ExamDates,PendingTopic} from './types';

const exam:ExamDates={practicals:'2026-11-15',preBoards:'2026-12-01',boards:'2027-02-15',confirmed:{practicals:false,preBoards:false,boards:false}};
const chapter=(name:string,revisions:Chapter['revisions']):Chapter=>({id:name,subject:'maths',name,learnedOn:'2026-10-01',revisions,pyqDone:false});

describe('local date and revision schedule',()=>{
 it('builds R1 / R2 / R3 with the specified gaps',()=>expect(buildRevisions('2026-10-10').map(x=>x.dueOn)).toEqual(['2026-10-11','2026-10-17','2026-10-31']));
 it('maintains the minimum gap when a pass is completed late',()=>{const updated=completeRevisionOn(buildRevisions('2026-10-10'),'R1','2026-10-20');expect(updated[1].dueOn).toBe('2026-10-26')});
 it('sorts overdue before due and R1 before R3 within a status',()=>{const chapters=[chapter('due R3',[{pass:'R3',dueOn:'2026-10-20'}]),chapter('overdue R3',[{pass:'R3',dueOn:'2026-10-18'}]),chapter('overdue R1',[{pass:'R1',dueOn:'2026-10-19'}])];expect(getDueItems(chapters,'2026-10-20').map(x=>x.chapter.name)).toEqual(['overdue R1','overdue R3','due R3'])});
 it('adds calendar days without crossing local timezone boundaries',()=>expect(addDays('2026-10-31',1)).toBe('2026-11-01'));
});

describe('derived phases and backlog',()=>{
 it('derives the default practical and pre-board windows',()=>{const phases=derivePhases(exam);expect(phases[2]).toMatchObject({start:'2026-10-26',end:'2026-11-15'});expect(phases[3]).toMatchObject({start:'2026-11-16',end:'2026-11-30'})});
 it('moves the practical sprint when the guessed date changes',()=>expect(derivePhases({...exam,practicals:'2026-11-20'})[2].start).toBe('2026-10-31'));
 it('spreads R1 through the selected range and anchors later passes',()=>{const rows=scheduleBacklog(Array.from({length:12},(_,i)=>({subject:'maths' as const,name:`Chapter ${i}`})),'2026-10-05','2026-10-25');for(const c of rows){const r1=c.revisions[0].dueOn;expect(r1>='2026-10-05'&&r1<='2026-10-25').toBe(true);expect(c.revisions[1].dueOn).toBe(addDays(r1,6));expect(c.revisions[2].dueOn).toBe(addDays(r1,20))}});
});

describe('behind schedule flags',()=>{
 it('marks overdue pending topics as a red flag',()=>{const pending:PendingTopic[]=[{id:'late',subject:'maths',name:'ITF',due:'2026-10-11'}];const flags=behindFlags({pending,scores:[],days:{},chapters:[],today:'2026-10-12'});expect(flags[0]).toMatchObject({severity:'red',id:'late-late'})});
 it('labels a pending topic deadline tomorrow as a learn-by deadline',()=>{const pending:PendingTopic[]=[{id:'soon',subject:'maths',name:'Application of Integrals',due:'2026-10-11'}];const flags=behindFlags({pending,scores:[],days:{},chapters:[],today:'2026-10-10'});expect(flags[0]).toMatchObject({severity:'amber',id:'soon-soon',text:'MATHS: "Application of Integrals" has a learn-by deadline tomorrow.'})});
});