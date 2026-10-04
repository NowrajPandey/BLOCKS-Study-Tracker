import {useEffect,useState} from 'react';
import {X,Play,Pause} from 'lucide-react';
import {Button,Field} from './Brut';
import {SUBJECT_ORDER,SUBJECTS} from '../seed';
import {useStore} from '../store';
import {todayISO} from '../dates';
import type {StudyMethod,SubjectId} from '../types';
export function FocusTimer({initial,close}:{initial:number;close:()=>void}){
 const [minutes,setMinutes]=useState(initial),[remaining,setRemaining]=useState(initial*60),[running,setRunning]=useState(true),[subject,setSubject]=useState<SubjectId>('maths'),[method,setMethod]=useState<StudyMethod>('retrieval');
 const addFocus=useStore(s=>s.addFocusMinutes),addSession=useStore(s=>s.addStudySession);
 useEffect(()=>{if(!running)return;const timer=window.setInterval(()=>setRemaining(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(timer)},[running]);
 useEffect(()=>{if(remaining===0)setRunning(false)},[remaining]);
 const finish=()=>{const done=Math.max(0,Math.floor((minutes*60-remaining)/60));if(done){addFocus(todayISO(),done);addSession({date:todayISO(),subject,minutes:done,method})}close()};
 return <div className="fixed inset-0 z-50 grid place-items-center bg-[var(--paper)]/95 p-4" role="dialog" aria-modal="true" aria-label="Focus timer">
  <section className="brut w-full max-w-lg p-5 sm:p-8">
   <header className="flex items-start justify-between"><div><p className="mono text-sm font-bold">BLOCKS / FOCUS</p><h2 className="mt-2 text-3xl">Stay here.</h2></div><button className="grid h-12 w-12 place-items-center border-[3px] border-[var(--ink)]" onClick={finish} aria-label="Close timer" data-testid="button-close-timer"><X strokeWidth={3}/></button></header>
   <div className="my-7 text-center"><div className="mono display text-7xl sm:text-8xl" data-testid="timer-countdown">{String(Math.floor(remaining/60)).padStart(2,'0')}:{String(remaining%60).padStart(2,'0')}</div><div className="mt-4 flex justify-center gap-2">{[10,25,45].map(n=><button key={n} className={`brut-btn ${minutes===n?'':'bg-white'}`} onClick={()=>{setMinutes(n);setRemaining(n*60);setRunning(false)}} data-testid={`button-timer-${n}`}>{n} MIN</button>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-2"><Field label="Subject"><select value={subject} onChange={e=>setSubject(e.target.value as SubjectId)} data-testid="select-timer-subject">{SUBJECT_ORDER.map(s=><option value={s} key={s}>{SUBJECTS[s].label}</option>)}</select></Field><Field label="Study method"><select value={method} onChange={e=>setMethod(e.target.value as StudyMethod)} data-testid="select-timer-method"><option value="retrieval">Retrieval practice · recall before notes</option><option value="blurting">Blurting</option><option value="feynman">Feynman method</option><option value="mixed-practice">Mixed problem practice</option><option value="questions">Solving questions</option><option value="PYQs">PYQs</option></select></Field></div>
   <div className="mt-5 grid grid-cols-2 gap-3"><Button onClick={()=>setRunning(v=>!v)} data-testid="button-pause-timer">{running?<><Pause size={18} strokeWidth={3}/> PAUSE</>:<><Play size={18} strokeWidth={3}/> KEEP GOING</>}</Button><Button variant="ghost" onClick={finish} data-testid="button-finish-timer">FINISH + LOG</Button></div>
   <p className="mono mt-4 text-center text-sm">Finished minutes go straight into today.</p>
  </section>
 </div>
}