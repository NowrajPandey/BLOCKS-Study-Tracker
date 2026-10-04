import {daysBetween,formatDate,getDueItems} from './dates';
import {dueLabel} from './submissions';
import type {SubmissionPlan} from './submissions';
import type {QueuedRevision} from './daily';
import {CORE_SUBJECTS,SUBJECT_ORDER} from './seed';
import type {BlockPlan} from './seed';
import type {BlockId,Chapter,ErrorEntry,PaperSlot,ScoreEntry,SubjectId} from './types';
import type {PacedTopic} from './pacing';

const ALIAS:Record<SubjectId,string>={maths:'math',physics:'phys',chemistry:'chem',biology:'bio',english:'eng'};
const title=(subject:SubjectId)=>subject.charAt(0).toUpperCase()+subject.slice(1);
const clip=(text:string,max=44)=>text.length>max?`${text.slice(0,max-1)}…`:text;
const focusDuration=(focus:string,fallback:string)=>/\d+\s*h(?:ours?)?\b/i.exec(focus)?.[0]??fallback;
const isCore=(subject:SubjectId)=>CORE_SUBJECTS.includes(subject);
const fullTestCount=(scores:ScoreEntry[])=>scores.filter(s=>s.type==='full-paper'||s.type==='pre-board').length;
const latestTest=(scores:ScoreEntry[])=>[...scores].filter(s=>s.date&&['chapter-test','full-paper','pre-board'].includes(s.type)).sort((a,b)=>b.date!.localeCompare(a.date!))[0];

export interface BlockCtx {plan:BlockPlan;length:string;today:string;paperMode:boolean;chapters:Chapter[];errors:ErrorEntry[];scores:ScoreEntry[];papers:PaperSlot[];paced:PacedTopic[];revisions?:QueuedRevision[];slices?:SubmissionPlan[]}
export interface BlockResolution {heading:string;target?:string;schedule?:string;revisions?:QueuedRevision[];submissions?:SubmissionPlan[]}

type Choice={kind:'active';name:string;start:string}|{kind:'next';name:string;start:string}|{kind:'catch';name:string}|{kind:'practice';name:string};

function choice(subject:SubjectId,a:BlockCtx):Choice|undefined{
 const active=a.paced.find(t=>t.subject===subject&&t.plannedStart<=a.today&&a.today<=t.due);
 if(active)return{kind:'active',name:active.name,start:active.plannedStart};
 const upcoming=a.paced.filter(t=>t.subject===subject).sort((x,y)=>x.plannedStart.localeCompare(y.plannedStart))[0];
 if(upcoming)return upcoming.plannedStart<=a.today?{kind:'catch',name:upcoming.name}:{kind:'next',name:upcoming.name,start:upcoming.plannedStart};
 const practice=[...a.chapters].filter(ch=>ch.subject===subject&&!ch.pyqDone).sort((x,y)=>y.learnedOn.localeCompare(x.learnedOn))[0];
 if(practice)return{kind:'practice',name:practice.name};
 return undefined;
}

function subjectTarget(subject:SubjectId,a:BlockCtx):string|undefined{
 const pick=choice(subject,a);
 if(!pick)return undefined;
 if(pick.kind==='active')return `Active: ${pick.name}${pick.start===a.today?' · START TODAY':''}`;
 if(pick.kind==='next')return `Next: ${pick.name} · starts ${formatDate(pick.start,{day:'numeric',month:'short'})}`;
 if(pick.kind==='catch')return `Catch up: ${pick.name}`;
 return `Practice PYQs: ${pick.name}`;
}

function mixedTarget(a:BlockCtx):string|undefined{
 const focus=a.plan.focus.toLowerCase();
 const parts=SUBJECT_ORDER.filter(subject=>focus.includes(ALIAS[subject])).map(subject=>{
  const pick=choice(subject,a);
  if(!pick)return undefined;
  return `${title(subject)}: ${pick.name}${pick.kind==='next'?` (from ${formatDate(pick.start,{day:'numeric',month:'short'})})`:''}`;
 }).filter((part):part is string=>Boolean(part));
 return parts.length?parts.join(' · '):undefined;
}

function revisionItems(a:BlockCtx):QueuedRevision[]{
 if(a.revisions!==undefined)return a.revisions;
 return getDueItems(a.chapters,a.today).map(item=>({chapter:item.chapter,revision:item.revision,dueOn:item.revision.dueOn,scheduledOn:a.today,status:item.status}));
}

function flexTarget(a:BlockCtx):string|undefined{
 const items=revisionItems(a);
 const overdue=items.find(item=>item.status==='overdue');
 if(overdue)return `Overdue: ${overdue.revision.pass} on ${overdue.chapter.name}`;
 const behind=a.paced.filter(t=>t.due<a.today).sort((x,y)=>x.due.localeCompare(y.due))[0];
 if(behind)return `Behind: ${behind.name}`;
 const redo=a.errors.filter(e=>!e.redoneOn&&e.redoOn<=a.today).sort((x,y)=>x.redoOn.localeCompare(y.redoOn))[0];
 if(redo)return `Redo: ${redo.topic} - ${redo.fix.trim()?clip(redo.fix):`${redo.reason} fix`}`;
 const dueToday=items.find(item=>item.status==='due');
 if(dueToday)return `Due today: ${dueToday.revision.pass} on ${dueToday.chapter.name}`;
 return undefined;
}

function studyFallback(a:BlockCtx):string|undefined{
 const active=a.paced.find(t=>isCore(t.subject)&&t.plannedStart<=a.today&&a.today<=t.due);
 if(active)return `Backlog: ${active.name}`;
 const first=revisionItems(a)[0];
 if(first)return `Revision: ${first.chapter.name} · ${first.revision.pass}${first.status==='overdue'?' · overdue':''}`;
 const nextCore=a.paced.find(t=>isCore(t.subject));
 if(nextCore)return `Backlog: ${nextCore.name}`;
 const nextAny=a.paced[0];
 if(nextAny)return `Backlog: ${nextAny.name}`;
 const practice=[...a.chapters].filter(ch=>!ch.pyqDone).sort((x,y)=>y.learnedOn.localeCompare(x.learnedOn))[0];
 if(practice)return `Practice PYQs: ${practice.name}`;
 return undefined;
}

function testBlock(a:BlockCtx):BlockResolution{
 const day=formatDate(a.today,{weekday:'long'});
 const duration=focusDuration(a.plan.focus,'3 h');
 const upcoming=a.papers.filter(p=>isCore(p.subject)&&p.date>=a.today&&daysBetween(a.today,p.date)<=7).sort((x,y)=>x.date.localeCompare(y.date))[0];
 if(upcoming)return{heading:`Mock Test #${fullTestCount(a.scores)+1} - Full ${title(upcoming.subject)}`,schedule:`${duration} · ${day} morning`};
 const ready=a.chapters.filter(ch=>isCore(ch.subject)&&ch.revisions.some(r=>r.pass==='R1'&&r.doneOn)).sort((x,y)=>y.learnedOn.localeCompare(x.learnedOn))[0];
 if(ready)return{heading:`Chapter test: ${title(ready.subject)} - ${ready.name}`,schedule:`90 min · ${day} morning`};
 const fallback=studyFallback(a);
 return{heading:fallback??a.plan.focus,schedule:`${a.length} · ${day} morning`};
}

function analysisBlock(a:BlockCtx):BlockResolution{
 const open=a.errors.filter(e=>!e.redoneOn);
 const target=open.filter(e=>e.redoOn<=a.today).sort((x,y)=>x.redoOn.localeCompare(y.redoOn))[0]??[...open].sort((x,y)=>y.date.localeCompare(x.date))[0];
 if(target)return{heading:`Error analysis: ${target.topic} - ${target.fix.trim()?clip(target.fix):`${target.reason} fix`}`};
 const last=latestTest(a.scores);
 if(last)return{heading:`Error analysis: ${last.label.toLowerCase().includes(ALIAS[last.subject])?last.label:`${title(last.subject)} ${last.label}`}`};
 const fallback=studyFallback(a);
 return{heading:fallback??a.plan.focus};
}

export function distributeRevisions(plan:Record<BlockId,BlockPlan>,revisions:QueuedRevision[]):Record<BlockId,QueuedRevision[]>{
 const out:Record<BlockId,QueuedRevision[]>={A:[],B:[],C:[]};
 const core=(slot:BlockId):SubjectId|undefined=>{const subject=plan[slot].subject;return subject==='mixed'||subject==='flex'||subject==='test'?undefined:subject as SubjectId};
 revisions.forEach(revision=>{
  const match=(['A','B','C'] as BlockId[]).filter(slot=>core(slot)===revision.chapter.subject&&out[slot].length<2).sort((x,y)=>out[x].length-out[y].length)[0];
  const slot=match??(['C','B','A'] as BlockId[]).find(candidate=>out[candidate].length<2);
  if(slot)out[slot].push(revision);
 });
 return out;
}

export function resolveBlock(a:BlockCtx):BlockResolution{
 const {plan}=a;
 const revisions=a.revisions??[];
 const attach=revisions.length>0?{revisions}:{};
 const slices=a.slices??[];
 const base=(():BlockResolution=>{
  if(plan.subject==='test')return testBlock(a);
  if(/error analysis/i.test(plan.focus))return analysisBlock(a);
  if(a.paperMode)return{heading:plan.focus};
  if(plan.subject==='flex')return{heading:plan.focus,target:flexTarget(a)};
  if(plan.subject==='mixed')return{heading:plan.focus,target:mixedTarget(a)};
  return{heading:plan.focus,target:subjectTarget(plan.subject,a)};
 })();
 const urgent=slices.find(slice=>slice.urgent);
 if(urgent)return{
  heading:urgent.submission.title,
  target:`${dueLabel(urgent)} · ${urgent.minutesToday} min submission · then ${base.target??base.heading}`,
  schedule:`${a.length} · ${urgent.minutesToday} MIN SUBMISSION FIRST`,
  submissions:slices,...attach
 };
 return{...base,...attach,submissions:slices.length?slices:undefined};
}
