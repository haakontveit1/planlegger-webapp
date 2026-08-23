"use client";
import { useStore } from "@/lib/store";
import { todayISO } from "@/lib/utils";

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLabel(iso: string): string {
  const today = todayISO();
  const tomorrow = shiftDate(today, 1);
  const yesterday = shiftDate(today, -1);
  if (iso === today) return "Today";
  if (iso === tomorrow) return "Tomorrow";
  if (iso === yesterday) return "Yesterday";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export default function DateNav() {
  const selectedDate = useStore((s) => s.selectedDate);
  const setSelectedDate = useStore((s) => s.setSelectedDate);
  const today = todayISO();
  const isToday = selectedDate === today;

  return (
    <div className="flex items-center gap-2 mb-8">
      <button
        onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
        className="w-9 h-9 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary flex items-center justify-center transition-colors text-lg"
        title="Previous day"
      >
        ‹
      </button>

      <div className="flex items-center justify-center gap-2 px-4 py-2 bg-surface rounded-lg border border-border w-52 shrink-0">
        <span className="text-base font-semibold text-textPrimary">{formatLabel(selectedDate)}</span>
        {!isToday && (
          <span className="text-xs text-textMuted shrink-0">
            {selectedDate > today ? "↑" : "↓"}
          </span>
        )}
      </div>

      <button
        onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
        className="w-9 h-9 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary flex items-center justify-center transition-colors text-lg"
        title="Next day"
      >
        ›
      </button>

      {!isToday && (
        <button
          onClick={() => setSelectedDate(today)}
          className="ml-1 text-sm text-accent hover:text-accentLight transition-colors px-3 py-1.5 rounded-lg hover:bg-accent/10 font-medium"
        >
          → Today
        </button>
      )}
    </div>
  );
}
