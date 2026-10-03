import type {ButtonHTMLAttributes,ReactNode} from 'react';
import {Check} from 'lucide-react';
import type {SubjectId} from '../types';
import {SUBJECTS} from '../seed';

export function Button({children,variant='primary',className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'danger'|'ghost';children:ReactNode}){
 return <button {...props} className={`brut-btn ${className}`} style={{background:variant==='primary'?'var(--due)':variant==='danger'?'var(--overdue)':'var(--card)',color:variant==='danger'?'white':'var(--ink)',...props.style}}>{children}</button>
}
export function Tag({subject,children}:{subject:SubjectId;children?:ReactNode}){
 return <span className="mono inline-flex items-center border-2 border-[var(--ink)] px-2 py-1 text-xs font-bold" style={{background:SUBJECTS[subject].color}}>{children??SUBJECTS[subject].label}</span>
}
export function CheckBox({checked,onClick,label,testId}:{checked:boolean;onClick:()=>void;label:string;testId:string}){
 return <button type="button" role="checkbox" aria-checked={checked} aria-label={label} data-testid={testId} onClick={onClick} className="grid h-12 w-12 shrink-0 place-items-center border-[3px] border-[var(--ink)]" style={{background:checked?'var(--done)':'white'}}>{checked&&<Check size={26} strokeWidth={4}/>}</button>
}
export function Guess(){return <span className="mono inline-block border-2 border-[var(--ink)] bg-[var(--due)] px-1.5 py-0.5 text-[10px] font-bold uppercase">Guess</span>}
export function Segments({total,filled,color='var(--done)',testId}:{total:number;filled:number;color?:string;testId?:string}){
 return <div className="flex gap-1" aria-label={`${filled} of ${total}`} data-testid={testId}>{Array.from({length:total},(_,i)=><span key={i} className="h-4 flex-1 border-2 border-[var(--ink)]" style={{background:i<filled?color:'white'}}/>)}</div>
}
export function Field({label,children}:{label:string;children:ReactNode}){return <label><span>{label}</span>{children}</label>}