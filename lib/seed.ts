import { db } from "./db";
import { newId, now, todayISO, weekStartISO } from "./utils";

export async function seedDatabase() {
  const today = todayISO();
  const weekStart = weekStartISO();

  // ── Projects ──────────────────────────────────────────────────────
  const webappId = newId();
  const sideProjectsId = newId();
  const marathonId = newId();

  await db.projects.bulkAdd([
    { id: webappId,       name: "Web app Planner",   category: "Coding",  color: "#54A0FF", createdAt: now(), updatedAt: now() },
    { id: sideProjectsId, name: "Side projects",      category: "Coding",  color: "#7B72FF", createdAt: now(), updatedAt: now() },
    { id: marathonId,     name: "Marathon training",  category: "Health",  color: "#3DDBD2", createdAt: now(), updatedAt: now() },
  ]);

  // ── Routines ──────────────────────────────────────────────────────
  await db.routines.bulkAdd([
    { id: newId(), title: "Coding session",  projectId: webappId,  defaultDurationMinutes: 60, description: "Work on the web app or any side project", createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Read",            projectId: null,       defaultDurationMinutes: 30, description: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Go for a run",    projectId: marathonId, defaultDurationMinutes: 45, description: "Easy run — keep HR below 150", createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Journaling",      projectId: null,       defaultDurationMinutes: 15, description: null, createdAt: now(), updatedAt: now() },
  ]);

  // ── Personal tasks ────────────────────────────────────────────────
  const t = Date.now();
  await db.tasks.bulkAdd([
    // Today
    { id: newId(), title: "Buy groceries",                notes: "Milk, eggs, bread, coffee beans", status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: 30,   isBacklog: false, sortOrder: t + 0,   projectId: null,         dueDate: today, dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Call dentist for appointment", notes: null,                               status: "completed", category: "private", lane: "afterwork", customer: null, durationMinutes: 10,   isBacklog: false, sortOrder: t + 1000, projectId: null,        dueDate: today, dueTime: null, completedAt: now(), createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Review monthly budget",        notes: null,                               status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: 20,   isBacklog: false, sortOrder: t + 2000, projectId: null,        dueDate: today, dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Work on planner app",          notes: "Add the project detail page",      status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: 60,   isBacklog: false, sortOrder: t + 3000, projectId: webappId,    dueDate: today, dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    // Backlog
    { id: newId(), title: "Read TypeScript generics article", notes: "Bookmarked on phone",          status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: null, isBacklog: true,  sortOrder: t + 4000, projectId: null,        dueDate: null,  dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Clean out email inbox",        notes: null,                               status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: 30,   isBacklog: true,  sortOrder: t + 5000, projectId: null,        dueDate: null,  dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Plan weekend hiking trip",     notes: "Check weather + book parking",     status: "pending",   category: "plans",   lane: "afterwork", customer: null, durationMinutes: null, isBacklog: true,  sortOrder: t + 6000, projectId: null,        dueDate: null,  dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Research new standing desk",   notes: null,                               status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: null, isBacklog: true,  sortOrder: t + 7000, projectId: null,        dueDate: null,  dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
    { id: newId(), title: "Add keyboard shortcuts",       notes: "Cmd+K quick-add, J/K navigation",  status: "pending",   category: "private", lane: "afterwork", customer: null, durationMinutes: 90,   isBacklog: true,  sortOrder: t + 8000, projectId: webappId,    dueDate: null,  dueTime: null, completedAt: null, createdAt: now(), updatedAt: now() },
  ]);

  // ── Brain dump ────────────────────────────────────────────────────
  await db.brainDumpItems.bulkAdd([
    { id: newId(), text: "Add keyboard shortcuts to the planner", notes: "Cmd+K for quick-add, J/K for task navigation, Enter to complete", createdAt: now() },
    { id: newId(), text: "Look into offline-first sync strategy", notes: "Dexie already does this — just document the approach", createdAt: now() },
    { id: newId(), text: "Set up a better morning routine",       notes: null, createdAt: now() },
  ]);

  // ── Dev goal ──────────────────────────────────────────────────────
  await db.devGoals.add({ id: newId(), weekStart, targetHours: 5, loggedMinutes: 120 });
}
