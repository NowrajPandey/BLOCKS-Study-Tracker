import {create} from 'zustand';
import {createJSONStorage,persist} from 'zustand/middleware';
import {addDays,buildRevisions,completeRevisionOn,todayISO} from './dates';
import {scheduleBacklog} from './backlog';
import {DEFAULT_EXAM_DATES,derivePhases} from './phases';
import {PRACTICAL_STARTER,SEED_SCORES} from './seed';
import {pendingTopicKey,purgeLegacySeedPending} from './setup-pending';
import {applyPendingOverride,clearPendingOverride,paceBacklog} from './pacing';
import {revertLearned} from './revert';
import {DEFAULT_HARDNESS} from './priority';
import {moveName} from './sequence';
import type {BlockId,Chapter,DayLog,ErrorEntry,ErrorReason,ExamDates,MockPractical,PaperSlot,Pass,PendingTopic,PracticalItem,RecallResult,SchoolSync,ScoreEntry,Settings,StudyMethod,StudySession,SubjectId,Submission,WeeklyReview} from './types';

type State={
 chapters:Chapter[];errors:ErrorEntry[];days:Record<string,DayLog>;reviews:WeeklyReview[];milestonesDone:Record<string,boolean>;settings:Settings;schoolSync:SchoolSync;manualOrder:Partial<Record<SubjectId,string[]>>;
  scores:ScoreEntry[];pending:PendingTopic[];papers:PaperSlot[];submissions:Submission[];practicalChecks:Record<string,boolean>;practicalItems:PracticalItem[];mockPracticals:MockPractical[];sessions:StudySession[];setupDone:boolean;setupDismissed:boolean;
 addChapter:(subject:SubjectId,name:string,learnedOn?:string)=>void;editChapter:(id:string,patch:Partial<Pick<Chapter,'subject'|'name'|'learnedOn'>>)=>void;completeRevision:(id:string,pass:Pass,result:RecallResult)=>void;togglePyq:(id:string)=>void;deleteChapter:(id:string)=>void;
 toggleBlock:(date:string,b:BlockId)=>void;setMinimumDay:(date:string,on:boolean)=>void;toggleMinimum:(date:string,key:'maths'|'revision')=>void;addFocusMinutes:(date:string,minutes:number)=>void;addStudySession:(entry:{subject:SubjectId;minutes:number;method:StudyMethod;date?:string})=>void;togglePracticalToday:(date:string)=>void;
 addError:(e:{subject:SubjectId;topic:string;reason:ErrorReason;fix:string;date?:string})=>void;redoError:(id:string)=>void;deleteError:(id:string)=>void;
 saveReview:(r:WeeklyReview)=>void;toggleMilestone:(key:string)=>void;setExamDate:(key:ExamDatesConfirmed,date:string,confirmed:boolean)=>void;setExamDates:(d:ExamDates)=>void;
  toggleSchoolDone:(subject:SubjectId,name:string)=>void;setSchoolExpected:(subject:SubjectId,date:string)=>void;setHardness:(subject:SubjectId,value:number)=>void;
  moveManualItem:(subject:SubjectId,name:string,toIndex:number)=>void;clearManualOrder:(subject:SubjectId)=>void;
   addScore:(s:Omit<ScoreEntry,'id'>)=>void;deleteScore:(id:string)=>void;markPendingLearned:(id:string)=>void;unmarkPendingLearned:(id:string)=>void;setPendingOverride:(id:string,patch:{plannedStart:string;estimatedDays:number})=>void;clearPendingOverride:(id:string)=>void;deletePending:(id:string)=>void;addPending:(x:Omit<PendingTopic,'id'|'doneOn'>)=>void;
  addPaper:(p:Omit<PaperSlot,'id'>)=>void;removePaper:(id:string)=>void;addSubmission:(x:Omit<Submission,'id'>)=>void;editSubmission:(id:string,patch:Partial<Omit<Submission,'id'>>)=>void;deleteSubmission:(id:string)=>void;completeSubmission:(id:string)=>void;reopenSubmission:(id:string)=>void;togglePractical:(key:string)=>void;addPractical:(subject:SubjectId,text:string)=>void;editPractical:(id:string,text:string)=>void;deletePractical:(id:string)=>void;addMock:(m:Omit<MockPractical,'id'>)=>void;deleteMock:(id:string)=>void;
   finishSetup:(finished:{subject:SubjectId;name:string}[],pendingDraft:PendingTopic[])=>void;skipSetup:()=>void;exportAll:()=>string;importAll:(json:string)=>void;resetAll:()=>void;
};
type ExamDatesConfirmed='practicals'|'preBoards'|'boards';
const emptyDay=(date:string):DayLog=>({date,blocksDone:{A:false,B:false,C:false},minimumDay:false,minimumDone:{maths:false,revision:false},focusMinutes:0});
const id=()=>crypto.randomUUID();
const initial=()=>({chapters:[],errors:[],days:{},reviews:[],milestonesDone:{},settings:{examDates:DEFAULT_EXAM_DATES,hardness:{...DEFAULT_HARDNESS}},schoolSync:{done:{},expected:{}} as SchoolSync,manualOrder:{} as Partial<Record<SubjectId,string[]>>,scores:SEED_SCORES.map(s=>({...s,id:id()})),pending:[] as PendingTopic[],papers:[],submissions:[] as Submission[],practicalChecks:{},practicalItems:PRACTICAL_STARTER.map(x=>({...x})),mockPracticals:[],sessions:[],setupDone:false,setupDismissed:false});
export const useStore=create<State>()(persist((set,get)=>({
 ...initial(),
 addChapter:(subject,name,learnedOn=todayISO())=>{if(!name.trim())return;set(s=>({chapters:[...s.chapters,{id:id(),subject,name:name.trim(),learnedOn,revisions:buildRevisions(learnedOn),pyqDone:false}]}))},
 editChapter:(chapterId,patch)=>set(s=>({chapters:s.chapters.map(c=>c.id===chapterId?{...c,...patch,...(patch.learnedOn?{revisions:buildRevisions(patch.learnedOn)}:{})}:c)})),
  completeRevision:(chapterId,pass,result)=>set(s=>({chapters:s.chapters.map(c=>c.id===chapterId?{...c,revisions:completeRevisionOn(c.revisions,pass,todayISO(),result)}:c)})),
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
  toggleSchoolDone:(subject,name)=>set(s=>{const key=name.trim().toLowerCase(),list=s.schoolSync.done[subject]??[],has=list.some(n=>n.trim().toLowerCase()===key);return{schoolSync:{...s.schoolSync,done:{...s.schoolSync.done,[subject]:has?list.filter(n=>n.trim().toLowerCase()!==key):[...list,name.trim()]}}}}),
  setSchoolExpected:(subject,date)=>set(s=>({schoolSync:{...s.schoolSync,expected:{...s.schoolSync.expected,[subject]:date}}})),
  setHardness:(subject,value)=>set(s=>({settings:{...s.settings,hardness:{...s.settings.hardness,[subject]:Number.isFinite(value)?Math.min(2,Math.max(0,value)):DEFAULT_HARDNESS[subject]}}})),
  moveManualItem:(subject,name,toIndex)=>set(s=>{
   const chain=paceBacklog(s.pending,{today:todayISO(),deadline:s.settings.examDates.preBoards,school:s.schoolSync,hardness:s.settings.hardness,order:s.manualOrder}).filter(p=>p.subject===subject&&!p.overridden).map(p=>p.name);
   const next=moveName(chain,name,toIndex);
   if(next===chain)return{};
   return{manualOrder:{...s.manualOrder,[subject]:next}};
  }),
  clearManualOrder:subject=>set(s=>{const next={...s.manualOrder};delete next[subject];return{manualOrder:next}}),
 addScore:score=>set(s=>({scores:[{...score,id:id()},...s.scores]})),deleteScore:scoreId=>set(s=>({scores:s.scores.filter(x=>x.id!==scoreId)})),
    markPendingLearned:pendingId=>{const state=get(),topic=state.pending.find(p=>p.id===pendingId);if(!topic||topic.doneOn)return;const learnedOn=todayISO(),target=paceBacklog(state.pending,{today:learnedOn,deadline:state.settings.examDates.preBoards,school:state.schoolSync,hardness:state.settings.hardness,order:state.manualOrder}).find(p=>p.id===pendingId)?.due,existing=state.chapters.find(c=>c.subject===topic.subject&&c.name.trim().toLowerCase()===topic.name.trim().toLowerCase());if(existing)get().editChapter(existing.id,{learnedOn});else get().addChapter(topic.subject,topic.name,learnedOn);set(s=>({pending:s.pending.map(p=>p.id===pendingId?{...p,doneOn:learnedOn,...(target&&!p.due?{due:target}:{})}:p)}))},
  unmarkPendingLearned:pendingId=>set(s=>revertLearned(s.pending,s.chapters,pendingId)),
  setPendingOverride:(pendingId,patch)=>set(s=>({pending:s.pending.map(p=>p.id===pendingId?applyPendingOverride(p,patch):p)})),
   clearPendingOverride:pendingId=>set(s=>({pending:s.pending.map(p=>p.id===pendingId?clearPendingOverride(p):p)})),
   deletePending:pendingId=>set(s=>{
    const topic=s.pending.find(p=>p.id===pendingId);
    if(!topic)return{};
    const pending=s.pending.filter(p=>p.id!==pendingId);
    const stored=s.manualOrder[topic.subject];
    if(!stored)return{pending};
    const key=topic.name.trim().toLowerCase(),nextOrder=stored.filter(name=>name.trim().toLowerCase()!==key);
    const manualOrder={...s.manualOrder,[topic.subject]:nextOrder};
    if(!nextOrder.length)delete manualOrder[topic.subject];
    return{pending,manualOrder};
   }),
 addPending:x=>set(s=>({pending:[...s.pending,{...x,id:id()}]})),
  addPaper:p=>set(s=>({papers:[...s.papers,{...p,id:id()}].sort((a,b)=>a.date.localeCompare(b.date))})),removePaper:paperId=>set(s=>({papers:s.papers.filter(p=>p.id!==paperId)})),
   addSubmission:x=>set(s=>({submissions:[...s.submissions,{...x,hours:Math.max(x.hours,0.25),id:id()}].sort((a,b)=>a.deadline.localeCompare(b.deadline))})),
   editSubmission:(submissionId,patch)=>set(s=>({submissions:s.submissions.map(item=>item.id===submissionId?{...item,...patch,...(patch.hours!==undefined?{hours:Math.max(patch.hours,0.25)}:{})}:item).sort((a,b)=>a.deadline.localeCompare(b.deadline))})),
   deleteSubmission:submissionId=>set(s=>({submissions:s.submissions.filter(item=>item.id!==submissionId)})),
   completeSubmission:submissionId=>set(s=>({submissions:s.submissions.map(item=>item.id===submissionId&&!item.doneOn?{...item,doneOn:todayISO()}:item)})),
   reopenSubmission:submissionId=>set(s=>({submissions:s.submissions.map(item=>item.id===submissionId?{...item,doneOn:undefined}:item)})),
 togglePractical:key=>set(s=>({practicalChecks:{...s.practicalChecks,[key]:!s.practicalChecks[key]}})),
 addPractical:(subject,text)=>{if(text.trim())set(s=>({practicalItems:[...s.practicalItems,{id:id(),subject,text:text.trim()}]}))},
 editPractical:(itemId,text)=>set(s=>({practicalItems:s.practicalItems.map(x=>x.id===itemId?{...x,text}:x)})),deletePractical:itemId=>set(s=>({practicalItems:s.practicalItems.filter(x=>x.id!==itemId)})),
 addMock:m=>set(s=>({mockPracticals:[{...m,id:id()},...s.mockPracticals]})),deleteMock:mockId=>set(s=>({mockPracticals:s.mockPracticals.filter(x=>x.id!==mockId)})),
   finishSetup:(finished,pendingDraft)=>{const state=get(),phases=derivePhases(state.settings.examDates),today=todayISO(),start=today>phases[1].start?today:phases[1].start,end=phases[1].end>=start?phases[1].end:addDays(start,14),known=new Set(state.chapters.map(c=>`${c.subject}:${c.name.trim().toLowerCase()}`)),unique=finished.filter(c=>!known.has(`${c.subject}:${c.name.trim().toLowerCase()}`));const created=scheduleBacklog(unique,start,end),completed=state.pending.filter(p=>p.doneOn),completedKeys=new Set(completed.map(p=>pendingTopicKey(p.subject,p.name))),chapterKeys=new Set([...state.chapters,...created].map(c=>pendingTopicKey(c.subject,c.name))),active=pendingDraft.filter(p=>!completedKeys.has(pendingTopicKey(p.subject,p.name))&&!chapterKeys.has(pendingTopicKey(p.subject,p.name)));set(s=>({chapters:[...s.chapters,...created],pending:[...completed,...active],setupDone:true,setupDismissed:true}))},
  skipSetup:()=>set({setupDismissed:true}),
  exportAll:()=>{const {chapters,errors,days,reviews,milestonesDone,settings,schoolSync,manualOrder,scores,pending,papers,submissions,practicalChecks,practicalItems,mockPracticals,sessions,setupDone,setupDismissed}=get();return JSON.stringify({chapters,errors,days,reviews,milestonesDone,settings,schoolSync,manualOrder,scores,pending,papers,submissions,practicalChecks,practicalItems,mockPracticals,sessions,setupDone,setupDismissed},null,2)},
 importAll:json=>{const d=JSON.parse(json) as Partial<State>,base=initial();set({
   ...base,...d,setupDismissed:d.setupDismissed??false,
   settings:{...base.settings,...d.settings,hardness:{...DEFAULT_HARDNESS,...d.settings?.hardness},examDates:{...DEFAULT_EXAM_DATES,...d.settings?.examDates,confirmed:{...DEFAULT_EXAM_DATES.confirmed,...d.settings?.examDates?.confirmed}}},
   schoolSync:{done:{...d.schoolSync?.done},expected:{...d.schoolSync?.expected}},
   scores:d.scores??base.scores,papers:d.papers??base.papers,practicalChecks:d.practicalChecks??base.practicalChecks,
    practicalItems:d.practicalItems??base.practicalItems,mockPracticals:d.mockPracticals??base.mockPracticals,sessions:d.sessions??base.sessions,
    submissions:d.submissions??base.submissions,
    pending:purgeLegacySeedPending(d.pending??base.pending)
  })},
 resetAll:()=>set(initial())
}),{
  name:'blocks-study-app-v1',version:8,storage:createJSONStorage(()=>localStorage),
  migrate:(persisted,version)=>{
   const old=(persisted??{}) as Partial<State>;
    let merged:State;
    if(version<3){
     const base=initial();
    merged={
       ...base,...old,setupDismissed:old.setupDismissed??false,
      settings:{...base.settings,...old.settings,examDates:{
       ...DEFAULT_EXAM_DATES,...old.settings?.examDates,
       confirmed:old.settings?.examDates?.confirmed??{...DEFAULT_EXAM_DATES.confirmed}
      }},
      scores:old.scores??base.scores,
      pending:old.pending??base.pending,papers:old.papers??[],
      practicalChecks:old.practicalChecks??{},practicalItems:old.practicalItems??base.practicalItems,
      mockPracticals:old.mockPracticals??[],sessions:old.sessions??[],setupDone:old.setupDone??((old.chapters?.length??0)>0)
    } as State;
    }else merged=persisted as State;
    if(version<4&&merged.pending)merged={...merged,pending:merged.pending.map(t=>t.doneOn?t:{id:t.id,subject:t.subject,name:t.name})};
    if(version<5)merged={...merged,
      settings:{examDates:merged.settings?.examDates??DEFAULT_EXAM_DATES,hardness:{...DEFAULT_HARDNESS,...merged.settings?.hardness}},
      schoolSync:{done:{...old.schoolSync?.done},expected:{...old.schoolSync?.expected}}
    };
    if(version<6)merged={...merged,manualOrder:merged.manualOrder??{}};
    if(version<7)merged={...merged,pending:purgeLegacySeedPending(merged.pending??[])};
    if(version<8)merged={...merged,submissions:merged.submissions??[]};
    return merged;
  },
}));