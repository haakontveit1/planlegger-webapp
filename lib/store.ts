"use client";
import { create } from "zustand";
import { db, Task, BrainDumpItem, JournalEntry, DevGoal, Project, Routine, RoutineSession } from "./db";
import { todayISO, weekStartISO, now, newId } from "./utils";

interface AppState {
  tasks: Task[];
  projects: Project[];
  routines: Routine[];
  routineSessions: RoutineSession[];
  brainDumpItems: BrainDumpItem[];
  journalEntry: JournalEntry | null;
  devGoal: DevGoal | null;
  soundEnabled: boolean;
  selectedDate: string;

  setSelectedDate: (date: string) => void;
  loadAll: () => Promise<void>;

  // Tasks
  addTask: (t: Omit<Task, "id" | "createdAt" | "updatedAt" | "sortOrder">) => Promise<Task>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveToToday: (id: string, durationMinutes?: number) => Promise<void>;
  moveToBacklog: (id: string) => Promise<void>;
  updateTaskDuration: (id: string, durationMinutes: number | null) => Promise<void>;
  reorderTasks: (orderedIds: string[]) => Promise<void>;

  // Projects
  addProject: (p: Omit<Project, "id" | "createdAt" | "updatedAt">) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // Routines
  addRoutine: (r: Omit<Routine, "id" | "createdAt" | "updatedAt">) => Promise<Routine>;
  deleteRoutine: (id: string) => Promise<void>;
  scheduleRoutine: (routineId: string, durationMinutes: number) => Promise<void>;
  toggleRoutineSession: (sessionId: string) => Promise<void>;
  deleteRoutineSession: (sessionId: string) => Promise<void>;

  // Brain dump
  addBrainDump: (text: string, notes?: string) => Promise<void>;
  updateBrainDumpNotes: (id: string, notes: string) => Promise<void>;
  sortBrainDump: (id: string, lane: "work" | "afterwork" | "delete") => Promise<void>;
  deleteBrainDump: (id: string) => Promise<void>;

  // Journal
  saveJournal: (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  loadJournal: (date: string) => Promise<void>;

  // Dev goal
  setDevGoalHours: (hours: number) => Promise<void>;

  toggleSound: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  tasks: [],
  projects: [],
  routines: [],
  routineSessions: [],
  brainDumpItems: [],
  journalEntry: null,
  devGoal: null,
  soundEnabled: true,
  selectedDate: todayISO(),

  setSelectedDate: (date) => set({ selectedDate: date }),

  loadAll: async () => {
    const today = todayISO();
    const weekStart = weekStartISO();
    const [tasks, projects, routines, routineSessions, brainDumpItems] = await Promise.all([
      db.tasks.toArray(),
      db.projects.orderBy("createdAt").toArray(),
      db.routines.orderBy("createdAt").toArray(),
      db.routineSessions.where("date").equals(today).toArray(),
      db.brainDumpItems.orderBy("createdAt").toArray(),
    ]);
    const journalEntry = await db.journalEntries.where("date").equals(today).first() ?? null;
    const devGoal = await db.devGoals.where("weekStart").equals(weekStart).first() ?? null;
    set({ tasks, projects, routines, routineSessions, brainDumpItems, journalEntry, devGoal });
  },

  addTask: async (partial) => {
    const sortOrder = Date.now();
    const task: Task = { ...partial, sortOrder, id: newId(), createdAt: now(), updatedAt: now() };
    await db.tasks.add(task);
    set((s) => ({ tasks: [...s.tasks, task] }));
    return task;
  },

  toggleTask: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const next = task.status === "completed" ? "pending" : "completed";
    const completedAt = next === "completed" ? now() : null;
    await db.tasks.update(id, { status: next, completedAt, updatedAt: now() });
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, status: next, completedAt } : t) }));
  },

  deleteTask: async (id) => {
    await db.tasks.delete(id);
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
  },

  moveToToday: async (id, durationMinutes) => {
    const today = todayISO();
    const updates: Partial<Task> = { isBacklog: false, dueDate: today, updatedAt: now() };
    if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;
    await db.tasks.update(id, updates);
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, ...updates } : t) }));
  },

  moveToBacklog: async (id) => {
    await db.tasks.update(id, { isBacklog: true, dueDate: null, updatedAt: now() });
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, isBacklog: true, dueDate: null } : t) }));
  },

  updateTaskDuration: async (id, durationMinutes) => {
    await db.tasks.update(id, { durationMinutes, updatedAt: now() });
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, durationMinutes } : t) }));
  },

  reorderTasks: async (orderedIds) => {
    const updates = orderedIds.map((id, i) => ({ id, sortOrder: i * 1000 }));
    await Promise.all(updates.map(({ id, sortOrder }) => db.tasks.update(id, { sortOrder })));
    set((s) => {
      const orderMap = new Map(updates.map(({ id, sortOrder }) => [id, sortOrder]));
      return { tasks: s.tasks.map((t) => orderMap.has(t.id) ? { ...t, sortOrder: orderMap.get(t.id)! } : t) };
    });
  },

  addProject: async (partial) => {
    const project: Project = { ...partial, id: newId(), createdAt: now(), updatedAt: now() };
    await db.projects.add(project);
    set((s) => ({ projects: [...s.projects, project] }));
    return project;
  },

  deleteProject: async (id) => {
    await db.projects.delete(id);
    // Unlink tasks
    const affected = get().tasks.filter((t) => t.projectId === id);
    await Promise.all(affected.map((t) => db.tasks.update(t.id, { projectId: null })));
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      tasks: s.tasks.map((t) => t.projectId === id ? { ...t, projectId: null } : t),
    }));
  },

  addRoutine: async (partial) => {
    const routine: Routine = { ...partial, id: newId(), createdAt: now(), updatedAt: now() };
    await db.routines.add(routine);
    set((s) => ({ routines: [...s.routines, routine] }));
    return routine;
  },

  deleteRoutine: async (id) => {
    await db.routines.delete(id);
    set((s) => ({ routines: s.routines.filter((r) => r.id !== id) }));
  },

  scheduleRoutine: async (routineId, durationMinutes) => {
    const today = todayISO();
    const session: RoutineSession = {
      id: newId(),
      routineId,
      durationMinutes,
      date: today,
      status: "pending",
      completedAt: null,
      createdAt: now(),
    };
    await db.routineSessions.add(session);
    set((s) => ({ routineSessions: [...s.routineSessions, session] }));
  },

  toggleRoutineSession: async (sessionId) => {
    const session = get().routineSessions.find((s) => s.id === sessionId);
    if (!session) return;
    const next = session.status === "completed" ? "pending" : "completed";
    const completedAt = next === "completed" ? now() : null;
    await db.routineSessions.update(sessionId, { status: next, completedAt });
    set((s) => ({
      routineSessions: s.routineSessions.map((rs) =>
        rs.id === sessionId ? { ...rs, status: next, completedAt } : rs
      ),
    }));
  },

  deleteRoutineSession: async (sessionId) => {
    await db.routineSessions.delete(sessionId);
    set((s) => ({ routineSessions: s.routineSessions.filter((rs) => rs.id !== sessionId) }));
  },

  addBrainDump: async (text, notes) => {
    const item: BrainDumpItem = { id: newId(), text, notes: notes ?? null, createdAt: now() };
    await db.brainDumpItems.add(item);
    set((s) => ({ brainDumpItems: [...s.brainDumpItems, item] }));
  },

  updateBrainDumpNotes: async (id, notes) => {
    await db.brainDumpItems.update(id, { notes });
    set((s) => ({
      brainDumpItems: s.brainDumpItems.map((b) => b.id === id ? { ...b, notes } : b),
    }));
  },

  sortBrainDump: async (id, lane) => {
    const item = get().brainDumpItems.find((b) => b.id === id);
    if (!item) return;
    await db.brainDumpItems.delete(id);
    set((s) => ({ brainDumpItems: s.brainDumpItems.filter((b) => b.id !== id) }));
    if (lane === "delete") return;
    await get().addTask({
      title: item.text,
      notes: null,
      status: "pending",
      category: lane === "work" ? "work" : "private",
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
    await db.brainDumpItems.delete(id);
    set((s) => ({ brainDumpItems: s.brainDumpItems.filter((b) => b.id !== id) }));
  },

  saveJournal: async (partial) => {
    const existing = await db.journalEntries.where("date").equals(partial.date).first();
    if (existing) {
      const updated = { ...existing, ...partial, updatedAt: now() };
      await db.journalEntries.put(updated);
      set({ journalEntry: updated });
    } else {
      const entry: JournalEntry = { ...partial, id: newId(), createdAt: now(), updatedAt: now() };
      await db.journalEntries.add(entry);
      set({ journalEntry: entry });
    }
  },

  loadJournal: async (date) => {
    const entry = await db.journalEntries.where("date").equals(date).first() ?? null;
    set({ journalEntry: entry });
  },

  setDevGoalHours: async (hours) => {
    const weekStart = weekStartISO();
    const existing = await db.devGoals.where("weekStart").equals(weekStart).first();
    if (existing) {
      await db.devGoals.update(existing.id, { targetHours: hours });
      set({ devGoal: { ...existing, targetHours: hours } });
    } else {
      const goal: DevGoal = { id: newId(), weekStart, targetHours: hours, loggedMinutes: 0 };
      await db.devGoals.add(goal);
      set({ devGoal: goal });
    }
  },

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
}));
