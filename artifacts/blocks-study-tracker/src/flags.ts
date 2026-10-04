import {addDays,daysBetween,fromISO,getDueItems} from './dates';
import {APP_START} from './phases';
import {SUBJECTS,SUBJECT_WEIGHT,WEEK_TEMPLATE} from './seed';
import {latestDated,pct,scoreTarget} from './marks';
import type {Chapter,DayLog,Flag,PendingTopic,ScoreEntry} from './types';
export function behindFlags(a:{pending:PendingTopic[];scores:ScoreEntry[];days:Record<string,DayLog>;chapters:Chapter[];today:string}):Flag[]{
 const flags:Flag[]=[];a.pending.forEach(t=>{if(t.doneOn)return;const left=daysBetween(a.today,t.due),label=SUBJECTS[t.subject].label;if(left<0)flags.push({id:`late-${t.id}`,severity:'red',subject:t.subject,text:`${label}: "${t.name}" is still not learned. Its learn-by deadline was ${t.due}. Do it first.`});else if(left<=2){const deadline=left===0?'today':left===1?'tomorrow':`in ${left} days`;flags.push({id:`soon-${t.id}`,severity:'amber',subject:t.subject,text:`${label}: "${t.name}" has a learn-by deadline ${deadline}.`})}});
 let planned=0,done=0,plannedSlots=0;for(let i=1;i<=7;i++){const date=addDays(a.today,-i);if(date<APP_START)continue;const plan=WEEK_TEMPLATE[fromISO(date).getDay()],log=a.days[date];(['A','B','C'] as const).forEach(b=>{const subject=plan[b].subject;if(subject==='maths'||subject==='physics'){const weight=SUBJECT_WEIGHT[subject];planned+=weight;plannedSlots++;if(log?.blocksDone[b])done+=weight}})}
 if(plannedSlots>=6&&done/planned<.7)flags.push({id:'mp-blocks',severity:'amber',text:`Maths + Physics blocks at ${Math.round(done/planned*100)}% by priority weight this week. Use Friday FLEX for them.`});
 (['maths','physics'] as const).forEach(subject=>{const s=latestDated(a.scores,subject);if(s&&pct(s)<scoreTarget(subject,a.today))flags.push({id:`score-${subject}`,severity:'amber',subject,text:`${SUBJECTS[subject].label}: last test ${pct(s)}%. Target is ${scoreTarget(subject,a.today)}%. Check the error log.`})});
 const overdue=getDueItems(a.chapters,a.today).filter(i=>i.status==='overdue').length;if(overdue>=5)flags.push({id:'overdue',severity:'amber',text:`${overdue} revisions overdue. Do the R1s first. Skip nothing else.`});
 return flags.sort((x,y)=>x.severity===y.severity?0:x.severity==='red'?-1:1)
}