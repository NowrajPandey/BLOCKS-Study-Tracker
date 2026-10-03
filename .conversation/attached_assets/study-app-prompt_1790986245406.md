# PROMPT: Build "BLOCKS", a study + revision tracker web app

Paste everything below this line into your vibe coder. Do not ask me questions. Make the decisions yourself, build in the order given in section 10, and tell me what works after each phase.

---

## 1. What you are building

A single-user, mobile-first web app for a Class 12 ISC student (subjects: Physics, Chemistry, Maths, Biology, English) preparing for **practicals (mid Nov 2026)**, **pre-boards (from 1 Dec 2026)** and **boards (Feb 2027)**.

The student's real problem is NOT how to study. It is **deciding when to revise and how often**. So the app's whole job is:

1. Tell him **exactly what to do right now** (today's 3 study blocks).
2. **Auto-schedule revision** for every chapter he finishes (R1 at +1 day, R2 at +7 days, R3 at +21 days) so he never has to decide.
3. Make missing a day **cheap to recover from** ("never miss twice", Minimum Day mode).
4. Track errors (error log) and weekly review so progress is visible.

Design philosophy: **less app, more action.** The home screen must answer "what do I do now?" in under 2 seconds. No dashboards full of charts nobody reads.

## 2. Tech stack and constraints

- **React + Vite + TypeScript + Tailwind CSS.** React Router for navigation.
- **State:** Zustand with `persist` middleware (localStorage). No backend, no login, no database. Everything runs in the browser.
- **Dates:** plain `YYYY-MM-DD` strings in LOCAL time. Never use `toISOString()` for dates (it shifts to UTC). Use the helpers in section 7.
- **Mobile-first** (design at 390px width first, then scale up to a centered max-width 1100px layout on desktop).
- **PWA-ready:** add a manifest and a basic service worker so it can be installed on a phone home screen. Offline must work.
- **Export / Import:** a button to download all data as JSON and re-import it (backup).
- No external UI kit (no shadcn, MUI, etc.). All components are custom, in the design system below. Icons: `lucide-react` only, always with thick stroke (`strokeWidth={3}`).
- Accessibility: all tap targets at least 48px, visible focus rings, text contrast WCAG AA, respect `prefers-reduced-motion`.

---

## 3. DESIGN GUIDE (follow this strictly)

### 3.1 Style name: Neo-brutalism ("blocky")

Everything is built from **solid blocks with thick black borders and hard offset shadows**. It should feel like physical stickers, buttons and tiles you can press. Bold, flat, high-contrast, a bit loud, very clear.

**Why this works for a study app (use this as your design reasoning):**
- High contrast plus thick borders mean every item is a clear, separate "thing to do". Less visual noise means less friction to start.
- Big blocky buttons feel physically pressable. The press animation gives instant feedback, which makes ticking a block feel satisfying.
- Strong colour coding per subject lets him know the subject without reading.
- Chunky progress bars (segmented blocks) make progress visible at a glance.
- One primary action per screen. Everything else is quieter.

### 3.2 What to NEVER do (hard bans)

- No glassmorphism, no blur, no translucent cards.
- No gradients anywhere. Flat colours only.
- No soft or blurry shadows. Shadows are hard offset only.
- No purple-to-blue "AI" look, no sparkles, no generic SaaS template layout.
- No big rounded pill shapes everywhere. Corners are square (or 4px at most).
- No Inter / Roboto / system-default look. Use the fonts below.
- No emoji clutter. Icons only where they help.
- No stock illustrations, no lorem ipsum, no placeholder text. Every string must be real.
- No streak counters that punish him for missing a day. Use the "never miss twice" indicator instead.

### 3.3 Design tokens

```css
/* src/index.css */
@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@500;700&display=swap');

:root {
  /* base */
  --ink: #111111;          /* all borders, text, shadows */
  --paper: #FFF6DF;        /* page background (warm cream) */
  --card: #FFFFFF;
  --muted: #6B6558;

  /* subjects: one colour each, used for tags, bars, and block headers */
  --maths: #FF5C39;        /* orange-red */
  --physics: #3D5AFE;      /* electric blue */
  --chemistry: #00C48C;    /* green */
  --biology: #C6F432;      /* lime */
  --english: #FF8AD8;      /* pink */

  /* status */
  --done: #00C48C;
  --due: #FFD23F;          /* yellow */
  --overdue: #FF3B3B;      /* red */
  --focus: #FFD23F;

  /* geometry */
  --border: 3px solid var(--ink);
  --shadow: 5px 5px 0 var(--ink);
  --shadow-sm: 3px 3px 0 var(--ink);
  --radius: 0px;
}

* { box-sizing: border-box; }
html, body { background: var(--paper); color: var(--ink); font-family: 'Space Grotesk', sans-serif; }
h1, h2, .display { font-family: 'Archivo Black', sans-serif; letter-spacing: -0.02em; text-transform: uppercase; line-height: 1; }
.mono { font-family: 'JetBrains Mono', monospace; }

/* core blocky surface */
.brut { background: var(--card); border: var(--border); box-shadow: var(--shadow); border-radius: var(--radius); }
.brut-sm { background: var(--card); border: var(--border); box-shadow: var(--shadow-sm); }

/* pressable button: moves into its shadow on press */
.brut-btn {
  background: var(--due); border: var(--border); box-shadow: var(--shadow-sm);
  font-family: 'Archivo Black', sans-serif; text-transform: uppercase;
  padding: 12px 18px; min-height: 48px; cursor: pointer;
  transition: transform 70ms ease, box-shadow 70ms ease;
}
.brut-btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--ink); }
.brut-btn:active { transform: translate(3px, 3px); box-shadow: 0 0 0 var(--ink); }
.brut-btn:focus-visible, .brut:focus-visible { outline: 4px solid var(--ink); outline-offset: 3px; }

/* a block that is done: flat, no shadow, stamped look */
.is-done { box-shadow: none; transform: translate(3px, 3px); background: #E9FFF6; }

@media (prefers-reduced-motion: reduce) { .brut-btn { transition: none; } }
```

### 3.4 Typography

- **Display / headings:** Archivo Black, UPPERCASE, tight tracking. Huge. Page titles 40-56px on mobile.
- **Body / UI:** Space Grotesk 500 and 700. Body 16px minimum.
- **Numbers, dates, countdowns, chapter IDs:** JetBrains Mono 700.
- Strong hierarchy: one huge thing per screen (the current action or the countdown), then medium labels, then small mono metadata. Avoid mid-sized text everywhere.

### 3.5 Component rules

- **Cards/blocks:** white or subject colour fill, 3px black border, 5px hard shadow, square corners. Padding 16px.
- **Subject tag:** small block, subject colour fill, 2px border, uppercase mono text (e.g. `MATHS`).
- **Buttons:** primary = yellow, destructive = red, secondary = white. All use `.brut-btn`.
- **Checkbox:** big 36px square, 3px border. On check, fills green with a thick black tick, and the whole card gets `.is-done` (shadow disappears, card sinks).
- **Progress bar:** segmented. Render as N square blocks side by side (e.g. one per day or per chapter), filled = subject colour, empty = white. Never a smooth thin bar.
- **Countdown tiles:** giant mono number (days left) in a coloured block, label under it in caps.
- **Status:** `DUE` yellow, `OVERDUE` red with white text, `DONE` green. Always a label, never colour alone.
- **Inputs:** 3px border, white, 48px high, hard shadow on focus (not glow).
- **Navigation:** bottom tab bar on mobile (5 tabs, each a blocky square with icon plus caps label, active tab = yellow fill and sunk). On desktop turn it into a left sidebar of the same blocks.
- **Motion:** only press/sink animations (70ms) and a quick 150ms "stamp" scale on completing a block. No slow fades, no parallax.
- **Spacing:** 8px base grid. Gaps between blocks 16px. Generous breathing room, because the style is loud and needs space.

### 3.6 Study-friendly UX cues (bake these in)

1. **One primary action per screen**, always the biggest and yellow.
2. **"Start" is the hardest part**, so the Today screen has a giant `START 10 MIN` button. It opens the focus timer already set to 10 minutes, with a "keep going" button after.
3. **Show the next action, not the whole plan.** Today shows today. The plan is one tap away, not in your face.
4. **Make finishing feel good:** checking a block does a stamp animation plus a short line of copy ("Block done. Nice.").
5. **Missing a day is not shameful.** Show the "never miss twice" banner, not a broken streak.
6. **Limit choices:** at most 3 blocks a day. At most 3 revision items shown at once (with "show all" below).
7. **Countdowns create honest urgency:** days to practicals, pre-boards and boards are always visible on Today.

### 3.7 Copy tone

Casual, direct, punchy. Like a friend who tells you the truth. Examples:
- Empty queue: "Nothing due. Go get ahead."
- After a miss: "Missed yesterday. Fine. Don't miss twice. Minimum Day only."
- Minimum Day on: "Maths 45 min + 1 revision. That's a win."
- Overdue: "3 revisions overdue. Start with the R1s."

No corporate wording. No "Great job, champion!" cheerleading.

---

## 4. Screens

Five tabs. Build exactly these.

### 4.1 TODAY (home)
- Top: big date + phase pill (e.g. `PHASE 1: CATCH UP`), then 3 countdown tiles (Practicals, Pre-boards, Boards: days left, mono).
- If yesterday had **zero blocks done**: amber banner "Missed yesterday. Don't miss twice." and the Minimum Day toggle is auto-suggested.
- **Minimum Day toggle** (big switch). When on, the 3 blocks collapse to: `Maths 45 min` plus `1 revision item`. Both tickable.
- **3 block cards (A, B, C)**: each shows time suggestion, subject tag (colour), focus text from the weekly template, a big checkbox, and a `START` button that opens the focus timer.
- **Due revisions** (max 3 visible): each row shows chapter name, subject tag, pass (`R1/R2/R3`), status label, and a checkbox that completes it. "Show all (n)" expands.
- **Giant button:** `START 10 MIN`.

### 4.2 CHAPTERS
- Subject filter tabs (colour blocks).
- List of chapters per subject. Each shows learned date and three segmented blocks for R1/R2/R3 (filled when done, yellow when due, red when overdue, white when future) plus a PYQ checkbox.
- **Add chapter** form: subject, name, learned-on date (default today). On save, auto-generate R1/R2/R3 via `buildRevisions` (section 7).
- Tap a chapter to see its R1/R2/R3 dates and mark any as done.
- Bulk add: a textarea where each line is a chapter name for a chosen subject and the learned date (for chapters he already finished earlier).

### 4.3 PLAN
- Vertical timeline of phases 0-4 as stacked blocks with date ranges. Current phase highlighted yellow.
- Week-by-week milestone list (section 8) with checkboxes. Current week at top, auto-expanded.
- Weekly template grid (Mon-Sun by A/B/C).
- All exam dates editable in Settings.

### 4.4 ERRORS (error log)
- Add entry: date, subject, question/topic, reason (concept / calculation / silly / time), one-line fix. `redoOn` auto = date + 7 days.
- List with filters by subject and reason. Entries due for redo show a `REDO` yellow tag, tickable.
- Tiny summary: count by reason as a segmented block bar ("what's costing me marks").

### 4.5 REVIEW (weekly, Sundays)
- Checklist from the plan:
  1. Did I hit this week's milestone for Maths and Physics?
  2. Which R1/R2/R3 did I miss? (button: "Show overdue")
  3. What was my main error reason this week? (auto-filled from the error log, editable)
  4. Next week's top 3 items (3 text fields only, no more).
- Save review per week. Past reviews listed below.
- Sunday also shows the "timed test" reminder.

### Extra (build after the 5 tabs work)
- **Focus timer** (modal/page): presets 10 / 25 / 45 min, big mono countdown, subject picker, pause/finish, log minutes to the day.
- **Settings:** edit exam dates, export/import JSON, reset data (with a blocky confirm modal).

---

## 5. Data model

```ts
// src/types.ts
export type SubjectId = 'maths' | 'physics' | 'chemistry' | 'biology' | 'english';
export type BlockId = 'A' | 'B' | 'C';
export type Pass = 'R1' | 'R2' | 'R3';
export type ErrorReason = 'concept' | 'calculation' | 'silly' | 'time';

export interface Revision {
  pass: Pass;
  dueOn: string;      // YYYY-MM-DD
  doneOn?: string;    // YYYY-MM-DD
}

export interface Chapter {
  id: string;
  subject: SubjectId;
  name: string;
  learnedOn: string;  // YYYY-MM-DD
  revisions: Revision[];
  pyqDone: boolean;
}

export interface ErrorEntry {
  id: string;
  date: string;
  subject: SubjectId;
  topic: string;
  reason: ErrorReason;
  fix: string;
  redoOn: string;      // date + 7
  redoneOn?: string;
}

export interface DayLog {
  date: string;
  blocksDone: Record<BlockId, boolean>;
  minimumDay: boolean;
  minimumDone: { maths: boolean; revision: boolean };
  focusMinutes: number;
}

export interface WeeklyReview {
  weekStart: string;   // Monday, YYYY-MM-DD
  hitMilestone: boolean;
  mainErrorReason?: ErrorReason;
  nextWeekTop3: [string, string, string];
  savedOn: string;
}

export interface Settings {
  examDates: { practicals: string; preBoards: string; boards: string };
}
```

---

## 6. Base code: store

```ts
// src/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Chapter, ErrorEntry, DayLog, WeeklyReview, Settings, SubjectId, BlockId, Pass, ErrorReason } from './types';
import { buildRevisions, completeRevisionOn, todayISO, addDays } from './dates';

interface State {
  chapters: Chapter[];
  errors: ErrorEntry[];
  days: Record<string, DayLog>;
  reviews: WeeklyReview[];
  milestonesDone: Record<string, boolean>;   // key: `${weekNumber}:${index}`
  settings: Settings;

  addChapter: (subject: SubjectId, name: string, learnedOn?: string) => void;
  completeRevision: (chapterId: string, pass: Pass) => void;
  togglePyq: (chapterId: string) => void;
  deleteChapter: (chapterId: string) => void;

  toggleBlock: (date: string, block: BlockId) => void;
  setMinimumDay: (date: string, on: boolean) => void;
  toggleMinimum: (date: string, key: 'maths' | 'revision') => void;
  addFocusMinutes: (date: string, minutes: number) => void;

  addError: (e: { subject: SubjectId; topic: string; reason: ErrorReason; fix: string; date?: string }) => void;
  redoError: (id: string) => void;

  saveReview: (r: WeeklyReview) => void;
  toggleMilestone: (key: string) => void;
  setExamDates: (d: Settings['examDates']) => void;
  importAll: (json: string) => void;
  exportAll: () => string;
}

const emptyDay = (date: string): DayLog => ({
  date,
  blocksDone: { A: false, B: false, C: false },
  minimumDay: false,
  minimumDone: { maths: false, revision: false },
  focusMinutes: 0,
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      chapters: [],
      errors: [],
      days: {},
      reviews: [],
      milestonesDone: {},
      settings: { examDates: { practicals: '2026-11-15', preBoards: '2026-12-01', boards: '2027-02-15' } },

      addChapter: (subject, name, learnedOn = todayISO()) =>
        set(s => ({
          chapters: [
            ...s.chapters,
            { id: crypto.randomUUID(), subject, name: name.trim(), learnedOn, revisions: buildRevisions(learnedOn), pyqDone: false },
          ],
        })),

      completeRevision: (chapterId, pass) =>
        set(s => ({
          chapters: s.chapters.map(c => (c.id === chapterId ? { ...c, revisions: completeRevisionOn(c.revisions, pass, todayISO()) } : c)),
        })),

      togglePyq: id => set(s => ({ chapters: s.chapters.map(c => (c.id === id ? { ...c, pyqDone: !c.pyqDone } : c)) })),
      deleteChapter: id => set(s => ({ chapters: s.chapters.filter(c => c.id !== id) })),

      toggleBlock: (date, block) =>
        set(s => {
          const d = s.days[date] ?? emptyDay(date);
          return { days: { ...s.days, [date]: { ...d, blocksDone: { ...d.blocksDone, [block]: !d.blocksDone[block] } } } };
        }),

      setMinimumDay: (date, on) =>
        set(s => ({ days: { ...s.days, [date]: { ...(s.days[date] ?? emptyDay(date)), minimumDay: on } } })),

      toggleMinimum: (date, key) =>
        set(s => {
          const d = s.days[date] ?? emptyDay(date);
          return { days: { ...s.days, [date]: { ...d, minimumDone: { ...d.minimumDone, [key]: !d.minimumDone[key] } } } };
        }),

      addFocusMinutes: (date, minutes) =>
        set(s => {
          const d = s.days[date] ?? emptyDay(date);
          return { days: { ...s.days, [date]: { ...d, focusMinutes: d.focusMinutes + minutes } } };
        }),

      addError: ({ subject, topic, reason, fix, date = todayISO() }) =>
        set(s => ({
          errors: [{ id: crypto.randomUUID(), date, subject, topic, reason, fix, redoOn: addDays(date, 7) }, ...s.errors],
        })),

      redoError: id => set(s => ({ errors: s.errors.map(e => (e.id === id ? { ...e, redoneOn: todayISO() } : e)) })),

      saveReview: r => set(s => ({ reviews: [r, ...s.reviews.filter(x => x.weekStart !== r.weekStart)] })),
      toggleMilestone: key => set(s => ({ milestonesDone: { ...s.milestonesDone, [key]: !s.milestonesDone[key] } })),
      setExamDates: d => set(s => ({ settings: { ...s.settings, examDates: d } })),

      exportAll: () => {
        const { chapters, errors, days, reviews, milestonesDone, settings } = get();
        return JSON.stringify({ chapters, errors, days, reviews, milestonesDone, settings }, null, 2);
      },
      importAll: json => {
        const data = JSON.parse(json);
        set({
          chapters: data.chapters ?? [], errors: data.errors ?? [], days: data.days ?? {},
          reviews: data.reviews ?? [], milestonesDone: data.milestonesDone ?? {}, settings: data.settings ?? get().settings,
        });
      },
    }),
    { name: 'blocks-study-app-v1' }
  )
);
```

---

## 7. Base code: dates and the revision scheduler (the core of the app)

```ts
// src/dates.ts
import type { Revision, Pass, Chapter } from './types';

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const todayISO = () => toISO(new Date());
export const addDays = (s: string, n: number) => {
  const d = fromISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const daysBetween = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86400000);
export const mondayOf = (s: string) => {
  const d = fromISO(s);
  const diff = (d.getDay() + 6) % 7;      // Monday = 0
  d.setDate(d.getDate() - diff);
  return toISO(d);
};

// ---- spaced revision: R1 = +1, R2 = +7, R3 = +21 days after learning ----
export const GAPS: Record<Pass, number> = { R1: 1, R2: 7, R3: 21 };
const ORDER: Pass[] = ['R1', 'R2', 'R3'];

export const buildRevisions = (learnedOn: string): Revision[] =>
  ORDER.map(p => ({ pass: p, dueOn: addDays(learnedOn, GAPS[p]) }));

/**
 * Complete a pass. If done late, push the NEXT pass so the gap between passes is still respected.
 * R1 -> R2 gap = 6 days, R2 -> R3 gap = 14 days.
 */
export function completeRevisionOn(revs: Revision[], pass: Pass, today: string): Revision[] {
  const idx = ORDER.indexOf(pass);
  const next = ORDER[idx + 1];
  return revs.map(r => {
    if (r.pass === pass) return { ...r, doneOn: today };
    if (next && r.pass === next && !r.doneOn) {
      const minGap = GAPS[next] - GAPS[pass];
      const earliest = addDays(today, minGap);
      return { ...r, dueOn: r.dueOn > earliest ? r.dueOn : earliest };
    }
    return r;
  });
}

export type RevStatus = 'done' | 'overdue' | 'due' | 'future';
export const revStatus = (r: Revision, today: string): RevStatus =>
  r.doneOn ? 'done' : r.dueOn < today ? 'overdue' : r.dueOn === today ? 'due' : 'future';

export interface DueItem { chapter: Chapter; revision: Revision; status: 'overdue' | 'due' }

/** Everything that needs doing today: overdue first, then R1 before R2 before R3. */
export function getDueItems(chapters: Chapter[], today: string): DueItem[] {
  const items: DueItem[] = [];
  for (const chapter of chapters)
    for (const revision of chapter.revisions) {
      const st = revStatus(revision, today);
      if (st === 'overdue' || st === 'due') items.push({ chapter, revision, status: st });
    }
  return items.sort((a, b) =>
    a.status !== b.status ? (a.status === 'overdue' ? -1 : 1) : ORDER.indexOf(a.revision.pass) - ORDER.indexOf(b.revision.pass)
  );
}

/** "Never miss twice": true if yesterday had zero blocks done and no minimum-day tasks done. */
export function missedYesterday(days: Record<string, import('./types').DayLog>, today: string, appStartISO: string) {
  const y = addDays(today, -1);
  if (y < appStartISO) return false;
  const d = days[y];
  if (!d) return true;
  const any = Object.values(d.blocksDone).some(Boolean) || d.minimumDone.maths || d.minimumDone.revision;
  return !any;
}
```

Write unit tests (Vitest) for: `buildRevisions('2026-10-10')` returns due dates `2026-10-11`, `2026-10-17`, `2026-10-31`; completing R1 late on `2026-10-20` pushes R2 to at least `2026-10-26`; `getDueItems` sorts overdue before due and R1 before R3.

---

## 8. Base code: seed data (phases, weekly template, milestones)

```ts
// src/seed.ts
import type { BlockId, SubjectId } from './types';

export const SUBJECTS: Record<SubjectId, { label: string; color: string }> = {
  maths:     { label: 'MATHS',     color: 'var(--maths)' },
  physics:   { label: 'PHYSICS',   color: 'var(--physics)' },
  chemistry: { label: 'CHEMISTRY', color: 'var(--chemistry)' },
  biology:   { label: 'BIOLOGY',   color: 'var(--biology)' },
  english:   { label: 'ENGLISH',   color: 'var(--english)' },
};

export const BLOCK_TIMES: Record<BlockId, { weekday: string; length: string }> = {
  A: { weekday: 'Before school, about 5:30', length: '75 min' },
  B: { weekday: 'After rest, about 2:30', length: '2 h' },
  C: { weekday: 'Evening, about 6:30', length: '75 min' },
};
// Rest hour after school = lunch + nap or walk. No YouTube before Block B.

export interface BlockPlan { subject: SubjectId | 'mixed' | 'flex' | 'test'; focus: string }

// key = getDay(): 0 = Sunday ... 6 = Saturday
export const WEEK_TEMPLATE: Record<number, Record<BlockId, BlockPlan>> = {
  1: { A: { subject: 'maths', focus: 'New topic or practice' },
       B: { subject: 'physics', focus: 'New chapter + numericals' },
       C: { subject: 'chemistry', focus: 'Revision queue' } },
  2: { A: { subject: 'maths', focus: 'New topic or practice' },
       B: { subject: 'chemistry', focus: 'Numericals + organic (practicals from Phase 2)' },
       C: { subject: 'english', focus: 'Literature + language' } },
  3: { A: { subject: 'maths', focus: 'New topic or practice' },
       B: { subject: 'physics', focus: 'New chapter + numericals' },
       C: { subject: 'biology', focus: 'Revision queue' } },
  4: { A: { subject: 'maths', focus: 'New topic or practice' },
       B: { subject: 'mixed', focus: 'Chemistry 1 h + Biology 1 h' },
       C: { subject: 'physics', focus: 'Derivations + old chapters' } },
  5: { A: { subject: 'maths', focus: 'New topic or practice' },
       B: { subject: 'physics', focus: 'PYQs + numericals' },
       C: { subject: 'flex', focus: 'FLEX: whatever is behind or due. Your buffer.' } },
  6: { A: { subject: 'maths', focus: '2.5 h: practice + PYQs' },
       B: { subject: 'physics', focus: '2 h: PYQs' },
       C: { subject: 'mixed', focus: 'Chem + Bio 2 h (practicals from Phase 2). Clear the R3s.' } },
  0: { A: { subject: 'test', focus: 'Timed test, 3 h (chapter test in Phases 1-2, full paper in Phase 3)' },
       B: { subject: 'mixed', focus: 'Error analysis + fixes, 1.5 h' },
       C: { subject: 'mixed', focus: 'Weekly review + English, 1.5 h. Afternoon off.' } },
};

export const PHASES = [
  { id: 0, name: 'Setup',               start: '2026-10-03', end: '2026-10-04',
    job: 'Confirm pre-board syllabus + practical dates. Add every finished chapter to the tracker.' },
  { id: 1, name: 'Catch up and build',  start: '2026-10-05', end: '2026-10-25',
    job: 'Finish pending Maths (ITF, definite integrals). Get Physics ahead of school. First revision pass of finished chapters.' },
  { id: 2, name: 'Practical sprint',    start: '2026-10-26', end: '2026-11-15',
    job: 'Practical files, viva, Saturday mock practicals. Theory on a lighter load. R2 of everything.' },
  { id: 3, name: 'Pre-board mode',     start: '2026-11-16', end: '2026-11-30',
    job: 'Full-syllabus round 2. Timed full papers every weekend. Error log cleanup. Nov 30 is a light day.' },
  { id: 4, name: 'Pre-boards, then boards', start: '2026-12-01', end: '2027-02-28',
    job: 'Between papers revise only the next paper. After results, analyse mistakes and plan the boards.' },
];

// weekStart = Monday. milestones render as checkboxes on the PLAN tab.
export const WEEK_MILESTONES: { week: number; start: string; end: string; items: string[] }[] = [
  { week: 1, start: '2026-10-05', end: '2026-10-11', items: [
    'Maths: finish ITF + definite integrals', 'Physics: match school pace, R1 Current Electricity',
    'Chemistry: R1 Solutions', 'English: finish Macbeth Act 5', 'Start the error log'] },
  { week: 2, start: '2026-10-12', end: '2026-10-18', items: [
    'Maths: PYQs on ITF + definite integrals', 'Physics: next new chapter (1 ahead of school)',
    'Chemistry: R1 Electrochemistry', 'Biology: R1 first set of chapters'] },
  { week: 3, start: '2026-10-19', end: '2026-10-25', items: [
    'Maths: topic PYQs on all finished chapters', 'Maths chapter test Sun Oct 25 (aim 70%+)',
    'Physics: 2 chapters ahead of school', 'Chemistry: R1 organic', 'Biology: R1 till evolution', 'English: R1 poems + stories'] },
  { week: 4, start: '2026-10-26', end: '2026-11-01', items: [
    'Maths: mixed PYQ sets + fix error log themes', 'Physics: new chapters + numericals',
    'Practicals begin: 30 min a day', 'R2 passes start', 'Checkpoint Sun Nov 1: 20 min plan reset'] },
  { week: 5, start: '2026-11-02', end: '2026-11-08', items: [
    'Maths project done', 'Practical write-ups + viva', 'All practical files done by Nov 8', 'Mock practical on Saturday'] },
  { week: 6, start: '2026-11-09', end: '2026-11-15', items: [
    'Daily Maths block (60 min), light theory', 'Practical rehearsals + last viva run', 'Practical week: run the mocks, sleep well'] },
  { week: 7, start: '2026-11-16', end: '2026-11-22', items: [
    'Round 2: weakest 5 chapters in Maths + Physics', 'Timed Maths paper (Sat)', 'Timed Physics paper (Sun)', 'R3s due', 'Cheat sheets: Chem + Bio'] },
  { week: 8, start: '2026-11-23', end: '2026-11-29', items: [
    'Final error log cleanup', 'Second full Maths paper', 'Timed Chemistry (Sat)', 'Timed Biology + English (Sun)', 'Nov 30: light day, formulas only, sleep early'] },
];
```

---

## 9. Base code: UI starters (extend these, don't replace the style)

```tsx
// src/components/Brut.tsx
import type { ReactNode, ButtonHTMLAttributes } from 'react';

export const SubjectTag = ({ color, label }: { color: string; label: string }) => (
  <span className="mono inline-block border-2 border-[var(--ink)] px-2 py-0.5 text-xs font-bold uppercase"
        style={{ background: color }}>{label}</span>
);

export const BrutButton = ({ variant = 'primary', className = '', ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'danger' | 'ghost' }) => {
  const bg = variant === 'primary' ? 'var(--due)' : variant === 'danger' ? 'var(--overdue)' : '#fff';
  const fg = variant === 'danger' ? '#fff' : 'var(--ink)';
  return <button {...p} className={`brut-btn ${className}`} style={{ background: bg, color: fg }} />;
};

export const BigCheck = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
  <button role="checkbox" aria-checked={checked} aria-label={label} onClick={onChange}
    className="grid h-9 w-9 shrink-0 place-items-center border-[3px] border-[var(--ink)]"
    style={{ background: checked ? 'var(--done)' : '#fff' }}>
    {checked && <svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 12l5 5L20 6" fill="none" stroke="#111" strokeWidth="4" strokeLinecap="square" /></svg>}
  </button>
);

// segmented progress: one square per item
export const Segments = ({ total, filled, color }: { total: number; filled: number; color: string }) => (
  <div className="flex gap-1" aria-label={`${filled} of ${total}`}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="h-4 flex-1 border-2 border-[var(--ink)]" style={{ background: i < filled ? color : '#fff' }} />
    ))}
  </div>
);

export const CountdownTile = ({ label, days, color }: { label: string; days: number; color: string }) => (
  <div className="brut-sm p-3" style={{ background: color }}>
    <div className="display mono text-5xl leading-none">{Math.max(days, 0)}</div>
    <div className="mt-1 text-xs font-bold uppercase">{label}</div>
  </div>
);
```

```tsx
// src/components/BlockCard.tsx
import { SUBJECTS, BLOCK_TIMES, type BlockPlan } from '../seed';
import { BigCheck, SubjectTag, BrutButton } from './Brut';
import type { BlockId } from '../types';

export function BlockCard({ id, plan, done, onToggle, onStart }:
  { id: BlockId; plan: BlockPlan; done: boolean; onToggle: () => void; onStart: () => void }) {
  const sub = plan.subject in SUBJECTS ? SUBJECTS[plan.subject as keyof typeof SUBJECTS] : null;
  const color = sub?.color ?? (plan.subject === 'flex' ? 'var(--due)' : plan.subject === 'test' ? 'var(--ink)' : '#fff');
  return (
    <div className={`brut p-4 ${done ? 'is-done' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="display grid h-12 w-12 place-items-center border-[3px] border-[var(--ink)] text-2xl"
             style={{ background: color, color: plan.subject === 'test' ? '#fff' : 'var(--ink)' }}>{id}</div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {sub ? <SubjectTag color={sub.color} label={sub.label} /> : <SubjectTag color={color} label={String(plan.subject).toUpperCase()} />}
            <span className="mono text-xs font-bold">{BLOCK_TIMES[id].length}</span>
          </div>
          <p className="mt-2 text-lg font-bold leading-tight">{plan.focus}</p>
          <p className="mono mt-1 text-xs text-[var(--muted)]">{BLOCK_TIMES[id].weekday}</p>
        </div>
        <BigCheck checked={done} onChange={onToggle} label={`Block ${id} done`} />
      </div>
      {!done && <BrutButton className="mt-3 w-full" onClick={onStart}>Start block {id}</BrutButton>}
    </div>
  );
}
```

```tsx
// src/pages/Today.tsx (skeleton: finish it according to section 4.1)
import { useStore } from '../store';
import { todayISO, daysBetween, getDueItems, missedYesterday } from '../dates';
import { WEEK_TEMPLATE, PHASES } from '../seed';
import { BlockCard } from '../components/BlockCard';
import { CountdownTile } from '../components/Brut';

export default function Today() {
  const { chapters, days, settings, toggleBlock } = useStore();
  const today = todayISO();
  const log = days[today];
  const plan = WEEK_TEMPLATE[new Date().getDay()];
  const phase = PHASES.find(p => today >= p.start && today <= p.end);
  const due = getDueItems(chapters, today);
  const missed = missedYesterday(days, today, '2026-10-05');
  const { practicals, preBoards, boards } = settings.examDates;

  return (
    <main className="mx-auto max-w-[1100px] space-y-4 p-4 pb-28">
      <header>
        <h1 className="text-5xl">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</h1>
        {phase && <span className="mono mt-2 inline-block border-[3px] border-[var(--ink)] bg-[var(--due)] px-2 py-1 text-xs font-bold uppercase">Phase {phase.id}: {phase.name}</span>}
      </header>

      <section className="grid grid-cols-3 gap-3">
        <CountdownTile label="Practicals" days={daysBetween(today, practicals)} color="var(--biology)" />
        <CountdownTile label="Pre-boards" days={daysBetween(today, preBoards)} color="var(--due)" />
        <CountdownTile label="Boards" days={daysBetween(today, boards)} color="var(--english)" />
      </section>

      {missed && (
        <div className="brut border-[var(--ink)] bg-[var(--due)] p-4 font-bold">
          Missed yesterday. Fine. Don't miss twice. Minimum Day only.
        </div>
      )}

      {/* TODO: Minimum Day toggle (collapses to Maths 45 min + 1 revision) */}

      <section className="space-y-4">
        {(['A', 'B', 'C'] as const).map(id => (
          <BlockCard key={id} id={id} plan={plan[id]} done={!!log?.blocksDone[id]}
                     onToggle={() => toggleBlock(today, id)} onStart={() => {/* open focus timer */}} />
        ))}
      </section>

      {/* TODO: Due revisions (max 3, "show all" expands) using `due` */}
      {/* TODO: giant START 10 MIN button -> focus timer */}
    </main>
  );
}
```

Tailwind config: extend `fontFamily` with `display: ['Archivo Black']`, `sans: ['Space Grotesk']`, `mono: ['JetBrains Mono']`. Keep Tailwind's default spacing. Do not add any gradient or blur utilities to the design.

---

## 10. Build order (do these in sequence and tell me what works after each)

1. **Scaffold:** Vite + React + TS + Tailwind, fonts, `index.css` tokens, router with 5 tabs, bottom nav (blocky), PWA manifest.
2. **Core logic:** `types.ts`, `dates.ts`, `seed.ts`, `store.ts` exactly as in sections 5-8, plus the Vitest tests.
3. **TODAY screen** complete (section 4.1), including Minimum Day, due revisions, missed-yesterday banner, countdowns.
4. **CHAPTERS** with add, bulk add, R1/R2/R3 segmented blocks, complete revisions.
5. **ERRORS** log with redo dates and reason summary.
6. **PLAN** tab with phases, week milestones (checkboxes saved in `milestonesDone`), weekly template.
7. **REVIEW** tab with Sunday checklist, saved reviews.
8. **Focus timer** (10 / 25 / 45), logs minutes, `START 10 MIN` button wired up.
9. **Settings:** edit exam dates, export/import JSON, reset data.
10. **Polish:** stamp animation on completing a block, empty states with real copy, keyboard focus, `prefers-reduced-motion`, offline test, Lighthouse accessibility 90+.

## 11. Acceptance criteria

- Opening the app on a phone shows today's 3 blocks and what's due, with no scrolling needed to see the first block.
- Adding a chapter learned on 2026-10-10 creates R1 = 2026-10-11, R2 = 2026-10-17, R3 = 2026-10-31.
- Completing a pass late pushes the next pass so the gap is still respected.
- Missing a whole day shows the banner the next day. There is no streak counter anywhere.
- Zero gradients, zero blur, zero soft shadows, zero rounded pills anywhere in the UI.
- Works offline after first load. Data survives refresh. Export then import restores everything.
- Every piece of text is real copy in the tone from section 3.7.

When done, show me a short list of what's built, what's stubbed, and what you'd improve next.
