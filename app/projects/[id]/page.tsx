"use client";
import { use, useState, useMemo } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { todayISO, formatDuration } from "@/lib/utils";
import Checkbox from "@/components/Checkbox";
import NewTaskModal from "@/components/NewTaskModal";
import { SortableList } from "@/components/SortableList";
import { Task } from "@/lib/db";

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const toggleTask = useStore((s) => s.toggleTask);
  const reorderTasks = useStore((s) => s.reorderTasks);
  const [showModal, setShowModal] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [localOrder, setLocalOrder] = useState<Task[] | null>(null);

  const project = projects.find((p) => p.id === id);
  const projectTasks = tasks.filter((t) => t.projectId === id);
  const completedTasks = projectTasks.filter((t) => t.status === "completed");

  const today = todayISO();

  const rawPending = useMemo(
    () => projectTasks.filter((t) => t.status === "pending").sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks, id]
  );
  const pendingTasks = localOrder ?? rawPending;

  const todayTasks = pendingTasks.filter((t) => t.dueDate === today);
  const backlogTasks = pendingTasks.filter((t) => t.isBacklog || !t.dueDate);
  const otherTasks = pendingTasks.filter((t) => !t.isBacklog && t.dueDate && t.dueDate !== today);

  function handleReorder(newItems: Task[]) {
    setLocalOrder(newItems);
    reorderTasks(newItems.map((t) => t.id));
  }

  const totalMinutes = pendingTasks.reduce((s, t) => s + (t.durationMinutes ?? 0), 0);
  const pct = projectTasks.length > 0
    ? Math.round((completedTasks.length / projectTasks.length) * 100)
    : 0;

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-10">
        <Link href="/projects" className="text-sm text-accent hover:text-accentLight transition-colors">← Projects</Link>
        <p className="mt-8 text-textMuted">Project not found.</p>
      </div>
    );
  }

  function TaskRow({ task }: { task: typeof tasks[0] }) {
    return (
      <div className="task-row flex items-center gap-4 px-3 py-3.5 rounded-xl">
        <Checkbox checked={task.status === "completed"} onChange={() => toggleTask(task.id)} size={18} />
        <div className="flex-1 min-w-0">
          <span className={`text-base ${task.status === "completed" ? "line-through text-textMuted" : "text-textPrimary"}`}>
            {task.title}
          </span>
          {task.notes && <p className="text-xs text-textMuted mt-0.5 truncate">{task.notes}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {task.durationMinutes != null && (
            <span className="text-sm text-textMuted bg-surface px-2.5 py-1 rounded-full">
              {formatDuration(task.durationMinutes)}
            </span>
          )}
          {task.dueDate === today && task.status !== "completed" && (
            <span className="text-xs text-categoryWork bg-categoryWork/15 px-2 py-0.5 rounded-full font-medium">today</span>
          )}
          {task.isBacklog && (
            <span className="text-xs text-textMuted bg-surface px-2 py-0.5 rounded-full border border-border">backlog</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      {/* Back */}
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-textMuted hover:text-textPrimary transition-colors mb-6">
        ← Projects
      </Link>

      {/* Header */}
      <div
        className="bg-surface rounded-xl border border-border p-6 mb-8"
        style={{ borderLeft: `6px solid ${project.color}` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase mb-1" style={{ color: project.color }}>
              {project.category}
            </p>
            <h1 className="text-3xl font-bold text-textPrimary">{project.name}</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
            style={{ background: `${project.color}20`, color: project.color }}
          >
            + Add task
          </button>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-5 pt-5 border-t border-border">
          <div>
            <p className="text-2xl font-bold text-textPrimary">{pendingTasks.length}</p>
            <p className="text-xs text-textMuted">pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-textPrimary">{completedTasks.length}</p>
            <p className="text-xs text-textMuted">completed</p>
          </div>
          {totalMinutes > 0 && (
            <div>
              <p className="text-2xl font-bold text-textPrimary">{formatDuration(totalMinutes)}</p>
              <p className="text-xs text-textMuted">pending time</p>
            </div>
          )}
          <div className="flex-1" />
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: project.color }}>{pct}%</p>
            <p className="text-xs text-textMuted">complete</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-track h-2 mt-3">
          <div className="progress-fill" style={{ width: `${pct}%`, background: project.color }} />
        </div>
      </div>

      {/* Today */}
      {todayTasks.length > 0 && (
        <section className="mb-8">
          <h2 className="section-label mb-4">Due today</h2>
          <SortableList items={todayTasks} onReorder={handleReorder} renderItem={(t) => <TaskRow task={t} />} />
        </section>
      )}

      {/* Upcoming */}
      {otherTasks.length > 0 && (
        <section className="mb-8">
          <h2 className="section-label mb-4">Upcoming</h2>
          <SortableList items={otherTasks} onReorder={handleReorder} renderItem={(t) => <TaskRow task={t} />} />
        </section>
      )}

      {/* Backlog */}
      {backlogTasks.length > 0 && (
        <section className="mb-8">
          <h2 className="section-label mb-4">Backlog</h2>
          <SortableList items={backlogTasks} onReorder={handleReorder} renderItem={(t) => <TaskRow task={t} />} />
        </section>
      )}

      {pendingTasks.length === 0 && (
        <div className="text-center py-16 text-textMuted">
          <p className="text-xl mb-2">No open tasks</p>
          <p className="text-sm">Add a task to this project to get started</p>
        </div>
      )}

      {/* Completed */}
      {completedTasks.length > 0 && (
        <section>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="section-label flex items-center gap-2 mb-4 hover:text-textSecondary transition-colors"
          >
            <span>{showCompleted ? "▾" : "▸"}</span>
            Completed ({completedTasks.length})
          </button>
          {showCompleted && (
            <div className="space-y-1">
              {completedTasks.map((t) => <TaskRow key={t.id} task={t} />)}
            </div>
          )}
        </section>
      )}

      {showModal && (
        <NewTaskModal
          defaultProjectId={project.id}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
