"use client";
import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeightLog { date: string; weightKg: number }

type WeightGoal =
  | { type: "target-date"; targetDate: string; targetWeight: number }
  | { type: "rate"; rateKgPerWeek: number; startDate: string; startWeight: number };

type Row = { date: string; type: number; value: number };

// ── Config ────────────────────────────────────────────────────────────────────

const CHART_STYLE = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#6b7280",
  tooltip: { background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 },
};

const METRICS = [
  { type: 1,  label: "Vekt",         unit: "kg",  color: "#7B72FF", decimals: 1 },
  { type: 6,  label: "Fettprosent",  unit: "%",   color: "#F59E0B", decimals: 1 },
  { type: 5,  label: "Mager masse",  unit: "kg",  color: "#34D399", decimals: 1 },
  { type: 8,  label: "Fettmasse",    unit: "kg",  color: "#F87171", decimals: 1 },
  { type: 76, label: "Muskelmasse",  unit: "kg",  color: "#60A5FA", decimals: 1 },
  { type: 77, label: "Hydrering",    unit: "kg",  color: "#38BDF8", decimals: 1 },
  { type: 88, label: "Benmasse",     unit: "kg",  color: "#A78BFA", decimals: 2 },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeGoalLine(
  logs: WeightLog[],
  goal: WeightGoal
): { date: string; goal: number }[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const result: { date: string; goal: number }[] = [];

  if (goal.type === "target-date") {
    const latest = sorted[sorted.length - 1];
    const latestDate = new Date(latest.date + "T00:00:00");
    const endDate = new Date(goal.targetDate + "T00:00:00");
    const totalMs = endDate.getTime() - latestDate.getTime();
    const cur = new Date(sorted[0].date + "T00:00:00");
    while (cur <= endDate) {
      const frac = totalMs > 0 ? (cur.getTime() - latestDate.getTime()) / totalMs : 0;
      result.push({ date: localDateStr(cur), goal: Math.round((latest.weightKg + (goal.targetWeight - latest.weightKg) * frac) * 10) / 10 });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    const { rateKgPerWeek, startDate, startWeight } = goal;
    if (!startDate || isNaN(startWeight) || isNaN(rateKgPerWeek)) return [];
    const ratePerDay = rateKgPerWeek / 7;
    const goalStart = new Date(startDate + "T00:00:00");
    const end = new Date(); end.setDate(end.getDate() + 90);
    const cur = new Date(goalStart);
    while (cur <= end) {
      const days = (cur.getTime() - goalStart.getTime()) / 86400000;
      const goalVal = Math.round((startWeight + ratePerDay * days) * 100) / 100;
      if (!isNaN(goalVal)) result.push({ date: localDateStr(cur), goal: goalVal });
      cur.setDate(cur.getDate() + 1);
    }
  }
  return result;
}

// ── Components ────────────────────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-textMuted">
      {message}
    </div>
  );
}

function MetricChart({
  label, unit, color, decimals, data,
}: {
  label: string; unit: string; color: string; decimals: number;
  data: { date: string; value: number }[];
}) {
  if (data.length === 0) return null;

  const latest = data[data.length - 1].value;
  const first = data[0].value;
  const delta = latest - first;
  const sign = delta >= 0 ? "+" : "";
  const chartData = data.map(d => ({ date: fmtDate(d.date), value: d.value }));
  const minVal = Math.min(...data.map(d => d.value));
  const maxVal = Math.max(...data.map(d => d.value));
  const pad = (maxVal - minVal) * 0.1 || 0.5;

  return (
    <div className="bg-surface rounded-xl border border-border p-5">
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-sm font-semibold text-textPrimary">{label}</h3>
        <div className="text-right">
          <span className="text-xl font-bold text-textPrimary">{latest.toFixed(decimals)}</span>
          <span className="text-xs text-textMuted ml-1">{unit}</span>
        </div>
      </div>
      <p className="text-xs text-textMuted mb-4">
        {data.length} målinger · endring{" "}
        <span className={delta >= 0 ? "text-green-400" : "text-red-400"}>
          {sign}{delta.toFixed(decimals)} {unit}
        </span>
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-textMuted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: "var(--color-textMuted)" }} tickLine={false} axisLine={false} domain={[minVal - pad, maxVal + pad]} tickFormatter={(v: number) => v.toFixed(decimals)} />
          <Tooltip
            contentStyle={{ background: "var(--color-surfaceElevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
            formatter={(v) => [`${Number(v).toFixed(decimals)} ${unit}`, label]}
            labelStyle={{ color: "var(--color-textMuted)" }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={data.length <= 30 ? { r: 3, fill: color, strokeWidth: 0 } : false} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WeightTrackingPage() {
  // Weight tracker state
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [goalType, setGoalType] = useState<"target-date" | "rate">("target-date");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalTargetWeight, setGoalTargetWeight] = useState("");
  const [goalRate, setGoalRate] = useState("");
  const [goalPeriod, setGoalPeriod] = useState<"week" | "month">("week");
  const [goalStartDate, setGoalStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [goalStartWeight, setGoalStartWeight] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightDateInput, setWeightDateInput] = useState(() => localDateStr(new Date()));
  const [weightSaving, setWeightSaving] = useState(false);

  // Withings state
  const [rows, setRows] = useState<Row[]>([]);
  const [withingsLoading, setWithingsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function loadMeasurements() {
    const data: Row[] = await fetch("/api/withings/measurements").then(r => r.json()).catch(() => []);
    setRows(data);
  }

  useEffect(() => {
    try {
      const g = localStorage.getItem("weight_goal");
      if (g) {
        const parsed = JSON.parse(g) as WeightGoal;
        setWeightGoal(parsed);
        setGoalType(parsed.type);
        if (parsed.type === "target-date") {
          setGoalTargetDate(parsed.targetDate);
          setGoalTargetWeight(String(parsed.targetWeight));
        } else {
          setGoalRate(String(parsed.rateKgPerWeek));
          setGoalStartDate(parsed.startDate);
          setGoalStartWeight(String(parsed.startWeight));
        }
      }
    } catch {}
    fetch("/api/weight-logs").then(r => r.json()).then(setWeightLogs).catch(() => {});
    loadMeasurements().finally(() => setWithingsLoading(false));
  }, []);

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    const kg = parseFloat(weightInput);
    if (isNaN(kg) || !weightDateInput) return;
    setWeightSaving(true);
    try {
      await fetch("/api/weight-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: weightDateInput, weightKg: kg }),
      });
      const updated = await fetch("/api/weight-logs").then(r => r.json());
      setWeightLogs(updated);
      setWeightInput("");
    } catch {}
    setWeightSaving(false);
  }

  function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    let goal: WeightGoal | null = null;
    if (goalType === "target-date") {
      if (!goalTargetDate || !goalTargetWeight) return;
      goal = { type: "target-date", targetDate: goalTargetDate, targetWeight: parseFloat(goalTargetWeight) };
    } else {
      if (!goalRate || !goalStartDate || !goalStartWeight) return;
      const rateVal = parseFloat(goalRate);
      const rateKgPerWeek = goalPeriod === "month" ? rateVal / 4.33 : rateVal;
      goal = { type: "rate", rateKgPerWeek, startDate: goalStartDate, startWeight: parseFloat(goalStartWeight) };
    }
    try { localStorage.setItem("weight_goal", JSON.stringify(goal)); } catch {}
    setWeightGoal(goal);
    setShowGoalForm(false);
  }

  const weightChartData = useMemo(() => {
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
    const goalLine = weightGoal ? computeGoalLine(weightLogs, weightGoal) : [];
    const goalMap = new Map(goalLine.map(g => [g.date, g.goal]));
    return sorted.map(w => ({
      date: fmtDate(w.date),
      weight: w.weightKg,
      goal: goalMap.get(w.date) ?? null,
    }));
  }, [weightLogs, weightGoal]);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/withings/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ days: 180 }) });
      const data = await res.json() as { ok?: boolean; count?: number; error?: string; debug?: { groupCount: number; rawBody: unknown } };
      if (data.ok) {
        const groups = data.debug?.groupCount ?? "?";
        setSyncMsg(`${data.count ?? 0} målinger lagret (${groups} grupper) — raw: ${JSON.stringify(data.debug?.rawBody).slice(0, 300)}`);
        await loadMeasurements();
        const updated = await fetch("/api/weight-logs").then(r => r.json()).catch(() => []);
        setWeightLogs(updated);
      } else {
        setSyncMsg(data.error ?? "Noe gikk galt");
      }
    } catch {
      setSyncMsg("Noe gikk galt");
    }
    setSyncing(false);
  }

  const byType = useMemo(() => {
    const map = new Map<number, { date: string; value: number }[]>();
    for (const row of rows) {
      if (!map.has(row.type)) map.set(row.type, []);
      map.get(row.type)!.push({ date: row.date, value: row.value });
    }
    return map;
  }, [rows]);

  const hasAny = rows.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary">Weight Tracking</h1>
        <p className="text-sm text-textMuted mt-1">Vektlogg, mål og Withings kroppsmålinger</p>
      </div>

      {/* ── Weight tracker ── */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-textPrimary">Vekt</h2>
            {weightLogs.length > 0 && <p className="text-xs text-textMuted mt-0.5">{weightLogs.length} målinger logget</p>}
          </div>
          <button
            onClick={() => setShowGoalForm((v) => !v)}
            className="text-xs text-textMuted hover:text-accent transition-colors px-2 py-1 rounded border border-border hover:border-accent/50 shrink-0"
          >
            {weightGoal ? "Rediger mål" : "Sett mål"}
          </button>
        </div>

        {showGoalForm && (
          <form onSubmit={saveGoal} className="mb-5 p-4 bg-surfaceElevated rounded-xl border border-border space-y-3">
            <div className="flex gap-3">
              <label className="flex items-center gap-1.5 text-sm text-textSecondary cursor-pointer">
                <input type="radio" checked={goalType === "target-date"} onChange={() => setGoalType("target-date")} className="accent-amber-400" />
                Dato-mål
              </label>
              <label className="flex items-center gap-1.5 text-sm text-textSecondary cursor-pointer">
                <input type="radio" checked={goalType === "rate"} onChange={() => setGoalType("rate")} className="accent-amber-400" />
                Fast rate
              </label>
            </div>
            {goalType === "target-date" ? (
              <div className="flex items-center gap-3 flex-wrap">
                <input type="date" value={goalTargetDate} onChange={(e) => setGoalTargetDate(e.target.value)} className="input-base text-sm" required />
                <div className="flex items-center gap-1.5">
                  <input type="number" step="0.1" value={goalTargetWeight} onChange={(e) => setGoalTargetWeight(e.target.value)} placeholder="Målvekt" className="input-base text-sm w-24" required />
                  <span className="text-sm text-textMuted">kg</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <input type="number" step="0.01" value={goalRate} onChange={e => setGoalRate(e.target.value)} placeholder="f.eks. -0.5" className="input-base text-sm w-28" required />
                  <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-sm text-textSecondary cursor-pointer">
                      <input type="radio" checked={goalPeriod === "week"} onChange={() => setGoalPeriod("week")} className="accent-amber-400" />
                      per uke
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-textSecondary cursor-pointer">
                      <input type="radio" checked={goalPeriod === "month"} onChange={() => setGoalPeriod("month")} className="accent-amber-400" />
                      per måned
                    </label>
                  </div>
                  <span className="text-xs text-textMuted">kg (negativt = nedgang)</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <p className="text-xs text-textMuted mb-1">Startdato</p>
                    <input type="date" value={goalStartDate} onChange={e => setGoalStartDate(e.target.value)} className="input-base text-sm" required />
                  </div>
                  <div>
                    <p className="text-xs text-textMuted mb-1">Vekt på startdato</p>
                    <div className="flex items-center gap-1.5">
                      <input type="number" step="0.1" value={goalStartWeight} onChange={e => setGoalStartWeight(e.target.value)} placeholder="0.0" className="input-base text-sm w-24" required />
                      <span className="text-sm text-textMuted">kg</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-accent/15 text-accent text-sm font-semibold hover:bg-accent/25 transition-colors">Lagre</button>
              {weightGoal && (
                <button type="button" onClick={() => { try { localStorage.removeItem("weight_goal"); } catch {} setWeightGoal(null); setShowGoalForm(false); }}
                  className="px-4 py-1.5 rounded-lg text-textMuted text-sm hover:text-danger transition-colors">Fjern mål</button>
              )}
            </div>
          </form>
        )}

        {weightChartData.filter(d => d.weight != null).length === 0 ? (
          <EmptyChart message="Ingen vektmålinger ennå — bruk skjemaet nedenfor" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightChartData} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis domain={["auto", "auto"]} tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={60} unit=" kg" />
              <Tooltip
                contentStyle={CHART_STYLE.tooltip}
                labelStyle={{ color: "#e5e7eb" }}
                formatter={(v, name) => [`${v} kg`, name === "weight" ? "Vekt" : "Mål"]}
              />
              <Line type="monotone" dataKey="weight" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3, fill: "#F59E0B" }} activeDot={{ r: 5 }} connectNulls />
              {weightGoal && (
                <Line type="monotone" dataKey="goal" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls opacity={0.5} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}

        {weightGoal && !showGoalForm && (
          <div className="mt-3 flex items-center gap-3 px-3 py-2 rounded-lg bg-accent/8 border border-accent/20 text-sm">
            <span className="text-accent text-base leading-none">◎</span>
            {weightGoal.type === "target-date" ? (
              <span className="text-textSecondary">
                Mål: <span className="text-textPrimary font-semibold">{weightGoal.targetWeight} kg</span>
                {" "}innen{" "}
                <span className="text-textPrimary font-semibold">
                  {new Date(weightGoal.targetDate + "T00:00:00").toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </span>
            ) : (
              <span className="text-textSecondary">
                Rate:{" "}
                <span className="text-textPrimary font-semibold">
                  {weightGoal.rateKgPerWeek >= 0 ? "+" : ""}{weightGoal.rateKgPerWeek.toFixed(2)} kg/uke
                </span>
                {" · "}startdato{" "}
                <span className="text-textPrimary font-semibold">
                  {new Date(weightGoal.startDate + "T00:00:00").toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {" · "}startvekt{" "}
                <span className="text-textPrimary font-semibold">{weightGoal.startWeight} kg</span>
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleLogWeight} className="mt-4 flex items-center gap-2 flex-wrap">
          <input type="date" value={weightDateInput} onChange={e => setWeightDateInput(e.target.value)} className="input-base text-sm" />
          <div className="flex items-center gap-1.5">
            <input type="number" step="0.1" value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="f.eks. 82.5" className="input-base text-sm w-28" />
            <span className="text-sm text-textMuted">kg</span>
          </div>
          <button type="submit" disabled={!weightInput || weightSaving} className="px-4 py-2 rounded-xl bg-accent/15 text-accent text-sm font-semibold hover:bg-accent/25 transition-colors disabled:opacity-40">
            {weightSaving ? "Lagrer…" : "Logg vekt"}
          </button>
        </form>
      </section>

      {/* ── Withings body composition ── */}
      <div>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-textPrimary">Withings kroppsmålinger</h2>
            <p className="text-sm text-textMuted mt-1">Kroppsmålinger fra smart-vekten</p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 rounded-xl bg-accent/15 text-accent text-sm font-semibold hover:bg-accent/25 transition-colors disabled:opacity-40"
            >
              {syncing ? "Synkroniserer…" : "Synkroniser historikk"}
            </button>
            {syncMsg && <p className="text-xs text-textMuted">{syncMsg}</p>}
          </div>
        </div>

        {withingsLoading && <p className="text-textMuted text-sm">Laster målinger…</p>}

        {!withingsLoading && !hasAny && (
          <div className="bg-surface rounded-xl border border-border p-8 text-center">
            <p className="text-textMuted text-sm">Ingen Withings-målinger ennå.</p>
            <p className="text-textMuted text-xs mt-1">Trett på vekten, så synkroniseres dataene automatisk.</p>
          </div>
        )}

        {!withingsLoading && hasAny && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {METRICS.map(m => {
              const data = byType.get(m.type) ?? [];
              return (
                <MetricChart key={m.type} label={m.label} unit={m.unit} color={m.color} decimals={m.decimals} data={data} />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
