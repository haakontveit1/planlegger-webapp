"use client";
import { create } from "zustand";
import { Task, BrainDumpItem, JournalEntry, DevGoal, Project, Routine, RoutineSession, BuyItem, ProjectNote } from "./db";
import { todayISO, weekStartISO, now, newId } from "./utils";

interface AppState {
  tasks: Task[];
  projects: Project[];
  routines: Routine[];
  routineSessions: RoutineSession[];
  brainDumpItems: BrainDumpItem[];
  journalEntry: JournalEntry | null;
  devGoal: DevGoal | null;
  buyItems: BuyItem[];
  projectNotes: ProjectNote[];
  soundEnabled: boolean;
  isLoaded: boolean;
  selectedDate: string;

  setSelectedDate: (date: string) => void;
  loadAll: () => Promise<void>;

  addBuyItem: (item: BuyItem) => void;
  deleteBuyItem: (id: string) => Promise<void>;
  patchBuyItem: (id: string, updated: BuyItem) => Promise<void>;

  addProjectNote: (note: ProjectNote) => Promise<void>;
  deleteProjectNote: (id: string) => Promise<void>;

  addTask: (t: Omit<Task, "id" | "createdAt" | "updatedAt" | "sortOrder">) => Promise<Task>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveToToday: (id: string, durationMinutes?: number, targetDate?: string) => Promise<void>;
  moveToBacklog: (id: string) => Promise<void>;
  updateTaskDuration: (id: string, durationMinutes: number | null) => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;
  updateTask: (id: string, updates: Partial<Pick<Task, "title" | "durationMinutes" | "notes">>) => Promise<void>;

  addProject: (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  addRoutine: (r: Omit<Routine, "id" | "createdAt" | "updatedAt">) => Promise<Routine>;
  deleteRoutine: (id: string) => Promise<void>;
  scheduleRoutine: (routineId: string, durationMinutes: number) => Promise<void>;
  toggleRoutineSession: (sessionId: string) => Promise<void>;
  deleteRoutineSession: (sessionId: string) => Promise<void>;

  addBrainDump: (text: string, notes?: string) => Promise<void>;
  updateBrainDumpNotes: (id: string, notes: string) => Promise<void>;
  sortBrainDump: (id: string, lane: "work" | "afterwork" | "delete") => Promise<void>;
  deleteBrainDump: (id: string) => Promise<void>;

  saveJournal: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  loadJournal: (date: string) => Promise<void>;

  setDevGoalHours: (hours: number) => Promise<void>;

  toggleSound: () => void;
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res;
}

function jsonPost(path: string, body: unknown) {
  return apiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function jsonPatch(path: string, body: unknown) {
  return apiFetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function jsonPut(path: string, body: unknown) {
  return apiFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  projects: [],
  routines: [],
  routineSessions: [],
  brainDumpItems: [],
  buyItems: [],
  projectNotes: [],
  journalEntry: null,
  devGoal: null,
  soundEnabled: true,
  isLoaded: false,
  selectedDate: todayISO(),

  setSelectedDate: (date) => set({ selectedDate: date }),

  loadAll: async () => {
    const today = todayISO();
    const weekStart = weekStartISO();
    const safeJson = (p: Promise<Response>) => p.then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const safeArr = (p: Promise<Response>) => p.then((r) => (r.ok ? r.json() : [])).catch(() => []);
    const [rawTasks, projects, routines, routineSessions, brainDumpItems, journalEntry, devGoal, buyItems, projectNotes] =
      await Promise.all([
        safeArr(fetch("/api/tasks")),
        safeArr(fetch("/api/projects")),
        safeArr(fetch("/api/routines")),
        safeArr(fetch(`/api/routine-sessions?date=${today}`)),
        safeArr(fetch("/api/brain-dump")),
        safeJson(fetch(`/api/journal/${today}`)),
        safeJson(fetch(`/api/dev-goals/${weekStart}`)),
        safeArr(fetch("/api/buy-items")),
        safeArr(fetch("/api/project-notes")),
      ]);

    // Auto-move overdue non-backlog incomplete tasks to backlog
    const overdue = (rawTasks as Task[]).filter(
      (t) => t.dueDate && t.dueDate < today && !t.isBacklog && t.status !== "completed"
    );
    const tasks: Task[] = overdue.length > 0
      ? (rawTasks as Task[]).map((t) =>
          overdue.find((o) => o.id === t.id) ? { ...t, isBacklog: true, dueDate: null } : t
        )
      : rawTasks;
    if (overdue.length > 0) {
      overdue.forEach((t) =>
        jsonPatch(`/api/tasks/${t.id}`, { ...t, isBacklog: true, dueDate: null }).catch(console.error)
      );
    }

    set({ tasks, projects, routines, routineSessions, brainDumpItems,
          journalEntry: journalEntry ?? null, devGoal: devGoal ?? null, buyItems, projectNotes, isLoaded: true });
  },

  addTask: async (partial) => {
    const task: Task = { ...partial, sortOrder: Date.now(), id: newId(), createdAt: now(), updatedAt: now() };
    set((s) => ({ tasks: [...s.tasks, task] }));
    jsonPost("/api/tasks", task).catch(console.error);
    return task;
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const status: Task["status"] = task.status === "completed" ? "pending" : "completed";
    const completedAt = status === "completed" ? now() : null;
    const updated = { ...task, status, completedAt, updatedAt: now() };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    await jsonPatch(`/api/tasks/${id}`, updated);
  },

  deleteTask: async (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
    await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
  },

  moveToToday: async (id, durationMinutes, targetDate) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, isBacklog: false, dueDate: targetDate ?? todayISO(), updatedAt: now(),
      ...(durationMinutes !== undefined ? { durationMinutes } : {}) };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    jsonPatch(`/api/tasks/${id}`, updated).catch(console.error);
  },

  moveToBacklog: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, isBacklog: true, dueDate: null, updatedAt: now() };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    await jsonPatch(`/api/tasks/${id}`, updated);
  },

  updateTaskDuration: async (id, durationMinutes) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, durationMinutes, updatedAt: now() };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    await jsonPatch(`/api/tasks/${id}`, updated);
  },

  updateTask: async (id, updates) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const updated = { ...task, ...updates, updatedAt: now() };
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? updated : t)) }));
    await jsonPatch(`/api/tasks/${id}`, updated);
  },

  reorderTasks: async (orderedIds) => {
    const orderMap = new Map(orderedIds.map((id, i) => [id, i * 1000]));
    set((s) => ({ tasks: s.tasks.map((t) => orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id)! } : t) }));
    await jsonPost("/api/tasks/reorder", { orderedIds });
  },

  addProject: async (partial) => {
    const project: Project = { ...partial, id: newId(), createdAt: now(), updatedAt: now() };
    await jsonPost("/api/projects", project);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  deleteProject: async (id) => {
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => (t.projectId === id ? { ...t, projectId: null } : t)),
    }));
    await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
  },

  addRoutine: async (partial) => {
    const routine: Routine = { ...partial, id: newId(), createdAt: now(), updatedAt: now() };
    await jsonPost("/api/routines", routine);
    set((s) => ({ routines: [...s.routines, routine] }));
    return routine;
  },

  deleteRoutine: async (id) => {
    set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
    await apiFetch(`/api/routines/${id}`, { method: "DELETE" });
  },

  scheduleRoutine: async (routineId, durationMinutes) => {
    const session: RoutineSession = {
      id: newId(), routineId, durationMinutes, date: todayISO(),
      status: "pending", completedAt: null, createdAt: now(),
    };
    await jsonPost("/api/routine-sessions", session);
    set((s) => ({ routineSessions: [...s.routineSessions, session] }));
  },

  toggleRoutineSession: async (sessionId) => {
    const session = get().routineSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const status = session.status === "completed" ? "pending" : "completed";
    const completedAt = status === "completed" ? now() : null;
    set((s) => ({
      routineSessions: s.routineSessions.map((rs) =>
        rs.id === sessionId ? { ...rs, status, completedAt } : rs
      ),
    }));
    await jsonPatch(`/api/routine-sessions/${sessionId}`, { status, completedAt });
  },

  deleteRoutineSession: async (sessionId) => {
    set((s) => ({ routineSessions: s.routineSessions.filter((rs) => rs.id !== sessionId) }));
    await apiFetch(`/api/routine-sessions/${sessionId}`, { method: "DELETE" });
  },

  addBrainDump: async (text, notes) => {
    const item: BrainDumpItem = { id: newId(), text, notes: notes ?? null, createdAt: now() };
    await jsonPost("/api/brain-dump", item);
    set((s) => ({ brainDumpItems: [...s.brainDumpItems, item] }));
  },

  updateBrainDumpNotes: async (id, notes) => {
    set((s) => ({ brainDumpItems: s.brainDumpItems.map((b) => (b.id === id ? { ...b, notes } : b)) }));
    await jsonPatch(`/api/brain-dump/${id}`, { notes });
  },

  sortBrainDump: async (id, lane) => {
    const item = get().brainDumpItems.find((b) => b.id === id);
    if (!item) return;
    set((s) => ({ brainDumpItems: s.brainDumpItems.filter((b) => b.id !== id) }));
    await apiFetch(`/api/brain-dump/${id}`, { method: "DELETE" });
    if (lane === "delete") return;
    await get().addTask({
      title: item.text,
      notes: null,
      status: "pending",
      category: "private",
      lane,
      customer: null,
      durationMinutes: null,
      isBacklog: false,
      projectId: null,
      dueDate: todayISO(),
      dueTime: null,
      completedAt: null,
    });
  },

  deleteBrainDump: async (id) => {
    set((s) => ({ brainDumpItems: s.brainDumpItems.filter((b) => b.id !== id) }));
    await apiFetch(`/api/brain-dump/${id}`, { method: "DELETE" });
  },

  saveJournal: async (partial) => {
    const existing = get().journalEntry;
    const entry: JournalEntry = existing
      ? { ...existing, ...partial, updatedAt: now() }
      : { ...partial, id: newId(), createdAt: now(), updatedAt: now() };
    await jsonPut(`/api/journal/${partial.date}`, entry);
    set({ journalEntry: entry });
  },

  loadJournal: async (date) => {
    const res = await fetch(`/api/journal/${date}`);
    const entry = res.ok ? await res.json() : null;
    set({ journalEntry: entry });
  },

  setDevGoalHours: async (hours) => {
    const weekStart = weekStartISO();
    const existing = get().devGoal;
    const goal: DevGoal = existing
      ? { ...existing, targetHours: hours }
      : { id: newId(), weekStart, targetHours: hours, loggedMinutes: 0 };
    await jsonPut(`/api/dev-goals/${weekStart}`, goal);
    set({ devGoal: goal });
  },

  addBuyItem: (item) => {
    set((s) => ({ buyItems: [...s.buyItems, item] }));
    jsonPost("/api/buy-items", item).catch(console.error);
  },

  deleteBuyItem: async (id) => {
    set((s) => ({ buyItems: s.buyItems.filter((i) => i.id !== id) }));
    await apiFetch(`/api/buy-items/${id}`, { method: "DELETE" });
  },

  patchBuyItem: async (id, updated) => {
    set((s) => ({ buyItems: s.buyItems.map((i) => (i.id === id ? updated : i)) }));
    await apiFetch(`/api/buy-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
  },

  addProjectNote: async (note) => {
    set((s) => ({ projectNotes: [...s.projectNotes, note] }));
    await jsonPost("/api/project-notes", note);
  },

  deleteProjectNote: async (id) => {
    set((s) => ({ projectNotes: s.projectNotes.filter((n) => n.id !== id) }));
    await apiFetch(`/api/project-notes/${id}`, { method: "DELETE" });
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
}));
