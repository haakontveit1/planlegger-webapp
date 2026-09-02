"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { todayISO, formatDuration } from "@/lib/utils";

function getLastResetTime() {
  const now = new Date();
  const reset = new Date(now);
  reset.setHours(5, 0, 0, 0);
  if (now < reset) reset.setDate(reset.getDate() - 1);
  return reset;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function scoreLabel(n: number) {
  if (n === 0) return "";
  if (n <= 20) return "Rough day";
  if (n <= 40) return "Below average";
  if (n <= 60) return "Decent";
  if (n <= 80) return "Good day";
  return "Great day";
}

export default function EndOfDayPage() {
  const tasks = useStore((s) => s.tasks);
  const journalEntry = useStore((s) => s.journalEntry);
  const saveJournal = useStore((s) => s.saveJournal);
  const addTask = useStore((s) => s.addTask);
  const moveToToday = useStore((s) => s.moveToToday);

  const today = todayISO();
  const tomorrow = tomorrowISO();

  const [score, setScore] = useState(0);
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [weightInput, setWeightInput] = useState("");
  const [loggedWeight, setLoggedWeight] = useState("");

  useEffect(() => {
    if (journalEntry?.date === today) {
      setScore(journalEntry.rating ?? 0);
      setReflection(journalEntry.ratingNote ?? "");
    }
  }, [journalEntry, today]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("weight_log");
      if (stored) {
        const { weight: w, savedAt } = JSON.parse(stored);
        if (new Date(savedAt) >= getLastResetTime()) setLoggedWeight(w);
        else localStorage.removeItem("weight_log");
      }
    } catch {}
  }, []);

  function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!weightInput.trim()) return;
    try {
      localStorage.setItem("weight_log", JSON.stringify({ weight: weightInput, savedAt: new Date().toISOString() }));
    } catch {}
    setLoggedWeight(weightInput);
    setWeightInput("");
  }

  async function handleSave() {
    await saveJournal({
      date: today,
      rating: score,
      ratingNote: reflection.trim() || null,
      bedTime: journalEntry?.bedTime ?? null,
      wakeTime: journalEntry?.wakeTime ?? null,
      learning: journalEntry?.learning ?? null,
      tomorrow: journalEntry?.tomorrow ?? null,
      photoUris: journalEntry?.photoUris ?? [],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleAddTomorrow(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle.trim(),
      notes: null,
      status: "pending",
      category: "private",
      lane: "afterwork",
      customer: null,
      durationMinutes: null,
      isBacklog: false,
      projectId: null,
      dueDate: tomorrow,
      dueTime: null,
      completedAt: null,
    });
    setNewTaskTitle("");
  }

  const backlogTasks = tasks.filter((t) => t.isBacklog && t.lane === "afterwork");
  const tomorrowTasks = tasks.filter((t) => t.dueDate === tomorrow && !t.isBacklog);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary">Tracking</h1>
        <p className="text-sm text-textMuted mt-1">{formatDate(today)}</p>
      </div>

      {/* Weight */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="section-label mb-4">Vekt</h2>
        <div className="flex items-center gap-6">
          <form onSubmit={handleLogWeight} className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              min={0}
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="0.0"
              className="input-base text-lg font-semibold text-center w-28"
            />
            <span className="text-sm text-textMuted">kg</span>
            <button
              type="submit"
              disabled={!weightInput.trim()}
              className="px-4 py-2 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-sm font-semibold disabled:opacity-40"
            >
              Logg
            </button>
          </form>
          <div className="w-px bg-border self-stretch" />
          <div>
            <p className="text-xs text-textMuted mb-1">Dagens vekt</p>
            {loggedWeight
              ? <p className="text-2xl font-bold text-textPrimary">{loggedWeight} <span className="text-sm font-normal text-textMuted">kg</span></p>
              : <p className="text-textMuted text-sm">Ikke registrert i dag</p>
            }
          </div>
        </div>
      </section>

      {/* Day score */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <h2 className="section-label mb-5">How did today go?</h2>
        <div className="mb-2">
          <input
            type="range"
            min={0}
            max={100}
            value={score}
            onChange={(e) => { setScore(Number(e.target.value)); setSaved(false); }}
            className="range-slider w-full"
          />
          <div className="flex justify-between text-xs text-textMuted mt-1">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="text-4xl font-bold text-accent">{score}</span>
          {score > 0 && (
            <span className="text-sm text-accent font-medium">{scoreLabel(score)}</span>
          )}
        </div>
        <textarea
          value={reflection}
          onChange={(e) => { setReflection(e.target.value); setSaved(false); }}
          placeholder="Anything that stood out today? (optional)"
          rows={3}
          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent transition-colors resize-none"
        />
        <button
          onClick={handleSave}
          disabled={score === 0}
          className={`mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 ${
            saved
              ? "bg-success/20 text-success"
              : "bg-accent/15 text-accent hover:bg-accent/25"
          }`}
        >
          {saved ? "✓ Saved" : "Save"}
        </button>
      </section>

      {/* Plan ahead */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="section-label">Plan for tomorrow</h2>
          <p className="text-xs text-textMuted">{formatDate(tomorrow)}</p>
        </div>

        {/* Already scheduled for tomorrow */}
        {tomorrowTasks.length > 0 && (
          <div className="space-y-1 mb-4">
            {tomorrowTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                <span className="flex-1 text-sm text-textPrimary">{t.title}</span>
                {t.durationMinutes != null && (
                  <span className="text-xs text-textMuted">{formatDuration(t.durationMinutes)}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new task for tomorrow */}
        <form onSubmit={handleAddTomorrow} className="flex gap-2 mb-6">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a task for tomorrow..."
            className="input-base flex-1 min-w-0 text-sm"
          />
          <button
            type="submit"
            disabled={!newTaskTitle.trim()}
            className="px-4 py-2 rounded-xl bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-sm font-semibold disabled:opacity-40 shrink-0"
          >
            Add
          </button>
        </form>

        {/* Move from backlog */}
        {backlogTasks.length > 0 && (
          <>
            <h3 className="section-label mb-3">From backlog</h3>
            <div className="space-y-1">
              {backlogTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 bg-surface rounded-xl border border-border">
                  <span className="flex-1 text-sm text-textSecondary min-w-0 truncate">{t.title}</span>
                  {t.durationMinutes != null && (
                    <span className="text-xs text-textMuted shrink-0">{formatDuration(t.durationMinutes)}</span>
                  )}
                  <button
                    onClick={() => moveToToday(t.id, t.durationMinutes ?? undefined, tomorrow)}
                    className="text-xs text-accent hover:text-accentLight font-medium px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors shrink-0"
                  >
                    → tomorrow
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {backlogTasks.length === 0 && tomorrowTasks.length === 0 && (
          <p className="text-sm text-textMuted text-center py-6">Backlog is empty — add tasks above to plan tomorrow</p>
        )}
      </section>
    </div>
  );
}
