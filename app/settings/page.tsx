"use client";
import { useState, useEffect } from "react";
import { PRESETS, Theme, applyTheme, loadTheme, saveTheme } from "@/components/ThemeProvider";

const SWATCH_FIELDS: { key: keyof Omit<Theme, "name">; label: string; hint: string }[] = [
  { key: "bg", label: "Background", hint: "Main page background" },
  { key: "surface", label: "Surface", hint: "Cards & sidebar" },
  { key: "surfaceElevated", label: "Surface elevated", hint: "Modals & dropdowns" },
  { key: "border", label: "Border", hint: "Dividers & outlines" },
  { key: "textPrimary", label: "Text primary", hint: "Headlines & main text" },
  { key: "textSecondary", label: "Text secondary", hint: "Labels & descriptions" },
  { key: "textMuted", label: "Text muted", hint: "Hints & timestamps" },
];

export default function SettingsPage() {
  const [active, setActive] = useState<Theme>(PRESETS[0]);
  const [custom, setCustom] = useState<Theme>({ ...PRESETS[0], name: "Custom" });
  const [tab, setTab] = useState<"presets" | "custom">("presets");

  useEffect(() => {
    const saved = loadTheme();
    setActive(saved);
    const isPreset = PRESETS.some((p) => p.name === saved.name);
    if (!isPreset) {
      setCustom(saved);
      setTab("custom");
    }
  }, []);

  function apply(theme: Theme) {
    setActive(theme);
    applyTheme(theme);
    saveTheme(theme);
  }

  function applyCustom() {
    apply({ ...custom, name: "Custom" });
  }

  const previewStyle = (theme: Theme) => ({
    background: theme.bg,
    borderColor: theme.border,
  });

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Settings</h1>
        <p className="text-sm text-textMuted mt-1">Personalise the appearance of your planner</p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-6">
        <h2 className="section-label mb-5">Color theme</h2>

        {/* Tab */}
        <div className="flex gap-1 mb-6 bg-surfaceElevated rounded-lg p-1 w-fit">
          {(["presets", "custom"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                tab === t ? "bg-accent text-white" : "text-textMuted hover:text-textSecondary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "presets" && (
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset) => {
              const isActive = active.name === preset.name;
              return (
                <button
                  key={preset.name}
                  onClick={() => apply(preset)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isActive ? "border-accent" : "border-transparent hover:border-border"
                  }`}
                  style={previewStyle(preset)}
                >
                  {/* Mini preview */}
                  <div className="flex gap-1.5 mb-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.surface }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.surfaceElevated }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: preset.border }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: "#7B72FF" }} />
                  </div>
                  <p className="text-sm font-semibold" style={{ color: preset.textPrimary }}>{preset.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: preset.textMuted }}>
                    {isActive ? "Active" : "Click to apply"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {tab === "custom" && (
          <div className="space-y-4">
            <p className="text-sm text-textMuted mb-4">
              Pick colors for each part of the interface. Start from a preset by selecting one first.
            </p>

            {/* Start from preset */}
            <div className="flex gap-2 flex-wrap mb-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setCustom({ ...p, name: "Custom" })}
                  className="text-xs px-3 py-1.5 rounded-full border border-border text-textMuted hover:text-textPrimary hover:border-textSecondary transition-colors"
                >
                  From: {p.name}
                </button>
              ))}
            </div>

            <div className="grid gap-3">
              {SWATCH_FIELDS.map(({ key, label, hint }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <input
                      type="color"
                      value={custom[key]}
                      onChange={(e) => setCustom((c) => ({ ...c, [key]: e.target.value }))}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-transparent p-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-textPrimary">{label}</p>
                    <p className="text-xs text-textMuted">{hint}</p>
                  </div>
                  <code className="text-xs text-textMuted font-mono">{custom[key]}</code>
                </div>
              ))}
            </div>

            {/* Live preview */}
            <div className="mt-4 rounded-xl p-4 border" style={{ background: custom.bg, borderColor: custom.border }}>
              <div className="rounded-lg p-3 mb-2" style={{ background: custom.surface }}>
                <p className="text-sm font-semibold" style={{ color: custom.textPrimary }}>Preview card</p>
                <p className="text-xs mt-1" style={{ color: custom.textSecondary }}>Secondary text looks like this</p>
                <p className="text-xs mt-0.5" style={{ color: custom.textMuted }}>Muted hints and labels</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: custom.surfaceElevated, borderColor: custom.border }}>
                <p className="text-xs" style={{ color: custom.textMuted }}>Elevated surface (modals)</p>
              </div>
            </div>

            <button
              onClick={applyCustom}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accentLight transition-colors mt-2"
            >
              Apply custom theme
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
