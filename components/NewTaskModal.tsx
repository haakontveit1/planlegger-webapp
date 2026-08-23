"use client";
import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { todayISO, formatDuration } from "@/lib/utils";

interface Props {
  defaultProjectId?: string;
  defaultBacklog?: boolean;
  onClose: () => void;
}

const PRESETS = [10, 15, 30, 60];

export default function NewTaskModal({ defaultProjectId, defaultBacklog, onClose }: Props) {
  const addTask = useStore((s) => s.addTask);
  const addRoutine = useStore((s) => s.addRoutine);
  const routines = useStore((s) => s.routines);
  const projects = useStore((s) => s.projects);

  const [title, setTitle] = useState("");
  const [isBacklog, setIsBacklog] = useState(defaultBacklog ?? false);
  const [notes, setNotes] = useState("");
  const [hasDuration, setHasDuration] = useState(true);
  const [duration, setDuration] = useState(30);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId ?? null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const suggestions = title.trim().length > 0
    ? routines.filter((r) => r.title.toLowerCase().includes(title.toLowerCase()))
    : routines;

  function applySuggestion(r: typeof routines[0]) {
    setTitle(r.title);
    if (r.defaultDurationMinutes) { setHasDuration(true); setDuration(r.defaultDurationMinutes); }
    if (r.projectId) setProjectId(r.projectId);
    setShowSuggestions(false);
    titleRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const trimmed = title.trim();
    await addTask({
      title: trimmed,
      notes: notes.trim() || null,
      status: "pending",
      category: "private",
      lane: "afterwork",
      customer: null,
      durationMinutes: hasDuration ? duration : null,
      isBacklog,
      projectId: projectId || null,
      dueDate: isBacklog ? null : todayISO(),
      dueTime: null,
      completedAt: null,
    });
    if (isRecurring && !routines.find((r) => r.title.toLowerCase() === trimmed.toLowerCase())) {
      await addRoutine({
        title: trimmed,
        projectId: projectId || null,
        defaultDurationMinutes: hasDuration ? duration : null,
        description: null,
      });
    }
    onClose();
  }

  const projectsByCategory = projects.reduce<Record<string, typeof projects>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surfaceElevated rounded-xl w-full max-w-lg mx-4 shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border sticky top-0 bg-surfaceElevated z-10">
          <h2 className="text-lg font-semibold text-textPrimary">Add task</h2>
          <button onClick={onClose} className="text-textMuted hover:text-textPrimary transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Title + autocomplete */}
          <div className="relative">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              placeholder="What needs doing?"
              className="input-base text-base"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surfaceElevated border border-border rounded-xl overflow-hidden shadow-2xl z-50">
                {suggestions.slice(0, 6).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={() => applySuggestion(r)}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 flex items-center gap-3 transition-colors"
                  >
                    <span className="text-accent text-sm shrink-0">⟳</span>
                    <span className="flex-1 text-textPrimary text-sm">{r.title}</span>
                    {r.defaultDurationMinutes && (
                      <span className="text-textMuted text-xs shrink-0">{formatDuration(r.defaultDurationMinutes)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recurring toggle */}
          <button
            type="button"
            onClick={() => setIsRecurring((v) => !v)}
            className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full transition-colors ${
              isRecurring ? "bg-accent/20 text-accent" : "text-textMuted hover:text-textSecondary"
            }`}
          >
            <span>⟳</span>
            {isRecurring ? "Recurring — will be saved as a template" : "Make recurring"}
          </button>

          {/* Today / Backlog */}
          <div className="grid grid-cols-2 gap-2">
            {[false, true].map((backlog) => (
              <button
                key={String(backlog)}
                type="button"
                onClick={() => setIsBacklog(backlog)}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all border-2 ${
                  isBacklog === backlog
                    ? "bg-accent border-accent text-white"
                    : "border-border text-textSecondary hover:border-textSecondary hover:text-textPrimary"
                }`}
              >
                {backlog ? "Backlog" : "Today"}
              </button>
            ))}
          </div>

          {/* Duration */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="section-label">Duration</span>
              <button
                type="button"
                onClick={() => setHasDuration((h) => !h)}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  hasDuration ? "bg-accent/20 text-accent" : "bg-surface text-textMuted border border-border"
                }`}
              >
                {hasDuration ? "Set" : "None"}
              </button>
            </div>
            {hasDuration && (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <button type="button" onClick={() => setDuration((d) => Math.max(5, d - 5))}
                    className="w-9 h-9 rounded-lg border border-border text-textSecondary hover:text-textPrimary flex items-center justify-center transition-colors">−</button>
                  <span className="text-xl font-bold text-textPrimary flex-1 text-center">{formatDuration(duration)}</span>
                  <button type="button" onClick={() => setDuration((d) => Math.min(480, d + 5))}
                    className="w-9 h-9 rounded-lg border border-border text-textSecondary hover:text-textPrimary flex items-center justify-center transition-colors">+</button>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {PRESETS.map((p) => (
                    <button key={p} type="button" onClick={() => setDuration(p)}
                      className={`chip ${duration === p ? "chip-active" : "chip-inactive"}`}>
                      {formatDuration(p)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div>
              <label className="section-label block mb-2">Project (optional)</label>
              <select value={projectId ?? ""} onChange={(e) => setProjectId(e.target.value || null)} className="input-base">
                <option value="">No project</option>
                {Object.entries(projectsByCategory).map(([cat, projs]) => (
                  <optgroup key={cat} label={cat}>
                    {projs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="input-base resize-none text-sm"
          />

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl text-base font-semibold bg-success hover:bg-teal-400 text-background transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add to {isBacklog ? "Backlog" : "Today"}
          </button>
        </form>
      </div>
    </div>
  );
}
