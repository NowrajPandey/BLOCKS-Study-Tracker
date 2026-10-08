import type {Chapter,PendingTopic} from './types';

/**
 * Undo a "LEARNED TODAY" tap: the topic drops back into the backlog, and any
 * chapter record that tap created is removed. A chapter is only removed when
 * it is clearly the product of that tap — learned on the same day, no PYQ and
 * no completed revision — so a chapter you already studied stays untouched.
 */
export function revertLearned(pending:PendingTopic[],chapters:Chapter[],pendingId:string):{pending:PendingTopic[];chapters:Chapter[]}{
 const topic=pending.find(item=>item.id===pendingId);
 if(!topic?.doneOn)return{pending,chapters};
 const learnedOn=topic.doneOn,key=topic.name.trim().toLowerCase();
 const nextPending=pending.map(item=>item.id===pendingId?{...item,doneOn:undefined}:item);
 const nextChapters=chapters.filter(chapter=>!(chapter.subject===topic.subject&&chapter.name.trim().toLowerCase()===key&&chapter.learnedOn===learnedOn&&!chapter.pyqDone&&!chapter.revisions.some(revision=>revision.doneOn)));
 return{pending:nextPending,chapters:nextChapters};
}
