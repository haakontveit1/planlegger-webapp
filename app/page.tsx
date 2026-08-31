"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { todayISO, formatDuration } from "@/lib/utils";
import Checkbox from "@/components/Checkbox";
import DateNav from "@/components/DateNav";
import { SortableList } from "@/components/SortableList";
import { Task } from "@/lib/db";

const DURATION_QUICK = [15, 30, 60, 90, 120, 180];

// ── Inline add-task form ──────────────────────────────────────────────────────
function InlineAddForm({ targetDate, onAdded }: { targetDate: string; onAdded?: () => void }) {
  const addTask = useStore((s) => s.addTask);
  const addRoutine = useStore((s) => s.addRoutine);
  const routines = useStore((s) => s.routines);
  const projects = useStore((s) => s.projects);

  const [title, setTitle] = useState("");
  const [isBacklog, setIsBacklog] = useState(false);
  const [durationStr, setDurationStr] = useState("30");
  const [hasDuration, setHasDuration] = useState(true);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const suggestions = title.trim().length > 0
    ? routines.filter((r) => r.title.toLowerCase().includes(title.toLowerCase()))
    : routines.slice(0, 6);

  function applySuggestion(r: typeof routines[0]) {
    setTitle(r.title);
    if (r.defaultDurationMinutes) { setHasDuration(true); setDurationStr(String(r.defaultDurationMinutes)); }
    if (r.projectId) setProjectId(r.projectId);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  const durationMinutes = hasDuration ? Math.max(1, parseInt(durationStr) || 1) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask({
      title: trimmed,
      notes: null,
      status: "pending",
      category: "private",
      lane: "afterwork",
      customer: null,
      durationMinutes,
      isBacklog,
      projectId: projectId || null,
      dueDate: isBacklog ? null : targetDate,
      dueTime: null,
      completedAt: null,
    });
    if (isRecurring && !routines.find((r) => r.title.toLowerCase() === trimmed.toLowerCase())) {
      addRoutine({ title: trimmed, projectId: projectId || null, defaultDurationMinutes: durationMinutes, description: null });
    }
    setTitle("");
    setIsBacklog(false);
    setIsRecurring(false);
    inputRef.current?.focus();
    onAdded?.();
  }

  const projectsByCategory = projects.reduce<Record<string, typeof projects>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const isToday = targetDate === todayISO();
  const dateLabel = isToday
    ? "Today"
    : new Date(targetDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Title with autocomplete */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
          placeholder="What needs doing?"
          className="input-base text-sm"
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surfaceElevated border border-border rounded-xl overflow-hidden shadow-2xl z-50">
            {suggestions.map((r) => (
              <button key={r.id} type="button" onMouseDown={() => applySuggestion(r)}
                className="w-full px-3 py-2.5 text-left hover:bg-white/5 flex items-center gap-2 transition-colors">
                <span className="text-accent text-xs shrink-0">⟳</span>
                <span className="flex-1 text-textPrimary text-sm">{r.title}</span>
                {r.defaultDurationMinutes && (
                  <span className="text-textMuted text-xs shrink-0">{formatDuration(r.defaultDurationMinutes)}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Today / Backlog */}
      <div className="grid grid-cols-2 gap-2">
        {[false, true].map((backlog) => (
          <button key={String(backlog)} type="button" onClick={() => setIsBacklog(backlog)}
            className={`py-2 rounded-lg text-xs font-semibold transition-all border-2 ${
              isBacklog === backlog
                ? "bg-accent border-accent text-white"
                : "border-border text-textSecondary hover:border-textSecondary"
            }`}>
            {backlog ? "Backlog" : dateLabel}
          </button>
        ))}
      </div>

      {/* Duration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-textMuted">Duration</span>
          <button type="button" onClick={() => setHasDuration((h) => !h)}
            className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
              hasDuration ? "bg-accent/20 text-accent" : "text-textMuted border border-border"
            }`}>
            {hasDuration ? "set" : "none"}
          </button>
        </div>
        {hasDuration && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={durationStr}
                onChange={(e) => setDurationStr(e.target.value)}
                className="input-base text-sm text-center"
                style={{ padding: "8px 10px" }}
              />
              <span className="text-sm text-textMuted shrink-0">min</span>
            </div>
            <div className="flex gap-1 flex-wrap">
              {DURATION_QUICK.map((p) => (
                <button key={p} type="button" onClick={() => setDurationStr(String(p))}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    durationStr === String(p) ? "bg-accent/20 text-accent" : "text-textMuted hover:text-textSecondary"
                  }`}>
                  {p < 60 ? `${p}m` : `${p / 60}h`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Project */}
      {projects.length > 0 && (
        <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)} className="input-base text-sm">
          <option value="">No project</option>
          {Object.entries(projectsByCategory).map(([cat, projs]) => (
            <optgroup key={cat} label={cat}>
              {projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </optgroup>
          ))}
        </select>
      )}

      {/* Recurring + Submit */}
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setIsRecurring((v) => !v)}
          className={`text-xs px-2.5 py-1.5 rounded-full transition-colors shrink-0 ${
            isRecurring ? "bg-accent/20 text-accent" : "text-textMuted border border-border hover:text-textSecondary"
          }`}>
          ⟳
        </button>
        <button type="submit" disabled={!title.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-success hover:bg-teal-400 text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          Add to {isBacklog ? "Backlog" : dateLabel}
        </button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const selectedDate = useStore((s) => s.selectedDate);
  const toggleTask = useStore((s) => s.toggleTask);
  const moveToBacklog = useStore((s) => s.moveToBacklog);
  const moveToToday = useStore((s) => s.moveToToday);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const addBrainDump = useStore((s) => s.addBrainDump);
  const deleteTask = useStore((s) => s.deleteTask);

  const updateTask = useStore((s) => s.updateTask);
  const [localOrder, setLocalOrder] = useState<Task[] | null>(null);
  const [captureText, setCaptureText] = useState("");
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDur, setEditDur] = useState("");

  const today = todayISO();
  const isToday = selectedDate === today;

  const rawTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.lane === "afterwork" && !t.isBacklog && t.dueDate === selectedDate)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks, selectedDate]
  );

  const taskKey = rawTasks.map((t) => t.id).join(",");
  useMemo(() => { setLocalOrder(null); }, [taskKey, selectedDate]);

  const displayTasks = localOrder ?? rawTasks;

  const backlogTasks = useMemo(
    () => tasks.filter((t) => t.lane === "afterwork" && t.isBacklog).sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks]
  );

  const done = rawTasks.filter((t) => t.status === "completed").length;
  const total = rawTasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const minutesLeft = rawTasks.filter((t) => t.status === "pending").reduce((s, t) => s + (t.durationMinutes ?? 0), 0);

  function getProjectColor(projectId: string | null) {
    return projectId ? projects.find((p) => p.id === projectId)?.color ?? null : null;
  }

  function handleReorder(newItems: Task[]) {
    setLocalOrder(newItems);
    reorderTasks(newItems.map((t) => t.id));
  }

  function handleToggle(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (task?.status === "pending") {
      setCompletingIds((prev) => new Set(Array.from(prev).concat(taskId)));
      setTimeout(() => {
        setCompletingIds((prev) => { const n = new Set(prev); n.delete(taskId); return n; });
      }, 700);
    }
    toggleTask(taskId);
  }

  function handleMoveToDate(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    moveToToday(taskId, task.durationMinutes ?? undefined, selectedDate);
  }

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault();
    if (!captureText.trim()) return;
    await addBrainDump(captureText.trim());
    setCaptureText("");
  }

  return (
    <div className="flex flex-col md:h-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-4 md:pt-8 pb-4 shrink-0 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-textPrimary">Planner</h1>
      </div>

      <div className="md:flex-1 md:min-h-0 max-w-6xl mx-auto w-full px-4 md:px-8 pb-6 grid grid-cols-1 md:grid-cols-[1fr_320px] gap-8">

        {/* ── Left: task list + brain dump ── */}
        <div className="flex flex-col md:min-h-0">
          {/* DateNav + progress (fixed at top of left column) */}
          <div className="shrink-0">
            <DateNav />
            {total > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 progress-track h-1.5">
                  <div className="progress-fill" style={{ width: `${pct}%`, background: "#3DDBD2" }} />
                </div>
                <span className="text-sm text-textMuted shrink-0">{done}/{total}</span>
              </div>
            )}
          </div>

          {/* Scrollable task list */}
          <div className="md:flex-1 md:overflow-y-auto md:min-h-0 pr-1">
            {displayTasks.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-textMuted">
                  {isToday ? "Nothing here yet" : "No tasks for this day"}
                </p>
              </div>
            ) : (
              <SortableList
                items={displayTasks}
                onReorder={handleReorder}
                renderItem={(task) => {
                  if (editingId === task.id) {
                    return (
                      <form
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!editTitle.trim()) return;
                          await updateTask(task.id, {
                            title: editTitle.trim(),
                            durationMinutes: editDur !== "" ? Number(editDur) : null,
                          });
                          setEditingId(null);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surfaceElevated border border-accent/30"
                      >
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="flex-1 min-w-0 bg-transparent text-sm text-textPrimary focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            value={editDur}
                            onChange={(e) => setEditDur(e.target.value)}
                            placeholder="–"
                            className="w-12 bg-background border border-border rounded px-2 py-1 text-xs text-textPrimary focus:outline-none focus:border-accent text-center"
                            min={1}
                          />
                          <span className="text-xs text-textMuted">m</span>
                        </div>
                        <button type="submit" className="text-accent text-sm px-2 py-1 rounded hover:bg-accent/10 transition-colors">✓</button>
                        <button type="button" onClick={() => setEditingId(null)} className="text-textMuted text-sm px-2 py-1 rounded hover:bg-white/5 transition-colors">✕</button>
                      </form>
                    );
                  }
                  return (
                    <div className={`task-row flex items-center gap-3 px-3 py-3 rounded-xl group${completingIds.has(task.id) ? " task-completing" : ""}`}>
                      <Checkbox checked={task.status === "completed"} onChange={() => handleToggle(task.id)} size={18} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getProjectColor(task.projectId) && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: getProjectColor(task.projectId)! }} />
                          )}
                          <span className={`text-base ${task.status === "completed" ? "line-through text-textMuted" : "text-textPrimary"}`}>
                            {task.title}
                          </span>
                        </div>
                        {task.notes && <p className="text-xs text-textMuted mt-0.5 truncate pl-4">{task.notes}</p>}
                      </div>
                      {task.durationMinutes != null && (
                        <span className="text-sm text-textMuted shrink-0">{formatDuration(task.durationMinutes)}</span>
                      )}
                      <button
                        onClick={() => { setEditingId(task.id); setEditTitle(task.title); setEditDur(task.durationMinutes != null ? String(task.durationMinutes) : ""); }}
                        className="text-textMuted hover:text-textSecondary transition-colors opacity-0 group-hover:opacity-100 text-sm px-1 shrink-0"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button onClick={() => moveToBacklog(task.id)}
                        className="text-xs text-textMuted hover:text-textSecondary transition-colors px-2 py-1 rounded hover:bg-white/5 shrink-0">
                        ← backlog
                      </button>
                      <button onClick={() => deleteTask(task.id)}
                        className="text-textMuted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm px-1 shrink-0">
                        ✕
                      </button>
                    </div>
                  );
                }}
              />
            )}
          </div>

          {/* Brain dump — pinned at bottom of left column */}
          <div className="shrink-0 pt-4 border-t border-border/40 mt-2">
            {minutesLeft > 0 && (
              <p className="text-xs text-textMuted mb-3">
                <span className="text-textPrimary font-semibold">{formatDuration(minutesLeft)}</span> remaining
              </p>
            )}
            <form onSubmit={handleCapture} className="flex gap-2">
              <input
                type="text"
                value={captureText}
                onChange={(e) => setCaptureText(e.target.value)}
                placeholder="Quick thought? Capture it here..."
                className="input-base flex-1 text-sm"
              />
              <button
                type="submit"
                disabled={!captureText.trim()}
                className="px-4 py-2.5 rounded-xl bg-surfaceElevated border border-border text-textSecondary hover:text-textPrimary disabled:opacity-40 transition-colors text-sm font-medium shrink-0"
              >
                ✎
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: add form + backlog ── */}
        <div className="md:overflow-y-auto space-y-6 pb-4">
          {/* Add form */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="section-label mb-4">New task</h2>
            <InlineAddForm targetDate={selectedDate} />
          </div>

          {/* Backlog */}
          <div className="bg-surface rounded-xl border border-border p-5">
            <h2 className="section-label mb-4">
              Backlog {backlogTasks.length > 0 && <span className="text-textMuted">({backlogTasks.length})</span>}
            </h2>
            {backlogTasks.length === 0 ? (
              <p className="text-sm text-textMuted py-4 text-center">Backlog is empty</p>
            ) : (
              <div className="space-y-1">
                {backlogTasks.map((task) => (
                  <div key={task.id} className="task-row flex items-center gap-2 px-2 py-2.5 rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-textSecondary">{task.title}</span>
                      {task.notes && <p className="text-xs text-textMuted mt-0.5 truncate">{task.notes}</p>}
                    </div>
                    {task.durationMinutes != null && (
                      <span className="text-xs text-textMuted shrink-0">{formatDuration(task.durationMinutes)}</span>
                    )}
                    <button onClick={() => handleMoveToDate(task.id)}
                      className="text-xs text-accent hover:text-accentLight font-medium transition-colors px-2 py-1 rounded hover:bg-accent/10 shrink-0">
                      → {isToday ? "today" : "this day"}
                    </button>
                    <button onClick={() => deleteTask(task.id)}
                      className="text-textMuted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm px-1 shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
