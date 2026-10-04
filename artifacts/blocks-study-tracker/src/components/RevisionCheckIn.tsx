import {useState} from 'react';
import {Button} from './Brut';
import type {Pass,RecallResult} from '../types';

type Props={
 chapterName:string;
 pass:Pass;
 testId:string;
 onRate:(result:RecallResult)=>void;
};

export function RevisionCheckIn({chapterName,pass,testId,onRate}:Props){
 const [open,setOpen]=useState(false);
 if(!open)return <Button type="button" onClick={()=>setOpen(true)} data-testid={`${testId}-start`}>REVISE</Button>;
 const choose=(result:RecallResult)=>{onRate(result);setOpen(false)};
 return <div className="w-full max-w-xl border-[3px] border-black bg-white p-3 sm:w-auto" data-testid={`${testId}-checkin`}>
  <p className="text-sm font-bold">Close your notes. Recall the key ideas for {chapterName}, then check your notes or solve a problem.</p>
  <div className="mt-3 grid gap-2 sm:grid-cols-3">
   <Button type="button" variant="danger" className="text-xs" onClick={()=>choose('again')} data-testid={`${testId}-again`}>AGAIN · TOMORROW</Button>
   <Button type="button" variant="ghost" className="text-xs" onClick={()=>choose('hard')} data-testid={`${testId}-hard`}>HARD · SOONER</Button>
   <Button type="button" className="text-xs" onClick={()=>choose('good')} data-testid={`${testId}-good`}>GOOD · NORMAL GAP</Button>
  </div>
  <button type="button" className="mt-2 min-h-10 border-b-2 border-black text-xs font-bold" onClick={()=>setOpen(false)} data-testid={`${testId}-cancel`}>CANCEL</button>
  <span className="sr-only">This is the {pass} review.</span>
 </div>;
}