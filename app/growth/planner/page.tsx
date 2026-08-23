"use client";
import { useState, useEffect } from "react";
import { db, WeeklyGoal } from "@/lib/db";
import { weekStartISO, newId } from "@/lib/utils";

function getWeekLabel(): string {
  const start = new Date(weekStartISO() + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export default function PlannerPage() {
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [input, setInput] = useState("");

  const weekStart = weekStartISO();

  useEffect(() => {
    db.weeklyGoals.where("weekStart").equals(weekStart).toArray().then(setGoals);
  }, [weekStart]);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const goal: WeeklyGoal = {
      id: newId(),
      weekStart,
      text: input.trim(),
      isWish: false,
      achieved: false,
    };
    await db.weeklyGoals.add(goal);
    setGoals((prev) => [...prev, goal]);
    setInput("");
  }

  async function toggleGoal(id: string) {
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;
    const achieved = !goal.achieved;
    await db.weeklyGoals.update(id, { achieved });
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, achieved } : g));
  }

  async function deleteGoal(id: string) {
    await db.weeklyGoals.delete(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const pending = goals.filter((g) => !g.achieved);
  const done = goals.filter((g) => g.achieved);

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">This week</h1>
        <p className="text-sm text-textMuted mt-1">{getWeekLabel()}</p>
      </div>

      {/* Add goal */}
      <form onSubmit={addGoal} className="flex gap-2 mb-8">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Something to get done this week..."
          className="input-base flex-1"
          autoFocus
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accentLight transition-colors disabled:opacity-40 shrink-0"
        >
          Add
        </button>
      </form>

      {/* Pending */}
      {pending.length === 0 && done.length === 0 ? (
        <div className="text-center py-16 text-textMuted">
          <p className="text-xl mb-2">Nothing planned yet</p>
          <p className="text-sm">Add what you want to get done this week</p>
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {pending.map((goal) => (
            <div key={goal.id} className="flex items-center gap-3 bg-surface rounded-xl border border-border px-5 py-4 group">
              <button
                onClick={() => toggleGoal(goal.id)}
                className="w-5 h-5 rounded border-2 border-border hover:border-accent transition-colors shrink-0 flex items-center justify-center"
              />
              <span className="flex-1 text-base text-textPrimary">{goal.text}</span>
              <button
                onClick={() => deleteGoal(goal.id)}
                className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 text-sm px-1"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <h2 className="section-label mb-3">Done ({done.length})</h2>
          <div className="space-y-2">
            {done.map((goal) => (
              <div key={goal.id} className="flex items-center gap-3 bg-surface rounded-xl border border-border px-5 py-4 opacity-60">
                <button
                  onClick={() => toggleGoal(goal.id)}
                  className="w-5 h-5 rounded border-2 border-success bg-success/20 transition-colors shrink-0 flex items-center justify-center"
                >
                  <span className="text-success text-xs font-bold">✓</span>
                </button>
                <span className="flex-1 text-base text-textMuted line-through">{goal.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
