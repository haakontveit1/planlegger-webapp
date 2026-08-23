"use client";
import { useState, useEffect } from "react";
import { formatDuration } from "@/lib/utils";

const PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

interface Props {
  title?: string;
  defaultMinutes?: number;
  onConfirm: (minutes: number) => void;
  onCancel: () => void;
}

export default function DurationPicker({
  title = "Choose duration",
  defaultMinutes = 30,
  onConfirm,
  onCancel,
}: Props) {
  const [minutes, setMinutes] = useState(defaultMinutes);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm(minutes);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [minutes, onCancel, onConfirm]);

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="bg-surfaceElevated rounded-xl w-full max-w-sm mx-4 shadow-2xl animate-pop-in p-6">
        <h3 className="text-lg font-semibold text-textPrimary mb-5">{title}</h3>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-5 mb-5">
          <button
            onClick={() => setMinutes((m) => Math.max(5, m - 5))}
            className="w-11 h-11 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary flex items-center justify-center text-xl transition-colors"
          >
            −
          </button>
          <span className="text-4xl font-bold text-textPrimary w-28 text-center">
            {formatDuration(minutes)}
          </span>
          <button
            onClick={() => setMinutes((m) => Math.min(480, m + 5))}
            className="w-11 h-11 rounded-lg border border-border text-textSecondary hover:text-textPrimary hover:border-textSecondary flex items-center justify-center text-xl transition-colors"
          >
            +
          </button>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-2 mb-6 justify-center">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setMinutes(p)}
              className={`chip ${minutes === p ? "chip-active" : "chip-inactive"}`}
            >
              {formatDuration(p)}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-textSecondary hover:text-textPrimary transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(minutes)}
            className="flex-1 py-2.5 rounded-lg bg-accent text-white hover:bg-accentLight transition-colors text-sm font-semibold"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
