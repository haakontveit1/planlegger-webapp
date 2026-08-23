"use client";
import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/utils";

export default function JournalPage() {
  const journalEntry = useStore((s) => s.journalEntry);
  const saveJournal = useStore((s) => s.saveJournal);
  const loadJournal = useStore((s) => s.loadJournal);

  const today = todayISO();
  const [rating, setRating] = useState(70);
  const [ratingNote, setRatingNote] = useState("");
  const [bedTime, setBedTime] = useState("");
  const [wakeTime, setWakeTime] = useState("");
  const [learning, setLearning] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadJournal(today);
  }, [today, loadJournal]);

  useEffect(() => {
    if (journalEntry) {
      setRating(journalEntry.rating);
      setRatingNote(journalEntry.ratingNote ?? "");
      setBedTime(journalEntry.bedTime ?? "");
      setWakeTime(journalEntry.wakeTime ?? "");
      setLearning(journalEntry.learning ?? "");
      setTomorrow(journalEntry.tomorrow ?? "");
    }
  }, [journalEntry]);

  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  async function handleSave() {
    await saveJournal({
      date: today,
      rating,
      ratingNote: ratingNote || null,
      bedTime: bedTime || null,
      wakeTime: wakeTime || null,
      learning: learning || null,
      tomorrow: tomorrow || null,
      photoUris: journalEntry?.photoUris ?? [],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 pb-8">
      <div className="mb-6">
        <p className="text-xs text-textMuted uppercase tracking-widest mb-1">{dateLabel}</p>
        <h1 className="text-xl font-bold text-textPrimary">Check-in</h1>
        <p className="text-sm text-textSecondary">How was today?</p>
      </div>

      {/* Rating */}
      <div className="bg-surface rounded-lg p-5 border border-border mb-4">
        <div className="text-center mb-4">
          <span className="text-5xl font-bold text-textPrimary">{rating}</span>
          <span className="text-2xl text-textMuted">/100</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => setRating((r) => Math.max(1, r - 5))}
            className="w-10 h-10 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors flex items-center justify-center font-semibold"
          >
            −5
          </button>
          <div className="flex-1 progress-track h-2.5">
            <div
              className="progress-fill"
              style={{ width: `${rating}%`, background: "#6C63FF" }}
            />
          </div>
          <button
            onClick={() => setRating((r) => Math.min(100, r + 5))}
            className="w-10 h-10 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors flex items-center justify-center font-semibold"
          >
            +5
          </button>
        </div>
        <div className="flex justify-between text-xs text-textMuted">
          <span>1</span>
          <span>required</span>
          <span>100</span>
        </div>
      </div>

      {/* Rating note */}
      <div className="mb-6">
        <input
          type="text"
          value={ratingNote}
          onChange={(e) => setRatingNote(e.target.value)}
          placeholder={`Why ${rating}? · quick note`}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <p className="text-xs text-textMuted uppercase tracking-widest mb-4 text-center">
        Everything below is optional
      </p>

      {/* Sleep */}
      <div className="bg-surface rounded-lg p-4 border border-border mb-4">
        <p className="text-xs font-bold text-textMuted uppercase tracking-wider mb-3">Sleep</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-textMuted mb-1">Bed</label>
            <input
              type="time"
              value={bedTime}
              onChange={(e) => setBedTime(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-textMuted mb-1">Wake</label>
            <input
              type="time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-textPrimary focus:outline-none focus:border-accent transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Learning */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">
          What did you learn today?
        </label>
        <textarea
          value={learning}
          onChange={(e) => setLearning(e.target.value)}
          placeholder="Something new I learned..."
          rows={3}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      {/* Tomorrow */}
      <div className="mb-8">
        <label className="block text-xs font-bold text-textMuted uppercase tracking-wider mb-2">
          Tomorrow I will…
        </label>
        <textarea
          value={tomorrow}
          onChange={(e) => setTomorrow(e.target.value)}
          placeholder="My intention for tomorrow..."
          rows={3}
          className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-textPrimary placeholder-textMuted focus:outline-none focus:border-accent transition-colors resize-none"
        />
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={`w-full py-3 rounded-lg text-sm font-semibold transition-all duration-normal ${
          saved
            ? "bg-success text-background"
            : "bg-textPrimary text-background hover:bg-white"
        }`}
      >
        {saved ? "✓ Saved!" : "Save & keep streak ✦"}
      </button>
    </div>
  );
}
