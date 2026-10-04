export type SubjectId='maths'|'physics'|'chemistry'|'biology'|'english';
export type BlockId='A'|'B'|'C'; export type Pass='R1'|'R2'|'R3';
export type ErrorReason='concept'|'calculation'|'silly'|'time';
export type ScoreType='unit'|'half-yearly'|'chapter-test'|'full-paper'|'pyq-set'|'practical-mock'|'pre-board';
export type RecallResult='again'|'hard'|'good';
export interface RevisionAttempt {date:string;result:RecallResult}
export interface Revision {pass:Pass;dueOn:string;doneOn?:string;lastResult?:RecallResult;attempts?:RevisionAttempt[]}
export interface Chapter {id:string;subject:SubjectId;name:string;learnedOn:string;revisions:Revision[];pyqDone:boolean}
export interface ErrorEntry {id:string;date:string;subject:SubjectId;topic:string;reason:ErrorReason;fix:string;redoOn:string;redoneOn?:string}
export interface DayLog {date:string;blocksDone:Record<BlockId,boolean>;minimumDay:boolean;minimumDone:{maths:boolean;revision:boolean};focusMinutes:number;practicalDone?:boolean}
export interface WeeklyReview {weekStart:string;hitMilestone:boolean;mainErrorReason?:ErrorReason;nextWeekTop3:[string,string,string];savedOn:string}
export interface ScoreEntry {id:string;date?:string;label:string;subject:SubjectId;paper?:'language'|'literature';type:ScoreType;obtained:number;total:number;note?:string}
export interface PendingTopic {id:string;subject:SubjectId;name:string;due?:string;plannedStart?:string;estimatedDays?:number;bufferDays?:number;doneOn?:string}
export interface PaperSlot {id:string;subject:SubjectId;paper?:'language'|'literature';date:string;time?:string}
export interface Submission {id:string;title:string;subject:SubjectId;deadline:string;hours:number;notes?:string;doneOn?:string}
export interface ExamDates {practicals:string;preBoards:string;boards:string;confirmed:{practicals:boolean;preBoards:boolean;boards:boolean}}
export interface SchoolSync {done:Partial<Record<SubjectId,string[]>>;expected:Partial<Record<SubjectId,string>>}
export interface Settings {examDates:ExamDates;hardness:Record<SubjectId,number>}
export interface Flag {id:string;severity:'red'|'amber';subject?:SubjectId;text:string}
export interface PracticalItem {id:string;subject:SubjectId;text:string}
export interface MockPractical {id:string;date:string;subject:SubjectId;notes:string;obtained?:number;total?:number}
export type StudyMethod='re-reading'|'retrieval'|'blurting'|'feynman'|'mixed-practice'|'questions'|'PYQs';
export interface StudySession {id:string;date:string;subject:SubjectId;minutes:number;method:StudyMethod}