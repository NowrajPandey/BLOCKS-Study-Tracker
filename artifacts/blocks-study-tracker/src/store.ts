import {create} from 'zustand';
import {createJSONStorage,persist} from 'zustand/middleware';
import {addDays,buildRevisions,completeRevisionOn,todayISO} from './dates';
import {scheduleBacklog} from './backlog';
import {DEFAULT_EXAM_DATES,derivePhases} from './phases';
import {PRACTICAL_STARTER,SEED_PENDING,SEED_SCORES} from './seed';
import type {BlockId,Chapter,DayLog,ErrorEntry,ErrorReason,ExamDates,MockPractical,PaperSlot,Pass,PendingTopic,PracticalItem,ScoreEntry,Settings,StudyMethod,StudySession,SubjectId,WeeklyReview} from './types';

type State={
 chapters:Chapter[];errors:ErrorEntry[];days:Record<string,DayLog>;reviews:WeeklyReview[];milestonesDone:Record<string,boolean>;settings:Settings;
  scores:ScoreEntry[];pending:PendingTopic[];papers:PaperSlot[];practicalChecks:Record<string,boolean>;practicalItems:PracticalItem[];mockPracticals:MockPractical[];sessions:StudySession[];setupDone:boolean;setupDismissed:boolean;
 addChapter:(subject:SubjectId,name:string,learnedOn?:string)=>void;editChapter:(id:string,patch:Partial<Pick<Chapter,'subject'|'name'|'learnedOn'>>)=>void;completeRevision:(id:string,pass:Pass)=>void;togglePyq:(id:string)=>void;deleteChapter:(id:string)=>void;
 toggleBlock:(date:string,b:BlockId)=>void;setMinimumDay:(date:string,on:boolean)=>void;toggleMinimum:(date:string,key:'maths'|'revision')=>void;addFocusMinutes:(date:string,minutes:number)=>void;addStudySession:(entry:{subject:SubjectId;minutes:number;method:StudyMethod;date?:string})=>void;togglePracticalToday:(date:string)=>void;
 addError:(e:{subject:SubjectId;topic:string;reason:ErrorReason;fix:string;date?:string})=>void;redoError:(id:string)=>void;deleteError:(id:string)=>void;
 saveReview:(r:WeeklyReview)=>void;toggleMilestone:(key:string)=>void;setExamDate:(key:ExamDatesConfirmed,date:string,confirmed:boolean)=>void;setExamDates:(d:ExamDates)=>void;
 addScore:(s:Omit<ScoreEntry,'id'>)=>void;deleteScore:(id:string)=>void;markPendingLearned:(id:string)=>void;setPendingDue:(id:string,due:string)=>void;addPending:(x:Omit<PendingTopic,'id'|'doneOn'>)=>void;
 addPaper:(p:Omit<PaperSlot,'id'>)=>void;removePaper:(id:string)=>void;togglePractical:(key:string)=>void;addPractical:(subject:SubjectId,text:string)=>void;editPractical:(id:string,text:string)=>void;deletePractical:(id:string)=>void;addMock:(m:Omit<MockPractical,'id'>)=>void;deleteMock:(id:string)=>void;
  finishSetup:(finished:{subject:SubjectId;name:string}[])=>void;skipSetup:()=>void;exportAll:()=>string;importAll:(json:string)=>void;resetAll:()=>void;
};
type ExamDatesConfirmed='practicals'|'preBoards'|'boards';
const emptyDay=(date:string):DayLog=>({date,blocksDone:{A:false,B:false,C:false},minimumDay:false,minimumDone:{maths:false,revision:false},focusMinutes:0});
const id=()=>crypto.randomUUID();
const initial=()=>({chapters:[],errors:[],days:{},reviews:[],milestonesDone:{},settings:{examDates:DEFAULT_EXAM_DATES},scores:SEED_SCORES.map(s=>({...s,id:id()})),pending:SEED_PENDING.map(p=>({...p})),papers:[],practicalChecks:{},practicalItems:PRACTICAL_STARTER.map(x=>({...x})),mockPracticals:[],sessions:[],setupDone:false,setupDismissed:false});
export const useStore=create<State>()(persist((set,get)=>({
 ...initial(),
 addChapter:(subject,name,learnedOn=todayISO())=>{if(!name.trim())return;set(s=>({chapters:[...s.chapters,{id:id(),subject,name:name.trim(),learnedOn,revisions:buildRevisions(learnedOn),pyqDone:false}]}))},
 editChapter:(chapterId,patch)=>set(s=>({chapters:s.chapters.map(c=>c.id===chapterId?{...c,...patch,...(patch.learnedOn?{revisions:buildRevisions(patch.learnedOn)}:{})}:c)})),
 completeRevision:(chapterId,pass)=>set(s=>({chapters:s.chapters.map(c=>c.id===chapterId?{...c,revisions:completeRevisionOn(c.revisions,pass,todayISO())}:c)})),
 togglePyq:id=>set(s=>({chapters:s.chapters.map(c=>c.id===id?{...c,pyqDone:!c.pyqDone}:c)})),deleteChapter:id=>set(s=>({chapters:s.chapters.filter(c=>c.id!==id)})),
 toggleBlock:(date,b)=>set(s=>{const d=s.days[date]??emptyDay(date);return{days:{...s.days,[date]:{...d,blocksDone:{...d.blocksDone,[b]:!d.blocksDone[b]}}}}}),
 setMinimumDay:(date,on)=>set(s=>({days:{...s.days,[date]:{...(s.days[date]??emptyDay(date)),minimumDay:on}}})),
 toggleMinimum:(date,key)=>set(s=>{const d=s.days[date]??emptyDay(date);return{days:{...s.days,[date]:{...d,minimumDone:{...d.minimumDone,[key]:!d.minimumDone[key]}}}}}),
 addFocusMinutes:(date,minutes)=>set(s=>{const d=s.days[date]??emptyDay(date);return{days:{...s.days,[date]:{...d,focusMinutes:d.focusMinutes+minutes}}}}),
 addStudySession:entry=>set(s=>({sessions:[{...entry,date:entry.date??todayISO(),id:id()},...s.sessions]})),
 togglePracticalToday:date=>set(s=>{const d=s.days[date]??emptyDay(date);return{days:{...s.days,[date]:{...d,practicalDone:!d.practicalDone}}}}),
 addError:({subject,topic,reason,fix,date=todayISO()})=>set(s=>({errors:[{id:id(),subject,topic,reason,fix,date,redoOn:addDays(date,7)},...s.errors]})),
 redoError:errorId=>set(s=>({errors:s.errors.map(e=>e.id===errorId?{...e,redoneOn:todayISO()}:e)})),deleteError:errorId=>set(s=>({errors:s.errors.filter(e=>e.id!==errorId)})),
 saveReview:r=>set(s=>({reviews:[r,...s.reviews.filter(x=>x.weekStart!==r.weekStart)]})),toggleMilestone:key=>set(s=>({milestonesDone:{...s.milestonesDone,[key]:!s.milestonesDone[key]}})),
 setExamDate:(key,date,confirmed)=>set(s=>({settings:{...s.settings,examDates:{...s.settings.examDates,[key]:date,confirmed:{...s.settings.examDates.confirmed,[key]:confirmed}}}})),
 setExamDates:d=>set(s=>({settings:{...s.settings,examDates:d}})),
 addScore:score=>set(s=>({scores:[{...score,id:id()},...s.scores]})),deleteScore:scoreId=>set(s=>({scores:s.scores.filter(x=>x.id!==scoreId)})),
 markPendingLearned:pendingId=>{const topic=get().pending.find(p=>p.id===pendingId);if(!topic||topic.doneOn)return;get().addChapter(topic.subject,topic.name,todayISO());set(s=>({pending:s.pending.map(p=>p.id===pendingId?{...p,doneOn:todayISO()}:p)}))},
 setPendingDue:(pendingId,due)=>set(s=>({pending:s.pending.map(p=>p.id===pendingId?{...p,due}:p)})),
 addPending:x=>set(s=>({pending:[...s.pending,{...x,id:id()}]})),
 addPaper:p=>set(s=>({papers:[...s.papers,{...p,id:id()}].sort((a,b)=>a.date.localeCompare(b.date))})),removePaper:paperId=>set(s=>({papers:s.papers.filter(p=>p.id!==paperId)})),
 togglePractical:key=>set(s=>({practicalChecks:{...s.practicalChecks,[key]:!s.practicalChecks[key]}})),
 addPractical:(subject,text)=>{if(text.trim())set(s=>({practicalItems:[...s.practicalItems,{id:id(),subject,text:text.trim()}]}))},
 editPractical:(itemId,text)=>set(s=>({practicalItems:s.practicalItems.map(x=>x.id===itemId?{...x,text}:x)})),deletePractical:itemId=>set(s=>({practicalItems:s.practicalItems.filter(x=>x.id!==itemId)})),
 addMock:m=>set(s=>({mockPracticals:[{...m,id:id()},...s.mockPracticals]})),deleteMock:mockId=>set(s=>({mockPracticals:s.mockPracticals.filter(x=>x.id!==mockId)})),
  finishSetup:finished=>{const state=get(),phases=derivePhases(state.settings.examDates),today=todayISO(),start=today>phases[1].start?today:phases[1].start,end=phases[1].end>=start?phases[1].end:addDays(start,14),known=new Set(state.chapters.map(c=>`${c.subject}:${c.name.trim().toLowerCase()}`)),unique=finished.filter(c=>!known.has(`${c.subject}:${c.name.trim().toLowerCase()}`));const created=scheduleBacklog(unique,start,end);set(s=>({chapters:[...s.chapters,...created],setupDone:true,setupDismissed:true}))},
  skipSetup:()=>set({setupDismissed:true}),
  exportAll:()=>{const {chapters,errors,days,reviews,milestonesDone,settings,scores,pending,papers,practicalChecks,practicalItems,mockPracticals,sessions,setupDone,setupDismissed}=get();return JSON.stringify({chapters,errors,days,reviews,milestonesDone,settings,scores,pending,papers,practicalChecks,practicalItems,mockPracticals,sessions,setupDone,setupDismissed},null,2)},
 importAll:json=>{const d=JSON.parse(json) as Partial<State>,base=initial();set({
   ...base,...d,setupDismissed:d.setupDismissed??false,
   settings:{...base.settings,...d.settings,examDates:{...DEFAULT_EXAM_DATES,...d.settings?.examDates,confirmed:{...DEFAULT_EXAM_DATES.confirmed,...d.settings?.examDates?.confirmed}}},
  scores:d.scores??base.scores,pending:d.pending??base.pending,papers:d.papers??base.papers,practicalChecks:d.practicalChecks??base.practicalChecks,
  practicalItems:d.practicalItems??base.practicalItems,mockPracticals:d.mockPracticals??base.mockPracticals,sessions:d.sessions??base.sessions
 })},
 resetAll:()=>set(initial())
}),{
 name:'blocks-study-app-v1',version:2,storage:createJSONStorage(()=>localStorage),
  migrate:(persisted,version)=>{
   const old=(persisted??{}) as Partial<State>;
   if(version<2){
    const merged={
      ...initial(),...old,setupDismissed:old.setupDismissed??false,
     settings:{...initial().settings,...old.settings,examDates:{
       ...DEFAULT_EXAM_DATES,...old.settings?.examDates,
       confirmed:old.settings?.examDates?.confirmed??{...DEFAULT_EXAM_DATES.confirmed}
     }},
     scores:old.scores??SEED_SCORES.map(s=>({...s,id:id()})),
     pending:old.pending??SEED_PENDING.map(p=>({...p})),papers:old.papers??[],
     practicalChecks:old.practicalChecks??{},practicalItems:old.practicalItems??PRACTICAL_STARTER.map(x=>({...x})),
     mockPracticals:old.mockPracticals??[],sessions:old.sessions??[],setupDone:old.setupDone??((old.chapters?.length??0)>0)
    };
    return merged as State;
   }
   return persisted as State;
  },
}));