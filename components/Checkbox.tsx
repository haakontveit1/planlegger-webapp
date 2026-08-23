"use client";
import { useState } from "react";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  size?: number;
  dashed?: boolean;
  color?: string;
}

export default function Checkbox({
  checked,
  onChange,
  size = 16,
  dashed = false,
  color = "#4ECDC4",
}: CheckboxProps) {
  const [popping, setPopping] = useState(false);

  function handle() {
    if (!checked) {
      setPopping(true);
      setTimeout(() => setPopping(false), 200);
    }
    onChange();
  }

  return (
    <button
      type="button"
      onClick={handle}
      className={`shrink-0 rounded flex items-center justify-center transition-all duration-fast ${popping ? "check-pop" : ""}`}
      style={{
        width: size,
        height: size,
        border: checked
          ? "none"
          : dashed
          ? `2px dashed #444460`
          : `2px solid #444460`,
        background: checked ? color : "transparent",
        cursor: "pointer",
      }}
      aria-label={checked ? "Mark incomplete" : "Mark complete"}
    >
      {checked && (
        <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4l3 3 5-6"
            stroke="#0F0F14"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
