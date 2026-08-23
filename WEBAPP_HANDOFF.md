# Personal Planner — Web App Handoff

Everything needed to recreate this app as a web application. The iOS app is built and
working; this document captures all the decisions, data models, screens, and design
tokens so a new project can produce the same result in a browser.

---

## 1. What this app is

A personal task-planning app. The defining goal is **feel**: checking things off should
be satisfying — through animation, smooth transitions, and good sound/haptics (on
web: visual animation + optional sound). It should feel rewarding, not flat.

This is a **learning project** — clarity over cleverness. Straightforward code, no
premature abstractions.

---

## 2. Core concept: Lanes

Tasks belong to one of two **lanes**:

| Lane | Purpose | Key mechanic |
|------|---------|--------------|
| **Work** | Professional tasks | Grouped by customer name, no daily target, backlog-first |
| **Afterwork** | Personal to-dos | Each task has a duration (minutes); done tasks feed the **day % ring** |

Tasks can also sit in the **brain dump** (unsorted, no lane).

---

## 3. Navigation structure

Six top-level tabs:

```
Tasks | Calendar | Workout | Growth | Buy | Stats
```

**Tasks tab** is the home screen. The others (Calendar, Workout, Buy, Stats) are
stubs — not yet fully implemented. Focus on Tasks and Growth.

Sub-screens reached by push/drill-down (not tabs):
- `/work` — Work lane detail
- `/afterwork` — Afterwork lane detail
- `/task/new` — Add task modal
- `/task/[id]` — Task detail (read/edit)
- `/growth/braindump` — Brain dump
- `/growth/journal` — Daily journal
- `/growth/planner` — Weekly planner

---

## 4. Design tokens

Dark theme throughout. All values are directly translatable to CSS variables.

### Colors

```
background:       #0F0F14   /* page background */
surface:          #1A1A24   /* cards, inputs */
surfaceElevated:  #22222F   /* modals, raised cards */
border:           #2A2A3A   /* subtle borders */

accent:           #6C63FF   /* primary action — purple */
accentLight:      #8B84FF   /* hover/focus of accent */
success:          #4ECDC4   /* completion — teal/green */
danger:           #FF6B6B   /* destructive */

textPrimary:      #F0F0F8
textSecondary:    #8888AA
textMuted:        #444460   /* disabled, placeholders */

/* Category accent colors */
categoryWork:     #54A0FF   /* blue */
categoryMeals:    #FF9F43   /* orange */
categoryWorkout:  #5F27CD   /* dark purple */
categoryRemember: #FECA57   /* yellow */
categoryPlans:    #1DD1A1   /* green */
categoryDeadlines:#FF6B6B   /* red */
```

### Spacing (px)

```
xs: 4  |  sm: 8  |  md: 16  |  lg: 24  |  xl: 32  |  xxl: 48
```

### Border radius (px)

```
sm: 8  |  md: 12  |  lg: 16  |  xl: 24  |  full: 9999
```

### Typography (font sizes in px)

```
xs: 11  |  sm: 13  |  md: 15  |  lg: 18  |  xl: 22  |  xxl: 28  |  title: 34
weights: 400 / 500 / 600 / 700
```

### Animation durations (ms)

```
instant: 100  |  fast: 200  |  normal: 300  |  slow: 500  |  celebration: 800
```

---

## 5. Data models

### Task

```ts
interface Task {
  id: string;                  // uuid
  title: string;
  notes: string | null;
  status: 'pending' | 'completed' | 'skipped';
  category: 'meals'|'work'|'private'|'workout'|'remember'|'plans'|'deadlines'|'inbox';
  lane: 'work' | 'afterwork' | null;
  customer: string | null;       // Work lane only
  durationMinutes: number | null; // Afterwork lane only — feeds day % ring
  isBacklog: boolean;            // false = "Today's to-do", true = "Things to be done"
  dueDate: string | null;        // 'YYYY-MM-DD'
  dueTime: string | null;        // 'HH:MM'
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### BrainDumpItem

```ts
interface BrainDumpItem {
  id: string;
  text: string;
  createdAt: string;
}
```

### JournalEntry (one per day)

```ts
interface JournalEntry {
  id: string;
  date: string;            // 'YYYY-MM-DD', unique constraint
  rating: number;          // 1–100, required
  ratingNote: string | null;
  bedTime: string | null;  // 'HH:MM'
  wakeTime: string | null; // 'HH:MM'
  learning: string | null;
  tomorrow: string | null; // "tomorrow I will…" feeds planner
  photoUris: string[];
  createdAt: string;
  updatedAt: string;
}
```

### WishlistItem

```ts
interface WishlistItem {
  id: string;
  name: string;
  currentPrice: number | null;
  targetPrice: number | null;  // alert when price drops to/below this
  isWatching: boolean;
  onSale: boolean;
  salePrice: number | null;
  createdAt: string;
  updatedAt: string;
}
```

### DevGoal (weekly personal dev hours target)

```ts
interface DevGoal {
  id: string;
  weekStart: string;     // 'YYYY-MM-DD' Monday
  targetHours: number;   // e.g. 5
  loggedMinutes: number; // accumulated this week
}
```

### WeeklyReview

```ts
interface WeeklyGoal {
  id: string;
  weekStart: string;
  text: string;
  isWish: boolean;   // loose wish vs. hard goal
  achieved: boolean;
}

interface WeeklyReview {
  id: string;
  weekStart: string;
  reflection: string;
  completedAt: string;
}
```

---

## 6. Screen-by-screen spec

### Screen A — Tasks home (`/`)

**What it does:** Day overview + lane entry points.

**Layout (top to bottom):**
1. Date label — e.g. `WED 18 · AFTERNOON` (xs, muted, all-caps, letter-spaced)
2. Day progress row — donut ring (62px) + text
   - Ring shows afterwork completion % in `success` color
   - Label: "Day progress" / "Afterwork only — Work doesn't count"
3. **Work lane card** — blue left border (6px), `categoryWork` color
   - Header row: "Work" title + "TRACKING" pill badge + chevron
   - Subtext: task count or "No tasks yet"
   - Tapping → `/work`
4. **Afterwork lane card** — teal left border, smaller donut ring (46px) inside
   - Shows done/total count and minutes remaining
   - Tapping → `/afterwork`
5. Small hint: "growth moved to its own tab ↗"
6. "＋ Add a task" button — full width, outlined, navigates to `/task/new`

**Donut ring implementation:** Two clipped half-circles rotated by the fill percentage.
No native SVG needed — pure CSS with `overflow: hidden` + `transform: rotate`.

---

### Screen B — Work detail (`/work`)

**What it does:** All Work tasks, grouped by customer, with filter chips.

**Layout:**
1. Header row: `‹` back + "Work" title + task count badge (right)
2. Subtitle: "No daily target — ordered by customer."
3. Filter chips: `All` / `Today` / `Backlog` — pill shaped, active chip filled with `accent`
4. Section list grouped by `customer` (or "No customer")
   - Section header: customer name (uppercase, `categoryWork` color) + count, underlined
   - Task row: checkbox (16px rounded square) + title + optional today-dot (7px circle)
   - Completed task: checkbox filled `success`, title struck through + muted
5. FAB bottom-right — 56px circle, `categoryWork` color, `+` icon → `/task/new?lane=work`

**Filters:**
- `all` → all work tasks
- `today` → `dueDate === todayISO()`
- `backlog` → `isBacklog === true`

---

### Screen C — Afterwork detail (`/afterwork`)

**What it does:** Today's personal to-dos + backlog, with progress bar.

**Layout:**
1. Header row: `‹` back + "Afterwork" + tagline "post-work to-dos" (right, `success`)
2. Progress bar: full-width track (12px tall, `success` fill) + % label
3. Two sections:
   - **TODAY'S TO-DO** — tasks where `!isBacklog && dueDate === today`
   - **THINGS TO BE DONE** — backlog tasks
4. Task row: checkbox (18px, dashed border for backlog) + title + duration badge + "→ today" button for backlog items
5. Footer summary: "X of Y done · Zm left"
6. FAB → `/task/new?lane=afterwork`

---

### Screen D/E — New task modal (`/task/new`)

**What it does:** Add a task. Lane picker appears first so keyboard doesn't cover it.

**Order of fields:**
1. Drag handle (decorative pill at top)
2. "New task" heading
3. **LANE picker** — two full-width buttons: Work (blue) / Afterwork (teal)
   - Active lane: filled background + white text
   - Selecting a lane auto-focuses the title input
4. **Title input** — only shown after lane is selected; auto-focused
5. **WHEN picker** (shown after lane selected): "Today's to-do" vs "Things to be done" radio buttons
6. **Lane-specific fields:**
   - Work: CUSTOMER text input + DESCRIPTION multiline input
   - Afterwork: DURATION stepper (−5/+5 in 5-min increments) + preset chips (10m, 15m, 30m, 1h)
7. Footer CTA button — color matches selected lane, label = "Add to Work · Today" etc.

**URL param:** `/task/new?lane=work` or `?lane=afterwork` pre-selects the lane and auto-focuses title immediately.

---

### Screen F — Growth tab (`/growth`)

**What it does:** Hub for personal development features.

**Layout:**
1. "Growth" large title
2. Weekly dev goal card — purple left border, progress track, "set in Planner →" link
3. TODAY'S DEV — list of up to 5 today's afterwork tasks (as proxy for dev tasks)
4. JUMP TO row — three equal cards: ⚡ Brain dump | ✎ Journal | ◷ Planner

---

### Screen G — Brain dump (`/growth/braindump`)

**What it does:** Fast-capture anything with no friction.

**Layout:**
1. Header: `‹` back + "Brain dump" title
2. Subtitle: "Empty your head. No lane, no date — sort it later, or never."
3. Quick-add row: ⚡ icon + text input + "Add" button (inline, no submit needed beyond Enter/button)
4. Hint: "hit enter and it drops in below"
5. "DUMPED" section label + flat list of captured items
6. Each item: grip icon `≡` + text + "sort →" button
   - "sort →" opens picker: Work / Afterwork / Delete / Keep here
   - Choosing Work/Afterwork creates a Task from the item text and deletes the dump item

---

### Screen H — Journal (`/growth/journal`)

**What it does:** Daily check-in. One entry per calendar day.

**Layout:**
1. Header: `‹` back + date label + "CHECK-IN" / "How was today?" heading
2. Large rating display: `70/100` (56px bold)
3. Rating adjuster: `−5` button + progress track + `+5` button
4. Scale labels: `1` / `required` / `100`
5. "WHY 70? · quick note" text input (surface card)
6. "EVERYTHING BELOW IS OPTIONAL" label
7. Sleep row: BED input | WAKE input (side by side)
8. "What did you learn today?" multiline input
9. "Tomorrow I will…" multiline input
10. Footer: "Save & keep streak ✦" button (filled, `textPrimary` background)

**Data:** One entry per date. Saving overwrites the existing entry for that day.

---

### Screen I — Planner (`/growth/planner`)

**What it does:** Set weekly dev hours goal, assign backlog tasks to specific days.

**Layout:**
1. Header: `‹` back + "Planner" title
2. Weekly dev goal card (purple border):
   - "PERSONAL DEV THIS WEEK" label
   - Stepper: `−` | `5h` (large) | `＋` with sub-label "≈ 1h × 5 days"
   - Progress track
   - "Xh logged so far this week"
3. FILL A DAY section:
   - Section header + current day label with `▾` (day picker trigger)
   - Day chips: M T W T F S S (Mon=0 convention), today chip filled
   - Planned tasks for selected day (empty state shown)
4. PULL FROM "THINGS TO BE DONE" — list of afterwork backlog to drag into a day
5. Footer: "Lock in day ✦" filled button

**Note:** Day assignment and planner locking are not yet wired to data — UI only.

---

## 7. Persistent storage

The iOS app uses **SQLite via expo-sqlite**. For the web app, use whatever fits best:

- **Simplest:** `localStorage` / `IndexedDB` (e.g. via Dexie.js or idb) for fully offline, no-backend
- **With sync:** A lightweight backend (e.g. Supabase, PocketBase, or a simple REST API with a DB)

### Table/collection structure

```
tasks             — all tasks (Work + Afterwork + unassigned)
brain_dump_items  — unsorted captured thoughts
journal_entries   — one per date (UNIQUE constraint on date)
wishlist_items    — buy-list items with price tracking
dev_goals         — one per week_start
weekly_goals      — text goals + is_wish + achieved
weekly_reviews    — end-of-week reflection
```

Migrations: the app uses a version number (SQLite `PRAGMA user_version`) to run
migrations in order. On web, store a `schema_version` key alongside the data.

---

## 8. Business logic

### Day progress %

```
pct = (afterwork tasks where status='completed' AND dueDate=today).length
    / (all afterwork tasks where dueDate=today).length * 100
```

Only afterwork tasks count. Work tasks are deliberately excluded.

### Minutes remaining

```
minutesLeft = sum(durationMinutes) for pending afterwork tasks with dueDate=today
```

### Task filtering (Work screen)

- `all` → all work-lane tasks
- `today` → `dueDate === todayISO()`
- `backlog` → `isBacklog === true`

### Moving a backlog item to today

Set `isBacklog = false`, `dueDate = todayISO()`.

### Brain dump → Task conversion

Creates a Task with `title = item.text`, `lane = chosen lane`, `category = 'work' or 'private'`,
`isBacklog = false`, `dueDate = todayISO()`. Then deletes the brain dump item.

---

## 9. Features not yet fully built (stubs in current app)

These screens exist but are UI-only or placeholder — good candidates to actually wire up in the web version:

- **Calendar tab** — show tasks/events on a calendar grid by date
- **Workout tab** — track workouts (no model defined yet)
- **Buy tab** — wishlist with price tracking (model exists, UI is stub)
- **Stats tab** — charts/history (no implementation)
- **Weekly review ritual** — end-of-week reflection + goal setting for next week
- **Planner day assignment** — drag backlog tasks onto specific days
- **Dev goal tracking** — log minutes against the weekly dev hours target
- **Photo attachment** — attach photos to journal entries

---

## 10. Feel goals (important)

The app should feel satisfying to use. Things that make the difference:

- **Checkbox completion:** small scale-pop animation + color fill when ticking off a task
- **Day ring:** animates to new % on completion
- **Sound:** optional subtle tick/chime on task complete (user can mute)
- **Smooth transitions** between screens — slide or fade, not jarring jumps
- **Haptics (web equivalent):** `navigator.vibrate()` on mobile browsers for task completion
- The satisfaction should come from seeing all tasks checked, not from excess decoration

---

## 11. Suggested web stack

There's no constraint — pick what you're comfortable with. Some natural fits:

| Layer | Options |
|-------|---------|
| Framework | Next.js (App Router) or SvelteKit |
| Styling | Tailwind CSS (maps cleanly to the token system above) |
| State | Zustand or Jotai (lightweight, no boilerplate) |
| Storage | Dexie.js (IndexedDB wrapper) for offline-first |
| Animation | Framer Motion (React) or CSS transitions |

The design tokens in section 4 map directly to Tailwind custom colors/spacing if you
extend the config.
