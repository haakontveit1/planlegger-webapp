"use client";
import { useState, useRef } from "react";
import { useStore } from "@/lib/store";
import { newId, now } from "@/lib/utils";
import { BrainDumpNote } from "@/lib/db";

type SortTarget = "afterwork" | "delete" | null;

function BrainDumpItem({ item }: { item: { id: string; text: string; notes: string | null; createdAt: string } }) {
  const sortBrainDump = useStore((s) => s.sortBrainDump);
  const deleteBrainDump = useStore((s) => s.deleteBrainDump);
  const brainDumpNotes = useStore((s) => s.brainDumpNotes);
  const addBrainDumpNote = useStore((s) => s.addBrainDumpNote);
  const deleteBrainDumpNote = useStore((s) => s.deleteBrainDumpNote);

  const [sortOpen, setSortOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const noteInputRef = useRef<HTMLInputElement>(null);

  const notes = brainDumpNotes.filter((n) => n.brainDumpItemId === item.id);

  async function handleSort(target: SortTarget) {
    if (!target) return;
    setSortOpen(false);
    await sortBrainDump(item.id, target);
  }

  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    const note: BrainDumpNote = {
      id: newId(),
      brainDumpItemId: item.id,
      text: newNote.trim(),
      createdAt: now(),
    };
    await addBrainDumpNote(note);
    setNewNote("");
    noteInputRef.current?.focus();
  }

  function toggleNotes() {
    setNotesOpen((v) => !v);
    if (!notesOpen) setTimeout(() => noteInputRef.current?.focus(), 50);
  }

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden animate-fade-in">
      {/* Main row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <span className="text-textMuted cursor-grab select-none text-lg shrink-0">≡</span>
        <span className="text-base text-textPrimary flex-1">{item.text}</span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={toggleNotes}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              notesOpen ? "text-accent bg-accent/10" : "text-textMuted hover:text-accent hover:bg-accent/10"
            }`}
          >
            {notes.length > 0
              ? `${notes.length} note${notes.length !== 1 ? "s" : ""}`
              : "+ note"}
          </button>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              sortOpen ? "bg-accent text-white" : "text-accent hover:bg-accent/10"
            }`}
          >
            sort →
          </button>
          <button
            onClick={() => deleteBrainDump(item.id)}
            className="text-textMuted hover:text-danger transition-colors px-2 py-1 text-sm"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Notes section — hidden by default, expanded on click */}
      {notesOpen && (
        <div className="border-t border-border/50 px-5 py-3 space-y-2">
          {notes.length === 0 && (
            <p className="text-xs text-textMuted py-1">No notes yet — add one below</p>
          )}
          {notes.map((note) => (
            <div key={note.id} className="flex items-start gap-2 group">
              <div className="flex-1 bg-surfaceElevated rounded-xl px-4 py-2.5 border border-border/60">
                <p className="text-sm text-textSecondary">{note.text}</p>
              </div>
              <button
                onClick={() => deleteBrainDumpNote(note.id)}
                className="text-textMuted hover:text-danger transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-2 text-sm px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <form onSubmit={handleAddNote} className="flex gap-2 pt-1">
            <input
              ref={noteInputRef}
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 min-w-0 bg-surfaceElevated border border-border rounded-xl px-3 py-2 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!newNote.trim()}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent/15 text-accent hover:bg-accent/25 transition-colors disabled:opacity-40 shrink-0"
            >
              Add
            </button>
          </form>
        </div>
      )}

      {/* Sort picker */}
      {sortOpen && (
        <div className="px-5 pb-4 border-t border-border/50 pt-3">
          <p className="section-label mb-3">Move to lane or discard</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSort("afterwork")}
              className="py-2.5 rounded-lg text-sm font-semibold text-background bg-success hover:bg-teal-400 transition-colors"
            >
              → Task
            </button>
            <button
              onClick={() => setSortOpen(false)}
              className="py-2.5 rounded-lg text-sm font-semibold text-textSecondary border border-border hover:border-textSecondary transition-colors"
            >
              Keep
            </button>
            <button
              onClick={() => handleSort("delete")}
              className="py-2.5 rounded-lg text-sm font-semibold text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrainDumpPage() {
  const items = useStore((s) => s.brainDumpItems);
  const addBrainDump = useStore((s) => s.addBrainDump);

  const [input, setInput] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleAdd(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim()) return;
    await addBrainDump(input.trim(), notes.trim() || undefined);
    setInput("");
    setNotes("");
    setShowNotes(false);
    inputRef.current?.focus();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-3xl font-bold text-textPrimary mb-1">Brain dump</h1>
      <p className="text-sm text-textMuted mb-8">
        Empty your head. No lane, no date — sort it later, or never.
      </p>

      {/* Quick-add */}
      <div className="bg-surface rounded-xl border border-border p-5 mb-8">
        <form onSubmit={handleAdd}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">⚡</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What's on your mind?"
              className="flex-1 min-w-0 bg-surfaceElevated border border-border rounded-lg px-4 py-2.5 text-base text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent transition-colors"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accentLight transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              Add
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNotes((v) => !v)}
              className="text-xs text-textMuted hover:text-accent transition-colors flex items-center gap-1"
            >
              {showNotes ? "▾ Hide notes" : "▸ Add notes"}
            </button>
            <span className="text-xs text-textMuted">or hit Enter to drop it in below</span>
          </div>

          {showNotes && (
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="More details, links, context..."
              rows={3}
              className="w-full mt-3 bg-surfaceElevated border border-border rounded-lg px-4 py-3 text-sm text-textPrimary placeholder:text-textMuted focus:outline-none focus:border-accent transition-colors resize-none"
            />
          )}
        </form>
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-20 text-textMuted">
          <p className="text-4xl mb-4">🧠</p>
          <p className="text-xl mb-2">Nothing captured yet</p>
          <p className="text-sm">Start typing above — sort it into a task when you&apos;re ready</p>
        </div>
      ) : (
        <>
          <h2 className="section-label mb-4">Dumped ({items.length})</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <BrainDumpItem key={item.id} item={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
