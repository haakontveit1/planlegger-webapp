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

function SectionHeader({ title, sub, avg }: { title: string; sub?: string; avg?: string }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-textPrimary">{title}</h2>
        {sub && <p className="text-xs text-textMuted mt-0.5">{sub}</p>}
      </div>
      {avg && (
        <div className="text-right shrink-0 ml-4">
          <p className="text-xs text-textMuted">snitt</p>
          <p className="text-base font-bold text-textPrimary">{avg}</p>
        </div>
      )}
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
  | { type: "rate"; rateKgPerWeek: number; startDate: string; startWeight: number };

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

function numAvg(vals: (number | null)[]): number | null {
  const v = vals.filter(x => x != null) as number[];
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null;
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
  const [goalPeriod, setGoalPeriod] = useState<"week" | "month">("week");
  const [goalStartDate, setGoalStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [goalStartWeight, setGoalStartWeight] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Garmin range
  const [garminRange, setGarminRange] = useState<7 | 14 | 30 | 60>(14);

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
          setGoalStartDate(parsed.startDate);
          setGoalStartWeight(String(parsed.startWeight));
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
      if (!goalRate || !goalStartDate || !goalStartWeight) return;
      const rateVal = parseFloat(goalRate);
      // Convert to kg/week regardless of chosen period
      const rateKgPerWeek = goalPeriod === "month" ? rateVal / 4.33 : rateVal;
      goal = { type: "rate", rateKgPerWeek, startDate: goalStartDate, startWeight: parseFloat(goalStartWeight) };
    }
    try { localStorage.setItem("weight_goal", JSON.stringify(goal)); } catch {}
    setWeightGoal(goal);
    setShowGoalForm(false);
  }

  // Chart is driven entirely by logged dates — goal line is just an overlay
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

  const garminChartData = [...garminData]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-garminRange)
    .map(d => ({
      date: fmtDate(d.date),
      steps: d.steps,
      sleepHours: d.sleepSeconds != null ? Math.round((d.sleepSeconds / 3600) * 10) / 10 : null,
      sleepScore: d.sleepScore,
      batteryWakeup: d.bodyBatteryAtWakeup,
      batteryChange: d.bodyBatteryChange,
      restingHr: d.restingHr,
    }));

  const stepsAvg    = numAvg(garminChartData.map(d => d.steps));
  const sleepAvg    = numAvg(garminChartData.map(d => d.sleepHours));
  const scoreAvg    = numAvg(garminChartData.map(d => d.sleepScore));
  const batteryAvg  = numAvg(garminChartData.map(d => d.batteryWakeup));
  const hrAvg       = numAvg(garminChartData.map(d => d.restingHr));

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

        {/* Active goal summary — below chart */}
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
          {/* Sync status + range selector */}
          <div className="flex items-center justify-between gap-4 px-1">
            <span className="text-xs text-textMuted">
              {syncStatus === "syncing" && "Synkroniserer med Garmin…"}
              {syncStatus === "done" && lastSynced && `Sist hentet: ${fmtDate(lastSynced)}`}
              {syncStatus === "error" && "Garmin sync feilet — sjekk påloggingsdetaljer"}
            </span>
            <div className="flex items-center gap-1">
              {([7, 14, 30, 60] as const).map(n => (
                <button
                  key={n}
                  onClick={() => setGarminRange(n)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
                    garminRange === n
                      ? "bg-accent/20 text-accent font-semibold"
                      : "text-textMuted hover:text-textSecondary hover:bg-white/5"
                  }`}
                >
                  {n}d
                </button>
              ))}
            </div>
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
            <SectionHeader title="Skritt" sub={`Siste ${garminRange} dager`} avg={stepsAvg != null ? stepsAvg.toLocaleString("no-NO") : undefined} />
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
              <SectionHeader title="Søvnlengde" sub="Timer per natt" avg={sleepAvg != null ? `${sleepAvg}t` : undefined} />
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
              <SectionHeader title="Søvnscore" sub="Garmin søvnkvalitet (0–100)" avg={scoreAvg != null ? String(scoreAvg) : undefined} />
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
              <SectionHeader title="Body Battery" sub="Nivå ved oppvåkning" avg={batteryAvg != null ? `${batteryAvg}%` : undefined} />
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
              <SectionHeader title="Hvilepuls" sub="BPM per natt" avg={hrAvg != null ? `${hrAvg} bpm` : undefined} />
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
