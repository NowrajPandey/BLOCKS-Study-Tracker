import type {ScoreEntry,SubjectId} from './types';
export const pct=(s:ScoreEntry)=>Math.round(s.obtained/s.total*1000)/10;
export const scoreTarget=(subject:SubjectId,today:string)=>subject==='maths'?(today>='2026-11-22'?85:70):subject==='physics'?(today>='2026-11-22'?85:75):85;
export function subjectTrend(scores:ScoreEntry[],subject:SubjectId):'up'|'down'|'flat'{const xs=scores.filter(s=>s.subject===subject&&s.date).sort((a,b)=>a.date!.localeCompare(b.date!)).map(pct);if(xs.length<2)return'flat';return xs.at(-1)!>xs.at(-2)!+2?'up':xs.at(-1)!<xs.at(-2)!-2?'down':'flat'}
export const latestDated=(scores:ScoreEntry[],subject:SubjectId)=>scores.filter(s=>s.subject===subject&&s.date&&['chapter-test','full-paper','pre-board'].includes(s.type)).sort((a,b)=>b.date!.localeCompare(a.date!))[0];