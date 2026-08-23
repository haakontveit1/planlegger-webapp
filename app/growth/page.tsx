"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { todayISO, formatDuration } from "@/lib/utils";

export default function GrowthPage() {
  const tasks = useStore((s) => s.tasks);
  const devGoal = useStore((s) => s.devGoal);

  const today = todayISO();
  const todayDevTasks = tasks
    .filter((t) => t.lane === "afterwork" && t.dueDate === today && !t.isBacklog)
    .slice(0, 5);

  const targetHours = devGoal?.targetHours ?? 5;
  const loggedMinutes = devGoal?.loggedMinutes ?? 0;
  const loggedHours = loggedMinutes / 60;
  const pct = Math.min(100, Math.round((loggedHours / targetHours) * 100));

  const jumpTo = [
    { href: "/growth/journal", icon: "✎", label: "Journal", desc: "Daily check-in" },
    { href: "/growth/planner", icon: "◷", label: "Planner", desc: "Weekly goals" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-textPrimary mb-6">Growth</h1>

      {/* Dev goal card */}
      <div
        className="bg-surface rounded-lg p-5 mb-6 border border-border"
        style={{ borderLeft: "6px solid #5F27CD" }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-textMuted uppercase tracking-wider">
            Personal dev this week
          </p>
          <Link href="/growth/planner" className="text-xs text-accent hover:text-accentLight transition-colors">
            set in Planner →
          </Link>
        </div>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-2xl font-bold text-textPrimary">{loggedHours.toFixed(1)}h</span>
          <span className="text-textMuted text-sm">/ {targetHours}h goal</span>
        </div>
        <div className="progress-track h-2 w-full">
          <div className="progress-fill" style={{ width: `${pct}%`, background: "#5F27CD" }} />
        </div>
      </div>

      {/* Today's dev */}
      <section className="mb-6">
        <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">
          Today's dev
        </h2>
        {todayDevTasks.length === 0 ? (
          <p className="text-sm text-textMuted">No afterwork tasks for today.</p>
        ) : (
          <div className="space-y-1">
            {todayDevTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 px-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    t.status === "completed" ? "bg-success" : "bg-border"
                  }`}
                />
                <span
                  className={`text-sm flex-1 ${
                    t.status === "completed" ? "line-through text-textMuted" : "text-textPrimary"
                  }`}
                >
                  {t.title}
                </span>
                {t.durationMinutes != null && (
                  <span className="text-xs text-textMuted">{formatDuration(t.durationMinutes)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Jump to */}
      <section>
        <h2 className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">
          Jump to
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {jumpTo.map(({ href, icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="bg-surface border border-border rounded-lg p-4 hover:border-accent/50 hover:bg-accent/5 transition-colors group"
            >
              <div className="text-xl mb-2">{icon}</div>
              <p className="text-sm font-semibold text-textPrimary group-hover:text-accent transition-colors">
                {label}
              </p>
              <p className="text-xs text-textMuted mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
