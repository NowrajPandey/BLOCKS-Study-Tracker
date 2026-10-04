import {useMemo,useState} from 'react';
import {ArrowLeft,ChevronDown,ChevronUp,GripVertical,Trash2} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {Button,Tag} from '../components/Brut';
import {useStore} from '../store';
import {paceBacklog} from '../pacing';
import {todayISO} from '../dates';
import {SUBJECT_ORDER} from '../seed';
import type {SubjectId} from '../types';

export function SequencePage(){
 const s=useStore(),navigate=useNavigate(),today=todayISO();
 const exams=s.settings.examDates;
 const paced=useMemo(()=>paceBacklog(s.pending,{today,deadline:exams.preBoards,school:s.schoolSync,hardness:s.settings.hardness,order:s.manualOrder}),[s.pending,today,exams.preBoards,s.schoolSync,s.settings.hardness,s.manualOrder]);
 const [dragged,setDragged]=useState<{subject:SubjectId;name:string}|null>(null);
 return <main className="mx-auto max-w-5xl space-y-5 px-4 pb-32 pt-6 sm:px-8">
  <header className="flex items-start gap-3"><button className="brut-btn bg-white" onClick={()=>navigate(-1)} aria-label="Go back" data-testid="button-back-sequence"><ArrowLeft strokeWidth={3}/></button><div><p className="mono text-xs font-bold">SEQUENCE / LEARNING ORDER</p><h1 className="mt-2 text-5xl sm:text-6xl">Sequence.</h1></div></header>
  <section className="brut-sm bg-[var(--biology)] p-4"><p className="font-bold">Drag a chapter — or use the arrows — into the order you want to learn it.</p><p className="mt-1 text-sm">Your order beats the priority score and school-sync: the pacer schedules each subject in exactly this sequence, and Blocks A, B and C pull from the top of it — never a later chapter.</p></section>
  {SUBJECT_ORDER.map(subject=>{
   const chain=paced.filter(p=>p.subject===subject&&!p.overridden);
   const overrides=s.pending.filter(p=>p.subject===subject&&!p.doneOn&&typeof p.plannedStart==='string');
   const custom=Boolean(s.manualOrder[subject]);
   return <section className="brut p-4" key={subject} data-testid={`sequence-card-${subject}`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Tag subject={subject}/><span className="mono text-xs font-bold" data-testid={`text-seq-count-${subject}`}>{chain.length} TO LEARN</span></div><div className="flex items-center gap-2">{custom?<span className="mono border-2 border-black bg-[var(--due)] px-2 py-1 text-xs font-bold" data-testid={`badge-seq-mode-${subject}`}>CUSTOM ORDER</span>:<span className="mono border-2 border-black bg-white px-2 py-1 text-xs font-bold" data-testid={`badge-seq-mode-${subject}`}>AUTO · PRIORITY</span>}{custom&&<Button variant="ghost" onClick={()=>s.clearManualOrder(subject)} data-testid={`button-seq-reset-${subject}`}>RESET</Button>}</div></div>
    {chain.length===0?<p className="mt-3 border-2 border-black bg-white p-3 text-sm" data-testid={`text-seq-empty-${subject}`}>Nothing left to learn here.</p>
    :<ol className="mt-3 space-y-2">{chain.map((p,i)=><li key={p.id} draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',p.name);setDragged({subject,name:p.name})}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(dragged&&dragged.subject===subject)s.moveManualItem(subject,dragged.name,i);setDragged(null)}} onDragEnd={()=>setDragged(null)} className={`brut-sm flex cursor-grab items-center gap-3 p-3 active:cursor-grabbing ${dragged?.subject===subject&&dragged.name===p.name?'opacity-50':''}`} style={{background:dragged&&dragged.subject===subject&&dragged.name!==p.name?'var(--due)':'white'}} data-testid={`sequence-item-${subject}-${i}`}><GripVertical size={20} strokeWidth={3} aria-hidden="true"/><span className="mono border-2 border-black bg-white px-2 py-1 text-xs font-bold">{String(i+1).padStart(2,'0')}</span><p className="min-w-0 flex-1 font-bold">{p.name}</p><div className="flex gap-1"><button className="brut-btn min-h-10 min-w-10 bg-white disabled:cursor-not-allowed disabled:opacity-40" disabled={i===0} onClick={()=>s.moveManualItem(subject,p.name,i-1)} aria-label={`Move ${p.name} up`} data-testid={`button-seq-up-${subject}-${i}`}><ChevronUp strokeWidth={3}/></button><button className="brut-btn min-h-10 min-w-10 bg-white disabled:cursor-not-allowed disabled:opacity-40" disabled={i===chain.length-1} onClick={()=>s.moveManualItem(subject,p.name,i+1)} aria-label={`Move ${p.name} down`} data-testid={`button-seq-down-${subject}-${i}`}><ChevronDown strokeWidth={3}/></button><button className="brut-btn min-h-10 min-w-10 bg-white" onClick={()=>{if(window.confirm(`Remove ${p.name} from your backlog?`))s.deletePending(p.id)}} aria-label={`Delete ${p.name}`} data-testid={`button-seq-delete-${subject}-${i}`}><Trash2 size={16} strokeWidth={3}/></button></div></li>)}</ol>}
    {!!overrides.length&&<p className="mono mt-3 border-2 border-black bg-white p-2 text-xs" data-testid={`text-seq-overrides-${subject}`}>{overrides.length} TOPIC{overrides.length===1?'':'S'} ON MANUAL DATES — OUTSIDE THE SEQUENCE · ADJUST FROM TODAY</p>}
   </section>;
  })}
  <p className="mono text-xs">Topics you add later land at the end until you place them. Marking a topic learned on Today removes it from this list automatically.</p>
 </main>;
}
