# ADD-ON PROMPT: Student profile, marks tracker, practicals, "behind schedule" flags

Paste everything below this line into the vibe coder, AFTER the main "BLOCKS" prompt. This is an extension. Do not rewrite or replace what the main prompt built. Keep the same neo-brutalist design system (thick black borders, hard offset shadows, flat colours, Archivo Black / Space Grotesk / JetBrains Mono, no gradients, no blur, no glassmorphism). Do not ask me questions. Make decisions yourself and tell me what you built at the end.

---

## 0. READ THIS FIRST: the dates are GUESSES

The student does **not** know the exact exam dates yet. The dates in the main prompt and in this add-on are the student's rough statements turned into placeholders. The app must treat them as guesses until he confirms them.

| Item | What he actually said | Placeholder used |
|---|---|---|
| Practical exams | "mid November" | **2026-11-15** (guess) |
| Pre-boards (school exams) | "most probably from first week of December" | **2026-12-01** (guess) |
| ISC boards | "February" | **2027-02-15** (guess) |
| Pre-board syllabus | not known (assumed: full syllabus) | unknown |
| Pre-board paper timetable | not released yet | empty, he will enter it later |
| Whether Saturdays are school days | not known (assumed: no school) | unknown |
| Puja / Diwali holiday dates | not known | none entered |
| Phase 1-3 boundaries | derived from the dates above | recalculated automatically |

**Implement this:**
1. Every exam date has a `confirmed: boolean` flag, default `false`.
2. Anywhere a guessed date is shown (countdown tiles, Plan tab, Settings), show a small yellow **GUESS** tag next to it.
3. On the Today screen, while ANY exam date is unconfirmed, show a banner: "Exam dates are guesses. Confirm them when school tells you." with a button that opens the date editor.
4. When he edits a date and ticks "confirmed", the GUESS tag disappears and the phases **shift automatically** (code in section 4.1). Never hard-code phase dates anywhere in the UI. Always derive them.
5. In the milestone list, any milestone that mentions a date should show relative wording derived from the current phases where possible, so it moves with the dates.

---

## 1. Student profile (the app must reflect all of this)

**Who:** Class 12 ISC student. Subjects: **Physics, Chemistry, Maths, Biology, English (Language and Literature are two separate papers: English 1 = Language, English 2 = Literature).**

**Goal:** 100% in ISC. He believes it is possible and that he has the potential.

**Where he stands (his own words, summarised):**
- **Strong:** Biology, English (both papers, when he practises).
- **Strong if he revises:** Chemistry. His half-yearly Chemistry slipped only because he did not revise, not because he does not know it.
- **Weak:** **Maths** and **Physics**. These are the two biggest levers for his final marks.
- **Half-yearly exams (already over):** did very well in Biology, English 1 and English 2. Did a little bad in Chemistry (no revision). Did bad in Maths and bad in Physics. He says the main cause was not revising properly.
- **Core problem:** not "how" to revise but **when to revise and how often**. He left tuition after Class 10 and feels he lost his path since then.

**Last unit test (before half-yearly):**

| Subject | Score |
|---|---|
| Chemistry | 20/20 |
| Biology | 20/20 |
| Physics | 16/20 |
| Maths | 9/20 |
| English 1 (Language) | 19/20 |
| English 2 (Literature) | 15/20 (the teacher sets very hard papers; he was the highest scorer in the class) |

**Syllabus progress (school pace vs his pace):**
- **Physics:** in pace with school. Completed till **Current Electricity**. School is a bit slow, so he wants to get **ahead of school fast**.
- **Chemistry:** in pace. Completed **Solutions, Electrochemistry, and organic chemistry till Amines**.
- **Maths:** a little **behind** school. School has completed everything till **Definite Integrals**. He has not finished **Inverse Trigonometric Functions (ITF)** and **Definite Integrals**.
- **Biology:** in pace. Completed everything till **Evolution**.
- **English:** in pace. Literature: Macbeth done till Act 4 (**Act 5 left**); short stories and poems almost all done. Language: completed from Class 11.

**How he studies (tag sessions with these methods in the app):** re-reading, **blurting**, the **Feynman method**, solving questions, and **PYQs (previous year questions)**. He has all his own notes for every subject. He has no external tutoring.

**Time he has:** weekdays 4-5 hours, weekends 6-7 hours. He is a morning person (can wake at 5 am if he sleeps by 10 pm). School starts at 8 am and he is home around 1:30 pm. He wants a **flexible path, not strict rules**, so one missed slot never turns into procrastination. Nothing else is fixed in his schedule.

**Subject priority (use these weights for time-share bars and for the "behind" logic):**

```ts
export const SUBJECT_WEIGHT = { maths: 1.0, physics: 0.9, chemistry: 0.5, biology: 0.3, english: 0.3 };
```

---

## 2. What to add (keep the 5-tab bottom nav, add sub-tabs, do NOT add more bottom tabs)

1. **Setup wizard** (first run only, reachable again from Settings): pick which chapters are already finished, so the app auto-schedules revision for them.
2. **Pending topics:** things not yet learned (Maths: ITF, Definite Integrals) tracked separately. When he marks one "learned today", it becomes a normal chapter with R1/R2/R3 auto-scheduled.
3. **MARKS** (sub-tab inside the REVIEW tab: `REVIEW | MARKS`): a log of every test, paper and mock, with a percentage, trend arrows per subject, and the targets below.
4. **BEHIND flags** on the Today screen: red/amber banners when Maths or Physics fall behind.
5. **PRACTICALS** (sub-tab inside the PLAN tab: `PLAN | PRACTICALS | PAPERS`): per-subject practical checklists, Maths project tracker, mock-practical log.
6. **PAPERS** (sub-tab inside PLAN): the pre-board timetable he enters when school releases it. When pre-boards are on, Today switches to **Pre-board mode** (section 5).
7. **Date confirmation** system (section 0).

---

## 3. Data model additions

Extend the existing types. Do not delete anything. Bump the persisted store to version 2 with a `migrate` function that adds the new fields with defaults, so existing data survives.

```ts
// src/types.ts (ADDITIONS)
export type ScoreType = 'unit' | 'half-yearly' | 'chapter-test' | 'full-paper' | 'pyq-set' | 'practical-mock' | 'pre-board';

export interface ScoreEntry {
  id: string;
  date?: string;                       // YYYY-MM-DD, optional for old scores with unknown date
  label: string;                       // e.g. "Chapter test: Definite Integrals"
  subject: SubjectId;
  paper?: 'language' | 'literature';   // only for English
  type: ScoreType;
  obtained: number;
  total: number;
  note?: string;
}

export interface PendingTopic {
  id: string;
  subject: SubjectId;
  name: string;
  due: string;                         // deadline, YYYY-MM-DD
  doneOn?: string;
}

export interface PaperSlot {            // pre-board timetable entry
  id: string;
  subject: SubjectId;
  paper?: 'language' | 'literature';
  date: string;
  time?: string;
}

export interface ExamDates {
  practicals: string;
  preBoards: string;
  boards: string;
  confirmed: { practicals: boolean; preBoards: boolean; boards: boolean };
}

export interface Flag {
  id: string;
  severity: 'red' | 'amber';
  subject?: SubjectId;
  text: string;
}
```

Replace `Settings.examDates` with the new `ExamDates` type, and default it to:

```ts
examDates: {
  practicals: '2026-11-15', preBoards: '2026-12-01', boards: '2027-02-15',
  confirmed: { practicals: false, preBoards: false, boards: false },
}
```

New store state and actions (merge into `store.ts`):

```ts
// new state
scores: ScoreEntry[];            // seeded with SEED_SCORES (section 4.3)
pending: PendingTopic[];         // seeded with SEED_PENDING
papers: PaperSlot[];             // starts empty
practicalChecks: Record<string, boolean>;   // key = checklist item id
setupDone: boolean;

// new actions
addScore: (s: Omit<ScoreEntry, 'id'>) => void;
deleteScore: (id: string) => void;
markPendingLearned: (id: string) => void;
addPaper: (p: Omit<PaperSlot, 'id'>) => void;
removePaper: (id: string) => void;
togglePractical: (key: string) => void;
setExamDate: (key: 'practicals' | 'preBoards' | 'boards', date: string, confirmed: boolean) => void;
finishSetup: (finished: { subject: SubjectId; name: string }[]) => void;
```

```ts
// implementations (inside create()(persist((set, get) => ({ ... })))
addScore: s => set(st => ({ scores: [{ ...s, id: crypto.randomUUID() }, ...st.scores] })),
deleteScore: id => set(st => ({ scores: st.scores.filter(x => x.id !== id) })),

markPendingLearned: id => {
  const t = get().pending.find(p => p.id === id);
  if (!t || t.doneOn) return;
  get().addChapter(t.subject, t.name, todayISO());           // creates R1/R2/R3 automatically
  set(st => ({ pending: st.pending.map(p => (p.id === id ? { ...p, doneOn: todayISO() } : p)) }));
},

addPaper: p => set(st => ({ papers: [...st.papers, { ...p, id: crypto.randomUUID() }].sort((a, b) => a.date.localeCompare(b.date)) })),
removePaper: id => set(st => ({ papers: st.papers.filter(p => p.id !== id) })),
togglePractical: key => set(st => ({ practicalChecks: { ...st.practicalChecks, [key]: !st.practicalChecks[key] } })),

setExamDate: (key, date, confirmed) =>
  set(st => ({
    settings: { ...st.settings, examDates: {
      ...st.settings.examDates, [key]: date,
      confirmed: { ...st.settings.examDates.confirmed, [key]: confirmed },
    } },
  })),

finishSetup: finished => {
  const phases = derivePhases(get().settings.examDates);
  const start = todayISO() > '2026-10-05' ? todayISO() : '2026-10-05';
  const end = phases[1].end >= start ? phases[1].end : addDays(start, 14);
  const created = scheduleBacklog(finished, start, end);
  set(st => ({ chapters: [...st.chapters, ...created], setupDone: true }));
},
```

---

## 4. Base code

### 4.1 Derived phases (dates move when exam dates change)

```ts
// src/phases.ts
import { addDays } from './dates';
import type { ExamDates } from './types';
import { PHASES } from './seed';

export const APP_START = '2026-10-03';

/** Phase dates are ALWAYS derived from the exam dates. Never hard-code them in the UI. */
export function derivePhases(d: ExamDates, appStart = APP_START) {
  const p2Start = addDays(d.practicals, -20);          // practical sprint = last 3 weeks before practicals
  let p1Start = addDays(appStart, 2);
  const p1End = addDays(p2Start, -1);
  const squeezed = p1End < p1Start;                    // practicals very close: warn the user
  if (squeezed) p1Start = p1End;
  const dates = [
    { start: appStart,           end: addDays(appStart, 1) },
    { start: p1Start,            end: p1End },
    { start: p2Start,            end: d.practicals },
    { start: addDays(d.practicals, 1), end: addDays(d.preBoards, -1) },
    { start: d.preBoards,        end: d.boards },
  ];
  return PHASES.map((p, i) => ({ ...p, ...dates[i], squeezed: i === 1 && squeezed }));
}

export const currentPhase = (d: ExamDates, today: string) =>
  derivePhases(d).find(p => today >= p.start && today <= p.end);
```

### 4.2 Starter chapter lists and the backlog scheduler

These chapters are **already taught**, but never revised. The Setup wizard shows them as **editable checkboxes** per subject (rename, delete, add). They are a STARTER LIST based on the standard ISC Class 12 sequence. **They may not match his school's exact book, so he must be able to edit every name.** Pre-tick the ones he said are finished.

```ts
// src/seed.ts (ADDITIONS)
export const STARTER_CHAPTERS: Record<SubjectId, { name: string; finished: boolean }[]> = {
  physics: [
    { name: 'Electrostatics', finished: true },
    { name: 'Current Electricity', finished: true },
    { name: 'Magnetic Effects of Current and Magnetism', finished: false },
    { name: 'Electromagnetic Induction and Alternating Current', finished: false },
    { name: 'Electromagnetic Waves', finished: false },
    { name: 'Ray Optics and Optical Instruments', finished: false },
    { name: 'Wave Optics', finished: false },
    { name: 'Dual Nature of Radiation and Matter', finished: false },
    { name: 'Atoms and Nuclei', finished: false },
    { name: 'Electronic Devices', finished: false },
  ],
  chemistry: [
    { name: 'Solutions', finished: true },
    { name: 'Electrochemistry', finished: true },
    { name: 'Chemical Kinetics', finished: true },
    { name: 'Haloalkanes and Haloarenes', finished: true },
    { name: 'Alcohols, Phenols and Ethers', finished: true },
    { name: 'Aldehydes, Ketones and Carboxylic Acids', finished: true },
    { name: 'Amines (organic compounds containing nitrogen)', finished: true },
    { name: 'Coordination Compounds', finished: false },
    { name: 'd- and f-Block Elements', finished: false },
    { name: 'p-Block Elements', finished: false },
    { name: 'Biomolecules', finished: false },
  ],
  maths: [
    { name: 'Relations and Functions', finished: true },
    { name: 'Matrices and Determinants', finished: true },
    { name: 'Continuity and Differentiability', finished: true },
    { name: 'Applications of Derivatives', finished: true },
    { name: 'Indefinite Integrals', finished: true },
    // ITF and Definite Integrals are NOT finished: they live in SEED_PENDING below.
    { name: 'Application of Integrals', finished: false },
    { name: 'Differential Equations', finished: false },
    { name: 'Vectors and 3D Geometry', finished: false },
    { name: 'Probability (conditional probability, Bayes)', finished: false },
    { name: 'Linear Programming', finished: false },
  ],
  biology: [
    { name: 'Reproduction in Organisms', finished: true },
    { name: 'Sexual Reproduction in Flowering Plants', finished: true },
    { name: 'Human Reproduction and Reproductive Health', finished: true },
    { name: 'Principles of Inheritance and Variation (genetics, linkage, crossing over, disorders)', finished: true },
    { name: 'Molecular Basis of Inheritance', finished: true },
    { name: 'Evolution', finished: true },
    { name: 'Human Health and Disease', finished: false },
    { name: 'Biotechnology', finished: false },
    { name: 'Ecology', finished: false },
  ],
  english: [
    { name: 'Literature: Macbeth Acts 1-4', finished: true },
    { name: 'Literature: Short stories', finished: true },
    { name: 'Literature: Poems', finished: true },
    { name: 'Language: Composition (essay, letter, notice)', finished: true },
    { name: 'Language: Grammar and comprehension', finished: true },
  ],
};

export const SEED_PENDING = [
  { id: 'p-maths-itf',  subject: 'maths',   name: 'Inverse Trigonometric Functions (ITF)', due: '2026-10-11' },
  { id: 'p-maths-defint', subject: 'maths', name: 'Definite Integrals',                    due: '2026-10-11' },
  { id: 'p-eng-macbeth5', subject: 'english', name: 'Literature: Macbeth Act 5',            due: '2026-10-11' },
] as const;
```

```ts
// src/backlog.ts
import { addDays, daysBetween, toISO } from './dates';
import type { Chapter, SubjectId } from './types';
import { buildRevisions } from './dates';

// Chemistry first (it slipped last time), then Maths, Physics, Biology, English.
const SUBJECT_ORDER: SubjectId[] = ['chemistry', 'maths', 'physics', 'biology', 'english'];

/**
 * Spread the FIRST revision (R1) of already-finished chapters evenly between `start` and `end`.
 * R2 and R3 then follow automatically (anchor = R1 date minus 1 day, so R1 lands exactly on its date).
 */
export function scheduleBacklog(finished: { subject: SubjectId; name: string }[], start: string, end: string): Chapter[] {
  const sorted = [...finished].sort((a, b) => SUBJECT_ORDER.indexOf(a.subject) - SUBJECT_ORDER.indexOf(b.subject));
  const n = sorted.length;
  if (n === 0) return [];
  const span = Math.max(daysBetween(start, end) + 1, 1);
  return sorted.map((c, i) => {
    const r1 = addDays(start, Math.floor((i * span) / n));
    const anchor = addDays(r1, -1);
    return { id: crypto.randomUUID(), subject: c.subject, name: c.name, learnedOn: anchor, revisions: buildRevisions(anchor), pyqDone: false };
  });
}
```

### 4.3 Seed scores and half-yearly notes

```ts
// src/seed.ts (ADDITIONS)
import type { ScoreEntry } from './types';

// date is unknown for these (they were before the half-yearly). Show them as "Before half-yearly".
export const SEED_SCORES: Omit<ScoreEntry, 'id'>[] = [
  { label: 'Unit test', subject: 'chemistry', type: 'unit', obtained: 20, total: 20 },
  { label: 'Unit test', subject: 'biology',   type: 'unit', obtained: 20, total: 20 },
  { label: 'Unit test', subject: 'physics',   type: 'unit', obtained: 16, total: 20 },
  { label: 'Unit test', subject: 'maths',     type: 'unit', obtained: 9,  total: 20 },
  { label: 'Unit test (English 1, Language)',   subject: 'english', paper: 'language',   type: 'unit', obtained: 19, total: 20 },
  { label: 'Unit test (English 2, Literature)', subject: 'english', paper: 'literature', type: 'unit', obtained: 15, total: 20,
    note: 'Teacher sets a very hard paper. Highest scorer in the class.' },
];

// Half-yearly: no numbers available. Show as a read-only note card at the top of the MARKS tab.
export const HALF_YEARLY_NOTES = [
  { subject: 'biology',   verdict: 'Very good' },
  { subject: 'english',   verdict: 'Very good (both papers)' },
  { subject: 'chemistry', verdict: 'A little bad. Did not revise.' },
  { subject: 'maths',     verdict: 'Bad' },
  { subject: 'physics',   verdict: 'Bad' },
] as const;
```

Show the half-yearly card with the line: **"Cause: not revising properly. Fixing that is the whole plan."**

### 4.4 Marks helpers and targets

```ts
// src/marks.ts
import type { ScoreEntry, SubjectId } from './types';

export const pct = (s: ScoreEntry) => Math.round((s.obtained / s.total) * 1000) / 10;

/** Targets move up as the pre-boards get closer. */
export const scoreTarget = (subject: SubjectId, today: string) => {
  const late = today >= '2026-11-22';
  if (subject === 'maths') return late ? 85 : 70;
  if (subject === 'physics') return late ? 85 : 75;
  return 85;                                  // Chemistry, Biology, English: keep them high
};

export function subjectTrend(scores: ScoreEntry[], subject: SubjectId): 'up' | 'down' | 'flat' {
  const xs = scores
    .filter(s => s.subject === subject && s.date)
    .sort((a, b) => a.date!.localeCompare(b.date!))
    .map(pct);
  if (xs.length < 2) return 'flat';
  const last = xs[xs.length - 1], prev = xs[xs.length - 2];
  return last > prev + 2 ? 'up' : last < prev - 2 ? 'down' : 'flat';
}

export const latestDated = (scores: ScoreEntry[], subject: SubjectId) =>
  scores
    .filter(s => s.subject === subject && s.date && ['chapter-test', 'full-paper', 'pre-board'].includes(s.type))
    .sort((a, b) => b.date!.localeCompare(a.date!))[0];
```

### 4.5 "Behind schedule" flags (the app's honest-friend feature)

```ts
// src/flags.ts
import { addDays, daysBetween, fromISO, getDueItems } from './dates';
import { WEEK_TEMPLATE, SUBJECTS } from './seed';
import { APP_START } from './phases';
import { latestDated, pct, scoreTarget } from './marks';
import type { Chapter, DayLog, Flag, PendingTopic, ScoreEntry } from './types';

export function behindFlags(a: {
  pending: PendingTopic[]; scores: ScoreEntry[]; days: Record<string, DayLog>; chapters: Chapter[]; today: string;
}): Flag[] {
  const flags: Flag[] = [];

  // 1. Pending topics past (or close to) their deadline
  for (const t of a.pending) {
    if (t.doneOn) continue;
    const left = daysBetween(a.today, t.due);
    const label = SUBJECTS[t.subject].label;
    if (left < 0) flags.push({ id: `late-${t.id}`, severity: 'red', subject: t.subject, text: `${label}: "${t.name}" is still not learned. Was due ${t.due}. Do it first.` });
    else if (left <= 2) flags.push({ id: `soon-${t.id}`, severity: 'amber', subject: t.subject, text: `${label}: "${t.name}" is due in ${left} day${left === 1 ? '' : 's'}.` });
  }

  // 2. Maths + Physics block completion over the last 7 days
  let planned = 0, done = 0;
  for (let i = 1; i <= 7; i++) {
    const date = addDays(a.today, -i);
    if (date < APP_START) continue;
    const plan = WEEK_TEMPLATE[fromISO(date).getDay()];
    const log = a.days[date];
    (['A', 'B', 'C'] as const).forEach(b => {
      const s = plan[b].subject;
      if (s === 'maths' || s === 'physics') { planned++; if (log?.blocksDone[b]) done++; }
    });
  }
  if (planned >= 6 && done / planned < 0.7)
    flags.push({ id: 'mp-blocks', severity: 'amber', text: `Maths + Physics blocks at ${Math.round((done / planned) * 100)}% this week. Use Friday FLEX for them.` });

  // 3. Latest test score below target for Maths / Physics
  for (const subj of ['maths', 'physics'] as const) {
    const s = latestDated(a.scores, subj);
    if (!s) continue;
    const target = scoreTarget(subj, a.today);
    if (pct(s) < target)
      flags.push({ id: `score-${subj}`, severity: 'amber', subject: subj, text: `${SUBJECTS[subj].label}: last test ${pct(s)}%. Target is ${target}%. Check the error log.` });
  }

  // 4. Overdue revisions piling up
  const overdue = getDueItems(a.chapters, a.today).filter(i => i.status === 'overdue').length;
  if (overdue >= 5)
    flags.push({ id: 'overdue', severity: 'amber', text: `${overdue} revisions overdue. Do the R1s first. Skip nothing else.` });

  // red first, then amber
  return flags.sort((x, y) => (x.severity === y.severity ? 0 : x.severity === 'red' ? -1 : 1));
}
```

### 4.6 Practical checklists (starter, editable)

These are STARTER items. He must be able to add, rename and delete items. Group by subject. Each item has a stable `id` used as the key in `practicalChecks`.

```ts
// src/seed.ts (ADDITIONS)
export const PRACTICAL_STARTER = {
  physics: [
    { id: 'phy-file',   text: 'Practical file complete and signed' },
    { id: 'phy-exps',   text: 'Every experiment written up (aim, apparatus, observations, result)' },
    { id: 'phy-viva',   text: 'Viva questions revised for each experiment' },
    { id: 'phy-mock',   text: 'Full mock practical done (Saturday run)' },
  ],
  chemistry: [
    { id: 'chem-file',  text: 'Practical file complete and signed' },
    { id: 'chem-vol',   text: 'Volumetric analysis practised (including redox titration calculations)' },
    { id: 'chem-salt',  text: 'Salt analysis practised' },
    { id: 'chem-org',   text: 'Organic tests practised' },
    { id: 'chem-viva',  text: 'Viva questions revised' },
    { id: 'chem-mock',  text: 'Full mock practical done (Saturday run)' },
  ],
  biology: [
    { id: 'bio-file',   text: 'Practical file complete and signed' },
    { id: 'bio-spot',   text: 'Spotters and slides revised' },
    { id: 'bio-diag',   text: 'Diagrams redrawn from memory' },
    { id: 'bio-viva',   text: 'Viva questions revised' },
    { id: 'bio-mock',   text: 'Full mock practical done (Saturday run)' },
  ],
  maths: [
    { id: 'math-proj',  text: 'Maths project finished (conditional probability, Bayes theorem, transportation problem). Target: done by 8 Nov.' },
    { id: 'math-proj2', text: 'Project reviewed and ready to submit' },
  ],
} as const;
```

Show an overall **segmented progress bar** per subject. In Phase 2 (practical sprint), the Today screen shows one extra line under the blocks: "Practical: 30 min today" with a tickbox and a `START` button.

---

## 5. New screens and behaviours

### 5.1 Setup wizard (first run, full-screen, 3 steps, blocky stepper)
1. **Dates:** show the three exam dates with GUESS tags. Let him edit them or tick "confirmed". Skippable.
2. **Finished chapters:** per subject, the starter chapter list as big tickable blocks (pre-ticked per section 4.2). He can rename, delete, add. Show a live counter "31 chapters will get an R1 between Oct 5 and Oct 25".
3. **Pending topics:** show the seeded pending topics (Maths ITF, Maths Definite Integrals, Macbeth Act 5) with editable deadlines.
On finish: call `finishSetup`. If he skips, leave the app usable and show a "Finish setup" button on Chapters.

### 5.2 TODAY additions
- Under the countdown tiles: the **BEHIND banner stack** (max 3, from `behindFlags`, red = white text on red, amber = yellow).
- A **Pending topics** card: the 3 seeded topics, each with a deadline and a `LEARNED TODAY` button (calls `markPendingLearned`). Hide completed ones.
- If any date is unconfirmed: the "Exam dates are guesses" banner (section 0).

### 5.3 REVIEW | MARKS
- Top card: half-yearly notes (section 4.3) and the line about revision.
- **Per-subject cards**: latest %, target %, trend arrow (up/down/flat) and a segmented bar of the last 8 scores. Maths and Physics cards first and biggest.
- **Add score** form: date (default today), subject, English paper when English, type, label, obtained, total.
- Full history list, newest first, with delete. Undated seed scores appear at the bottom as "Before half-yearly".
- **Target line:** "Maths 70% until Nov 21, then 85%. Physics 75% then 85%. Others 85%."

### 5.4 PLAN | PRACTICALS
- The 4 checklists from section 4.6 with progress bars. Practicals countdown at the top with the GUESS tag if unconfirmed.
- Reminder text: "Practical files done by Nov 8. Mock practical every Saturday in Phase 2." (derive "Nov 8" as practicals minus 7 days).
- A small **mock practical log** (date, subject, notes) which also writes a `practical-mock` score if he enters marks.

### 5.5 PLAN | PAPERS and Pre-board mode
- Form to add paper slots (subject, English paper if English, date, optional time). List sorted by date with a countdown on each. He enters these once school releases the timetable. Until then show: "No timetable yet. Add it when school releases it."
- **Pre-board mode:** if papers exist and today is between the first paper date minus 2 days and the last paper date, Today switches to:
  - a giant **NEXT PAPER** block (subject colour, date, "tomorrow / in N days"),
  - the three study blocks all pointing only at that next paper's subject ("Between papers revise only the next paper"),
  - for Maths: focus text "Formulas + your error log".
  - sleep reminder: "Sleep before 10."
  After a paper's date passes, move on to the next one automatically.

---

## 6. Components to add (same style as the main prompt)

```tsx
// src/components/Flags.tsx
import type { Flag } from '../types';

export const FlagBanner = ({ flags }: { flags: Flag[] }) =>
  flags.length === 0 ? null : (
    <section className="space-y-3" aria-label="Behind schedule">
      {flags.slice(0, 3).map(f => (
        <div key={f.id} className="brut-sm flex items-start gap-3 p-3"
             style={{ background: f.severity === 'red' ? 'var(--overdue)' : 'var(--due)', color: f.severity === 'red' ? '#fff' : 'var(--ink)' }}>
          <span className="display shrink-0 text-lg">{f.severity === 'red' ? 'BEHIND' : 'HEADS UP'}</span>
          <p className="font-bold leading-tight">{f.text}</p>
        </div>
      ))}
    </section>
  );

export const GuessTag = () => (
  <span className="mono border-2 border-[var(--ink)] bg-[var(--due)] px-1.5 text-[10px] font-bold uppercase">Guess</span>
);
```

Copy tone stays casual and direct. Examples for this add-on:
- Behind banner: "MATHS: ITF is still not learned. Was due Oct 11. Do it first."
- Dates banner: "Exam dates are guesses. Confirm them when school tells you."
- Empty marks: "No scores yet. Log your first test."
- After a good score: "That's up. Keep going." (no cheerleading)

---

## 7. Build order for this add-on

1. Types, store version 2 with migration, `phases.ts`, date-confirmation UI (GUESS tags, banner, date editor). Replace every hard-coded phase date with `derivePhases`.
2. Seed data: `SEED_SCORES`, `SEED_PENDING`, `STARTER_CHAPTERS`, `PRACTICAL_STARTER`, `HALF_YEARLY_NOTES`. `backlog.ts` plus tests.
3. Setup wizard and `finishSetup`.
4. Pending topics card on Today and `markPendingLearned`.
5. MARKS sub-tab (cards, add form, history, targets).
6. `flags.ts` plus the `FlagBanner` on Today.
7. PRACTICALS sub-tab and the Phase 2 daily practical line.
8. PAPERS sub-tab and Pre-board mode.
9. Polish: empty states, stamp animation on marks saved, focus rings.

Write Vitest tests for: `derivePhases` with the default dates returns Phase 2 = `2026-10-26` to `2026-11-15`, Phase 3 = `2026-11-16` to `2026-11-30`; changing practicals to `2026-11-20` moves Phase 2 start to `2026-10-31`; `scheduleBacklog` puts every R1 between `start` and `end` and R2 = R1 + 6, R3 = R1 + 20; `behindFlags` returns a red flag for a pending topic whose deadline passed.

## 8. Acceptance criteria

- Every guessed exam date shows a **GUESS** tag until he confirms it. Confirming or editing a date moves the phases automatically.
- Today shows a red/amber BEHIND banner if Maths ITF or Definite Integrals are still pending after Oct 11.
- The Setup wizard turns his finished chapters into R1/R2/R3 revisions spread across Phase 1 without him typing any dates.
- MARKS shows his past scores (Maths 9/20 = 45%, Physics 16/20 = 80%, Chemistry and Biology 20/20, English 1 19/20, English 2 15/20) and the targets.
- Maths and Physics are visually the biggest and first everywhere subjects are listed.
- Entering the pre-board timetable switches Today into Pre-board mode when the papers start.
- The bottom nav still has exactly 5 tabs. Existing data from the main prompt's version survives the migration.
- No gradients, blur, soft shadows or rounded pills anywhere. Same design system as the main prompt.

When done, give me a short list of what's built, what's stubbed, and what you would improve next.
