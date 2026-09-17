"use client";
import { useEffect, useState, useMemo } from "react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

interface WeightLog { date: string; weightKg: number }
interface GarminDay {
  date: string;
  steps: number | null;
  sleepSeconds: number | null;
  sleepScore: number | null;
  bodyBatteryAtWakeup: number | null;
  bodyBatteryChange: number | null;
  restingHr: number | null;
}

const CHART_STYLE = {
  grid: "rgba(255,255,255,0.06)",
  axis: "#6b7280",
  tooltip: { background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 },
};

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-textPrimary">{title}</h2>
      {sub && <p className="text-xs text-textMuted mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="h-40 flex items-center justify-center text-sm text-textMuted">
      {message}
    </div>
  );
}

async function loadGarminData(): Promise<GarminDay[]> {
  const r = await fetch("/api/garmin/data");
  return r.json();
}

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const d = new Date();
  for (let i = n; i >= 1; i--) {
    const day = new Date(d);
    day.setDate(d.getDate() - i);
    days.push(day.toISOString().split("T")[0]);
  }
  return days;
}

type WeightGoal =
  | { type: "target-date"; targetDate: string; targetWeight: number }
  | { type: "rate"; rateKgPerWeek: number };

function computeGoalLine(
  logs: WeightLog[],
  goal: WeightGoal
): { date: string; goal: number }[] {
  if (logs.length === 0) return [];
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date + "T00:00:00");
  const latestWeight = latest.weightKg;
  const startDate = new Date(sorted[0].date + "T00:00:00");

  const result: { date: string; goal: number }[] = [];

  if (goal.type === "target-date") {
    const endDate = new Date(goal.targetDate + "T00:00:00");
    const totalMs = endDate.getTime() - latestDate.getTime();
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const d = cur.toISOString().split("T")[0];
      const fromLatest = cur.getTime() - latestDate.getTime();
      const frac = totalMs > 0 ? fromLatest / totalMs : 0;
      const w = latestWeight + (goal.targetWeight - latestWeight) * frac;
      result.push({ date: d, goal: Math.round(w * 10) / 10 });
      cur.setDate(cur.getDate() + 1);
    }
  } else {
    const ratePerDay = goal.rateKgPerWeek / 7;
    const end = new Date();
    end.setDate(end.getDate() + 60);
    const cur = new Date(startDate);
    while (cur <= end) {
      const d = cur.toISOString().split("T")[0];
      const daysFromLatest = (cur.getTime() - latestDate.getTime()) / 86400000;
      const w = latestWeight + ratePerDay * daysFromLatest;
      result.push({ date: d, goal: Math.round(w * 10) / 10 });
      cur.setDate(cur.getDate() + 1);
    }
  }
  return result;
}

export default function StatsPage() {
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [garminData, setGarminData] = useState<GarminDay[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "done" | "error" | "no-creds">("idle");
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [missingDays, setMissingDays] = useState<string[]>([]);
  const [backfilling, setBackfilling] = useState(false);

  // Weight goal
  const [weightGoal, setWeightGoal] = useState<WeightGoal | null>(null);
  const [goalType, setGoalType] = useState<"target-date" | "rate">("target-date");
  const [goalTargetDate, setGoalTargetDate] = useState("");
  const [goalTargetWeight, setGoalTargetWeight] = useState("");
  const [goalRate, setGoalRate] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);

  useEffect(() => {
    // Load saved weight goal
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
        }
      }
    } catch {}

    fetch("/api/weight-logs").then(r => r.json()).then(setWeightLogs).catch(() => {});
    loadGarminData().then((data) => {
      setGarminData(data);
      if (data.length > 0) setLastSynced(data[0].date);
    }).catch(() => {});

    setSyncStatus("syncing");
    fetch("/api/garmin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      .then(r => r.json())
      .then((result) => {
        if (result.error === "GARMIN_EMAIL and GARMIN_PASSWORD not configured") {
          setSyncStatus("no-creds");
        } else if (result.error) {
          setSyncStatus("error");
        } else {
          setSyncStatus("done");
          if (Array.isArray(result.missingDays)) setMissingDays(result.missingDays);
          if (!result.cached) {
            loadGarminData().then((data) => {
              setGarminData(data);
              if (data.length > 0) setLastSynced(data[0].date);
            }).catch(() => {});
          }
        }
      })
      .catch(() => setSyncStatus("error"));
  }, []);

  async function handleBackfillDates(dates: string[]) {
    if (dates.length === 0 || backfilling) return;
    setBackfilling(true);
    try {
      const res = await fetch("/api/garmin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backfill: dates }),
      });
      const result = await res.json();
      if (result.ok) {
        setMissingDays([]);
        const data = await loadGarminData();
        setGarminData(data);
        if (data.length > 0) setLastSynced(data[0].date);
      }
    } catch {}
    setBackfilling(false);
  }

  const isFirstRun = syncStatus === "done" && garminData.length === 0;

  function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    let goal: WeightGoal | null = null;
    if (goalType === "target-date") {
      if (!goalTargetDate || !goalTargetWeight) return;
      goal = { type: "target-date", targetDate: goalTargetDate, targetWeight: parseFloat(goalTargetWeight) };
    } else {
      if (!goalRate) return;
      goal = { type: "rate", rateKgPerWeek: parseFloat(goalRate) };
    }
    try { localStorage.setItem("weight_goal", JSON.stringify(goal)); } catch {}
    setWeightGoal(goal);
    setShowGoalForm(false);
  }

  // Merge weight logs + goal line for the chart
  const weightChartData = useMemo(() => {
    const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-60);
    const goalLine = weightGoal ? computeGoalLine(weightLogs, weightGoal) : [];
    const goalMap = new Map(goalLine.map(g => [g.date, g.goal]));

    const allDatesSet = new Set([
      ...sorted.map(w => w.date),
      ...(weightGoal ? goalLine.map(g => g.date) : []),
    ]);
    const allDates = Array.from(allDatesSet);

    return allDates
      .sort()
      .slice(-90) // show at most 90 days on chart
      .map(d => ({
        date: fmtDate(d),
        weight: sorted.find(w => w.date === d)?.weightKg ?? null,
        goal: goalMap.get(d) ?? null,
      }));
  }, [weightLogs, weightGoal]);

  const garminChartData = [...garminData]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map(d => ({
      date: fmtDate(d.date),
      steps: d.steps,
      sleepHours: d.sleepSeconds != null ? Math.round((d.sleepSeconds / 3600) * 10) / 10 : null,
      sleepScore: d.sleepScore,
      batteryWakeup: d.bodyBatteryAtWakeup,
      batteryChange: d.bodyBatteryChange,
      restingHr: d.restingHr,
    }));

  const garminConfigured = syncStatus !== "no-creds";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-textPrimary">Stats</h1>
        <p className="text-sm text-textMuted mt-1">Your health and activity over time</p>
      </div>

      {/* ── Weight ── */}
      <section className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-start justify-between mb-4">
          <SectionHeader
            title="Vekt"
            sub={weightLogs.length > 0 ? `${weightLogs.length} målinger logget` : undefined}
          />
          <button
            onClick={() => setShowGoalForm((v) => !v)}
            className="text-xs text-textMuted hover:text-accent transition-colors px-2 py-1 rounded border border-border hover:border-accent/50 shrink-0"
          >
            {weightGoal ? "Rediger mål" : "Sett mål"}
          </button>
        </div>

        {/* Goal form */}
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
              <div className="flex items-center gap-2">
                <input type="number" step="0.01" value={goalRate} onChange={(e) => setGoalRate(e.target.value)} placeholder="f.eks. -0.5" className="input-base text-sm w-28" required />
                <span className="text-sm text-textMuted">kg/uke (negativt = nedgang)</span>
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
          <EmptyChart message="Ingen vektmålinger ennå — logg vekten din under Morgen" />
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
      </section>

      {/* ── Garmin ── */}
      {!garminConfigured ? (
        <section className="bg-surface rounded-xl border border-border p-6">
          <SectionHeader title="Garmin" />
          <div className="py-6 text-center space-y-2">
            <p className="text-textMuted text-sm">Garmin er ikke konfigurert.</p>
            <p className="text-textMuted text-xs">Legg til <code className="bg-surfaceElevated px-1 py-0.5 rounded text-accent">GARMIN_EMAIL</code> og <code className="bg-surfaceElevated px-1 py-0.5 rounded text-accent">GARMIN_PASSWORD</code> i Vercel environment variables.</p>
          </div>
        </section>
      ) : (
        <>
          {/* Sync status bar */}
          <div className="flex items-center justify-between text-xs text-textMuted px-1">
            <span>
              {syncStatus === "syncing" && "Synkroniserer med Garmin…"}
              {syncStatus === "done" && lastSynced && `Sist hentet: ${fmtDate(lastSynced)}`}
              {syncStatus === "error" && "Garmin sync feilet — sjekk påloggingsdetaljer"}
            </span>
            <span className="text-textMuted/50">Henter data én gang per dag</span>
          </div>

          {/* First-run: no data at all */}
          {isFirstRun && (
            <div className="flex items-center justify-between gap-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-medium text-indigo-400">Ingen Garmin-data ennå</p>
                <p className="text-xs text-indigo-400/70 mt-0.5">Vil du hente de siste 30 dagene fra Garmin?</p>
              </div>
              <button
                onClick={() => handleBackfillDates(lastNDays(30))}
                disabled={backfilling}
                className="shrink-0 px-4 py-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {backfilling ? "Henter…" : "Hent siste 30 dager"}
              </button>
            </div>
          )}

          {/* Gap notification: missing days between existing records */}
          {!isFirstRun && missingDays.length > 0 && (
            <div className="flex items-center justify-between gap-4 bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4">
              <div>
                <p className="text-sm font-medium text-amber-400">
                  {missingDays.length} dag{missingDays.length !== 1 ? "er" : ""} mangler Garmin-data
                </p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  {fmtDate(missingDays[0])}
                  {missingDays.length > 1 && ` – ${fmtDate(missingDays[missingDays.length - 1])}`}
                </p>
              </div>
              <button
                onClick={() => handleBackfillDates(missingDays)}
                disabled={backfilling}
                className="shrink-0 px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {backfilling ? "Henter…" : "Hent manglende"}
              </button>
            </div>
          )}

          {/* Steps */}
          <section className="bg-surface rounded-xl border border-border p-6">
            <SectionHeader title="Skritt" sub="Siste 14 dager" />
            {garminChartData.filter(d => d.steps != null).length === 0 ? (
              <EmptyChart message="Ingen skrittdata ennå" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={garminChartData} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={45} />
                  <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#3DDBD2" }} formatter={(v) => [Number(v).toLocaleString("no-NO"), "Skritt"]} />
                  <ReferenceLine y={10000} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" label={{ value: "10k", position: "right", fill: "#6b7280", fontSize: 10 }} />
                  <Bar dataKey="steps" fill="#3DDBD2" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* Sleep */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-surface rounded-xl border border-border p-6">
              <SectionHeader title="Søvnlengde" sub="Timer per natt" />
              {garminChartData.filter(d => d.sleepHours != null).length === 0 ? (
                <EmptyChart message="Ingen søvndata ennå" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={garminChartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: CHART_STYLE.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#818CF8" }} formatter={(v) => [`${v}t`, "Søvn"]} />
                    <ReferenceLine y={8} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
                    <Bar dataKey="sleepHours" fill="#818CF8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="bg-surface rounded-xl border border-border p-6">
              <SectionHeader title="Søvnscore" sub="Garmin søvnkvalitet (0–100)" />
              {garminChartData.filter(d => d.sleepScore != null).length === 0 ? (
                <EmptyChart message="Ingen søvnscore ennå" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={garminChartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: CHART_STYLE.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#6EE7B7" }} formatter={(v) => [v, "Score"]} />
                    <Line type="monotone" dataKey="sleepScore" stroke="#6EE7B7" strokeWidth={2} dot={{ r: 3, fill: "#6EE7B7" }} activeDot={{ r: 5 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>

          {/* Body Battery + Resting HR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="bg-surface rounded-xl border border-border p-6">
              <SectionHeader title="Body Battery" sub="Nivå ved oppvåkning" />
              {garminChartData.filter(d => d.batteryWakeup != null).length === 0 ? (
                <EmptyChart message="Ingen body battery-data ennå" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={garminChartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: CHART_STYLE.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#34D399" }} formatter={(v) => [`${v}%`, "Battery"]} />
                    <Bar dataKey="batteryWakeup" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </section>

            <section className="bg-surface rounded-xl border border-border p-6">
              <SectionHeader title="Hvilepuls" sub="BPM per natt" />
              {garminChartData.filter(d => d.restingHr != null).length === 0 ? (
                <EmptyChart message="Ingen hvilepulsdata ennå" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={garminChartData} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={CHART_STYLE.grid} vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: CHART_STYLE.axis, fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis domain={["auto", "auto"]} tick={{ fill: CHART_STYLE.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={32} unit=" bpm" />
                    <Tooltip contentStyle={CHART_STYLE.tooltip} labelStyle={{ color: "#e5e7eb" }} itemStyle={{ color: "#F87171" }} formatter={(v) => [`${v} bpm`, "Hvilepuls"]} />
                    <Line type="monotone" dataKey="restingHr" stroke="#F87171" strokeWidth={2} dot={{ r: 3, fill: "#F87171" }} activeDot={{ r: 5 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
