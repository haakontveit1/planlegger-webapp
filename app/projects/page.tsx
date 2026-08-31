"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Project, ProjectNote } from "@/lib/db";
import { newId, now } from "@/lib/utils";

const PROJECT_COLORS = [
  "#7B72FF", "#54A0FF", "#3DDBD2", "#FF9F43",
  "#5F27CD", "#FECA57", "#FF6B6B", "#1DD1A1",
];

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const addProject = useStore((s) => s.addProject);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !category.trim()) return;
    await addProject({ name: name.trim(), category: category.trim(), color });
    onDone();
  }

  return (
    <form onSubmit={handleSubmit}
      className="bg-surfaceElevated rounded-xl border border-border p-6 space-y-4 animate-slide-up">
      <h3 className="text-lg font-semibold text-textPrimary">New project</h3>
      <div>
        <label className="section-label block mb-2">Category</label>
        <input type="text" value={category} onChange={(e) => setCategory(e.target.value)}
          placeholder='e.g. "Coding", "Fitness", "Learning"' className="input-base" autoFocus />
        <p className="text-xs text-textMuted mt-1">Groups related projects together</p>
      </div>
      <div>
        <label className="section-label block mb-2">Project name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder='e.g. "Web app Planner", "Marathon training"' className="input-base" />
      </div>
      <div>
        <label className="section-label block mb-2">Color</label>
        <div className="flex gap-2 flex-wrap">
          {PROJECT_COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className="w-8 h-8 rounded-full transition-transform hover:scale-110"
              style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone}
          className="flex-1 py-2.5 rounded-lg border border-border text-textSecondary hover:text-textPrimary transition-colors text-sm font-medium">
          Cancel
        </button>
        <button type="submit" disabled={!name.trim() || !category.trim()}
          className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accentLight transition-colors text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
          Create project
        </button>
      </div>
    </form>
  );
}

function InlineNoteForm({ project, onClose }: { project: Project; onClose: () => void }) {
  const addProjectNote = useStore((s) => s.addProjectNote);
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: ProjectNote = { id: newId(), projectId: project.id, text: trimmed, createdAt: now() };
    await addProjectNote(note);
    setText("");
    setSaved(true);
    setTimeout(() => { setSaved(false); inputRef.current?.focus(); }, 1500);
  }

  return (
    <div className="mt-1 bg-surfaceElevated rounded-b-xl border border-t-0 border-border px-4 py-3">
      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); }}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          placeholder="Add a note..."
          className="input-base flex-1 text-sm"
          style={{ padding: "8px 12px" }}
        />
        <button type="submit" disabled={!text.trim()}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 disabled:opacity-40 ${
            saved ? "bg-success/20 text-success" : "bg-accent/15 text-accent hover:bg-accent/25"
          }`}>
          {saved ? "✓ Saved" : "Add"}
        </button>
        <button type="button" onClick={onClose}
          className="text-textMuted hover:text-textPrimary transition-colors px-2 py-2 rounded hover:bg-white/5 shrink-0 text-sm">
          ✕
        </button>
      </form>
      <p className="text-xs text-textMuted mt-2">Open the project to read notes · Esc to close</p>
    </div>
  );
}

export default function ProjectsPage() {
  const projects = useStore((s) => s.projects);
  const tasks = useStore((s) => s.tasks);
  const deleteProject = useStore((s) => s.deleteProject);
  const [showForm, setShowForm] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

  const byCategory = projects.reduce<Record<string, Project[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  function taskCountForProject(projectId: string) {
    return tasks.filter((t) => t.projectId === projectId && t.status !== "completed").length;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Projects</h1>
          <p className="text-sm text-textMuted mt-1">Organise tasks by category and project</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-accent/15 text-accent hover:bg-accent/25 transition-colors px-4 py-2 rounded-lg text-sm font-semibold">
          {showForm ? "Cancel" : "+ New project"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8">
          <NewProjectForm onDone={() => setShowForm(false)} />
        </div>
      )}

      {Object.keys(byCategory).length === 0 ? (
        <div className="text-center py-20 text-textMuted">
          <p className="text-4xl mb-4">◫</p>
          <p className="text-xl mb-2">No projects yet</p>
          <p className="text-sm">Create a project to organise your tasks by area</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(byCategory).map(([category, projs]) => (
            <div key={category}>
              <h2 className="section-label mb-4">{category}</h2>
              <div className="grid gap-1">
                {projs.map((project) => {
                  const pending = taskCountForProject(project.id);
                  const noteOpen = expandedNoteId === project.id;
                  return (
                    <div key={project.id} className="relative group">
                      <Link href={`/projects/${project.id}`}
                        className={`block bg-surface border border-border px-6 py-5 flex items-center gap-4 hover:border-opacity-60 transition-colors ${noteOpen ? "rounded-t-xl" : "rounded-xl"}`}
                        style={{ borderLeft: `5px solid ${project.color}` }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-semibold text-textPrimary">{project.name}</p>
                          <p className="text-sm text-textMuted mt-0.5">
                            {pending > 0 ? `${pending} pending task${pending !== 1 ? "s" : ""}` : "No open tasks"}
                          </p>
                        </div>
                        <span className="text-xl text-textMuted group-hover:text-textSecondary transition-colors mr-20 md:mr-8">›</span>
                      </Link>
                      {/* Action buttons */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.preventDefault(); setExpandedNoteId(noteOpen ? null : project.id); }}
                          className={`transition-colors text-sm px-2 py-1.5 rounded hover:bg-white/5 ${
                            noteOpen ? "text-accent" : "text-textMuted hover:text-textSecondary"
                          }`}
                          title="Add note"
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            if (confirm(`Delete project "${project.name}"? Tasks will be unlinked.`)) {
                              deleteProject(project.id);
                            }
                          }}
                          className="text-textMuted hover:text-danger transition-colors text-sm px-2 py-1.5 rounded hover:bg-white/5"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                      {/* Inline note form */}
                      {noteOpen && (
                        <InlineNoteForm project={project} onClose={() => setExpandedNoteId(null)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
