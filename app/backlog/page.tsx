"use client";
import { useState, useMemo } from "react";
import { useStore } from "@/lib/store";
import { todayISO, formatDuration } from "@/lib/utils";
import Checkbox from "@/components/Checkbox";
import NewTaskModal from "@/components/NewTaskModal";
import DurationPicker from "@/components/DurationPicker";
import { SortableList } from "@/components/SortableList";
import { Task } from "@/lib/db";

export default function BacklogPage() {
  const tasks = useStore((s) => s.tasks);
  const projects = useStore((s) => s.projects);
  const toggleTask = useStore((s) => s.toggleTask);
  const moveToToday = useStore((s) => s.moveToToday);
  const deleteTask = useStore((s) => s.deleteTask);
  const reorderTasks = useStore((s) => s.reorderTasks);

  const [showModal, setShowModal] = useState(false);
  const [durationPrompt, setDurationPrompt] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<Task[] | null>(null);

  const rawBacklog = useMemo(
    () =>
      tasks
        .filter((t) => t.lane === "afterwork" && t.isBacklog)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks]
  );

  const backlogTasks = localOrder ?? rawBacklog;

  function getProjectName(projectId: string | null) {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.name ?? null;
  }

  function getProjectColor(projectId: string | null) {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.color ?? null;
  }

  function handleMoveToToday(taskId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (task.durationMinutes == null) setDurationPrompt(taskId);
    else moveToToday(taskId);
  }

  async function handleDurationConfirm(minutes: number) {
    if (durationPrompt) await moveToToday(durationPrompt, minutes);
    setDurationPrompt(null);
  }

  function handleReorder(newItems: Task[]) {
    setLocalOrder(newItems);
    reorderTasks(newItems.map((t) => t.id));
  }

  return (
    <div className="max-w-4xl mx-auto px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Backlog</h1>
          <p className="text-sm text-textMuted mt-1">Things to do eventually — move to today when ready</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-accent/15 text-accent hover:bg-accent/25 transition-colors px-4 py-2 rounded-lg text-sm font-semibold"
        >
          + Add task
        </button>
      </div>

      {backlogTasks.length === 0 ? (
        <div className="text-center py-20 text-textMuted">
          <p className="text-4xl mb-4">◎</p>
          <p className="text-xl mb-2">Backlog is empty</p>
          <p className="text-sm">Add things here that you'll get to eventually</p>
        </div>
      ) : (
        <SortableList
          items={backlogTasks}
          onReorder={handleReorder}
          renderItem={(task) => {
            const projectName = getProjectName(task.projectId);
            const projectColor = getProjectColor(task.projectId);
            return (
              <div className="task-row flex items-center gap-3 px-3 py-3.5 rounded-xl">
                <Checkbox checked={task.status === "completed"} onChange={() => toggleTask(task.id)} size={18} dashed />
                <div className="flex-1 min-w-0">
                  <span className="text-base text-textSecondary">{task.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {projectName && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: `${projectColor}20`, color: projectColor ?? undefined }}
                      >
                        {projectName}
                      </span>
                    )}
                    {task.notes && <p className="text-xs text-textMuted truncate">{task.notes}</p>}
                  </div>
                </div>
                {task.durationMinutes != null ? (
                  <span className="text-sm text-textMuted bg-surface px-2.5 py-1 rounded-full shrink-0">
                    {formatDuration(task.durationMinutes)}
                  </span>
                ) : (
                  <span className="text-xs text-textMuted italic shrink-0">no duration</span>
                )}
                <button
                  onClick={() => handleMoveToToday(task.id)}
                  className="text-sm text-accent hover:text-accentLight transition-colors px-3 py-1.5 rounded-lg hover:bg-accent/10 shrink-0 font-medium"
                >
                  → Today
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${task.title}"?`)) deleteTask(task.id); }}
                  className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 text-sm px-1"
                >
                  ✕
                </button>
              </div>
            );
          }}
        />
      )}

      {showModal && <NewTaskModal defaultBacklog onClose={() => setShowModal(false)} />}
      {durationPrompt && (
        <DurationPicker title="How long will this take?" onConfirm={handleDurationConfirm} onCancel={() => setDurationPrompt(null)} />
      )}
    </div>
  );
}
