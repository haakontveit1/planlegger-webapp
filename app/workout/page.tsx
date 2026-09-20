"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiftSession {
  id: string;
  date: string;
  workoutName: string;
  exercise: string;
  bestWeight: number;
  bestReps: number;
  estimated1rm: number;
}

type WeightGoal =
  | { type: "target-date"; targetDate: string; targetWeight: number }
  | { type: "rate"; rateKgPerWeek: number; startDate: string; startWeight: number };

// ── Config ────────────────────────────────────────────────────────────────────

const WORKOUT_NAMES = new Set(["Pull lett", "Push lett", "Pull tung", "Push tung"]);

const LIFTS = [
  { key: "squat",    label: "Knebøy",    goal: 180, color: "#F59E0B" },
  { key: "bench",    label: "Benkpress", goal: 140, color: "#60A5FA" },
  { key: "deadlift", label: "Markløft",  goal: 220, color: "#34D399" },
] as const;

const CS = {
  grid:    "rgba(255,255,255,0.05)",
  axis:    "#6B7280",
  tooltip: { background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 },
};

// ── Pure helpers ──────────────────────────────────────────────────────────────

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let inQ = false, cur = "";
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

const MONTHS: Record<string, string> = {
  Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
  Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
};

function parseHevyDate(s: string): string {
  const m = s.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/);
  if (!m) return "";
  return `${m[3]}-${MONTHS[m[2]] ?? "01"}-${m[1].padStart(2, "0")}`;
}

function localStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("no-NO", { day: "numeric", month: "short" });
}

function epley(w: number, r: number): number {
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

function linReg(pts: { x: number; y: number }[]): { slope: number; intercept: number } {
  const n = pts.length;
  if (n < 2) return { slope: 0, intercept: pts[0]?.y ?? 0 };
  const sx  = pts.reduce((a, p) => a + p.x, 0);
  const sy  = pts.reduce((a, p) => a + p.y, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { slope, intercept: (sy - slope * sx) / n };
}

// ── CSV → LiftSession[] ───────────────────────────────────────────────────────

function extractSessions(csvText: string): LiftSession[] {
  const rows = parseCSV(csvText);
  if (rows.length < 2) return [];

  const hdrs = rows[0].map(h => h.toLowerCase().replace(/\s+/g, "_").replace(/[()]/g, ""));
  const col  = (name: string) => hdrs.indexOf(name);

  const iTitle = col("title");
  const iStart = col("start_time");
  const iEx    = col("exercise_title");
  const iType  = col("set_type");
  const iWkg   = col("weight_kg");
  const iWlbs  = col("weight_lbs");
  const iReps  = col("reps");

  // Group rows into workouts
  const wMap = new Map<string, { title: string; date: string; rows: string[][] }>();
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const title = r[iTitle]?.trim();
    const start = r[iStart]?.trim();
    if (!title || !start) continue;
    const key = `${title}|||${start}`;
    if (!wMap.has(key)) wMap.set(key, { title, date: parseHevyDate(start), rows: [] });
    wMap.get(key)!.rows.push(r);
  }

  // Sort newest first, stop at first unknown workout name
  const workouts = Array.from(wMap.values()).sort((a, b) => b.date.localeCompare(a.date));
  const sessions: LiftSession[] = [];

  for (const w of workouts) {
    if (!WORKOUT_NAMES.has(w.title)) break;

    const best = new Map<string, { w: number; r: number; orm: number }>();

    for (const row of w.rows) {
      if (row[iType]?.toLowerCase().trim() !== "normal") continue;

      const rawKg = iWkg >= 0
        ? parseFloat(row[iWkg])
        : iWlbs >= 0 ? parseFloat(row[iWlbs]) / 2.2046 : NaN;
      const reps = parseInt(row[iReps]);
      if (isNaN(rawKg) || isNaN(reps) || rawKg <= 0 || reps <= 0) continue;

      const exName = row[iEx]?.trim().toLowerCase() ?? "";
      let exKey: string | null = null;
      if      (exName.includes("squat") && !exName.includes("goblet")) exKey = "squat";
      else if (exName.includes("bench") && (exName.includes("barbell") || exName.includes("press"))) exKey = "bench";
      else if (exName.includes("deadlift")) exKey = "deadlift";
      if (!exKey) continue;

      const orm = epley(rawKg, reps);
      const prev = best.get(exKey);
      if (!prev || orm > prev.orm) best.set(exKey, { w: rawKg, r: reps, orm });
    }

    Array.from(best.entries()).forEach(([ex, b]) => {
      sessions.push({
        id: `${w.date}-${w.title.replace(/\s+/g, "-")}-${ex}`,
        date: w.date,
        workoutName: w.title,
        exercise: ex,
        bestWeight: b.w,
        bestReps: b.r,
        estimated1rm: b.orm,
      });
    });
  }

  return sessions;
}

// ── Chart computation ─────────────────────────────────────────────────────────

interface ChartResult {
  points: { date: string; actual: number | null; proj: number | null }[];
  projectedDate: Date | null;
  latestOrm: number | null;
}

function buildChart(sessions: LiftSession[], ex: string, repType: "low" | "high", goal: number): ChartResult {
  const kw = repType === "low" ? "tung" : "lett";
  const filtered = sessions
    .filter(s => s.exercise === ex && s.workoutName.toLowerCase().includes(kw))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) return { points: [], projectedDate: null, latestOrm: null };

  const t0 = new Date(filtered[0].date + "T00:00:00").getTime();
  const regPts = filtered.map(s => ({
    x: (new Date(s.date + "T00:00:00").getTime() - t0) / 86400000,
    y: s.estimated1rm,
  }));

  const { slope, intercept } = linReg(regPts);
  const lastX = regPts[regPts.length - 1].x;
  let projectedDate: Date | null = null;

  if (slope > 0.01) {
    const dx = (goal - intercept) / slope;
    if (dx > lastX && dx - lastX < 5 * 365) {
      projectedDate = new Date(t0 + dx * 86400000);
    }
  }

  const points: { date: string; actual: number | null; proj: number | null }[] =
    filtered.map((s, i) => ({
      date:   fmtDate(s.date),
      actual: s.estimated1rm as number | null,
      proj:   (i === filtered.length - 1 && projectedDate ? s.estimated1rm : null) as number | null,
    }));

  if (projectedDate && filtered.length >= 2) {
    const lastDate = new Date(filtered[filtered.length - 1].date + "T00:00:00");
    const endDate  = new Date(projectedDate);
    endDate.setDate(endDate.getDate() + 14);
    const cur = new Date(lastDate);
    cur.setDate(cur.getDate() + 7);
    while (cur <= endDate) {
      const dx = (cur.getTime() - t0) / 86400000;
      const v  = Math.round((slope * dx + intercept) * 10) / 10;
      points.push({ date: fmtDate(localStr(cur)), actual: null, proj: Math.min(v, goal * 1.05) });
      cur.setDate(cur.getDate() + 7);
    }
  }

  return { points, projectedDate, latestOrm: filtered[filtered.length - 1].estimated1rm };
}

function projBodyWeight(wg: WeightGoal | null, target: Date, curWeight: number | null): number | null {
  if (!wg) return null;
  if (wg.type === "rate") {
    const days = (target.getTime() - new Date(wg.startDate + "T00:00:00").getTime()) / 86400000;
    return Math.round((wg.startWeight + (wg.rateKgPerWeek / 7) * days) * 10) / 10;
  }
  if (!curWeight) return null;
  const now = Date.now();
  const end = new Date(wg.targetDate + "T00:00:00").getTime();
  if (end <= now) return wg.targetWeight;
  const frac = Math.min(1, Math.max(0, (target.getTime() - now) / (end - now)));
  return Math.round((curWeight + (wg.targetWeight - curWeight) * frac) * 10) / 10;
}

// ── Page ──────────────────────────────────────────────────────────────────────

function EmptyChart({ msg }: { msg: string }) {
  return (
    <div className="h-40 flex items-center justify-center rounded-lg bg-background border border-border">
      <p className="text-xs text-textMuted">{msg}</p>
    </div>
  );
}

export default function WorkoutPage() {
  const [sessions,    setSessions]    = useState<LiftSession[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [importing,   setImporting]   = useState(false);
  const [importMsg,   setImportMsg]   = useState<string | null>(null);
  const [weightGoal,  setWeightGoal]  = useState<WeightGoal | null>(null);
  const [curWeight,   setCurWeight]   = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/lifts").then(r => r.json()).then(setSessions).catch(() => {}).finally(() => setLoading(false));
    try { const g = localStorage.getItem("weight_goal"); if (g) setWeightGoal(JSON.parse(g)); } catch {}
    fetch("/api/weight-logs")
      .then(r => r.json())
      .then((logs: { date: string; weightKg: number }[]) => { if (logs.length > 0) setCurWeight(logs[0].weightKg); })
      .catch(() => {});
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const text    = await file.text();
      const parsed  = extractSessions(text);
      if (parsed.length === 0) { setImportMsg("Ingen data funnet — sjekk at filen er fra Hevy."); return; }
      await fetch("/api/lifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const updated: LiftSession[] = await fetch("/api/lifts").then(r => r.json());
      setSessions(updated);
      const wkts = new Set(parsed.map(s => s.date + s.workoutName)).size;
      setImportMsg(`${wkts} treningsøkter importert (${parsed.length} løft)`);
    } catch {
      setImportMsg("Feil ved import. Prøv igjen.");
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const charts = useMemo(() =>
    LIFTS.map(lift => ({
      ...lift,
      low:  buildChart(sessions, lift.key, "low",  lift.goal),
      high: buildChart(sessions, lift.key, "high", lift.goal),
    })),
  [sessions]);

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-10 space-y-10">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-textPrimary">Treningsstyrke</h1>
          <p className="text-sm text-textMuted mt-1">Estimert 1RM for SBD — Epley-formel</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-4 py-2 rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors text-sm font-semibold disabled:opacity-50"
          >
            {importing ? "Importerer…" : "Importer Hevy CSV"}
          </button>
          {importMsg && <p className="text-xs text-textMuted">{importMsg}</p>}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-textMuted">Laster…</p>
      ) : (
        charts.map(lift => (
          <section key={lift.key} className="bg-surface rounded-xl border border-border p-6">

            {/* Section header */}
            <div className="flex items-center gap-3 mb-5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: lift.color }} />
              <h2 className="text-lg font-bold text-textPrimary">{lift.label}</h2>
              <span className="text-xs text-textMuted ml-auto">Mål: {lift.goal} kg 1RM</span>
            </div>

            {/* Two charts side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(["low", "high"] as const).map(rep => {
                const result = rep === "low" ? lift.low : lift.high;
                const { points, projectedDate, latestOrm } = result;
                const label    = rep === "low" ? "Tung (3–4 reps)" : "Lett (6–8 reps)";
                const progress = latestOrm != null ? Math.round((latestOrm / lift.goal) * 100) : null;
                const bw       = projectedDate ? projBodyWeight(weightGoal, projectedDate, curWeight) : null;

                return (
                  <div key={rep} className="space-y-3">

                    {/* Sub-header */}
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-textSecondary">{label}</p>
                      {latestOrm != null && (
                        <p className="text-sm font-bold" style={{ color: lift.color }}>
                          ~{latestOrm} kg
                          {progress != null && (
                            <span className="text-xs text-textMuted font-normal ml-1.5">({progress}% av mål)</span>
                          )}
                        </p>
                      )}
                    </div>

                    {points.length === 0 ? (
                      <EmptyChart msg={`Ingen ${label.toLowerCase()} data ennå`} />
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={points} margin={{ left: -8, right: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={CS.grid} vertical={false} />
                          <XAxis dataKey="date" tick={{ fill: CS.axis, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                          <YAxis
                            domain={["auto", (max: number) => Math.max(Math.ceil(max * 1.04), lift.goal + 5)]}
                            tick={{ fill: CS.axis, fontSize: 10 }} tickLine={false} axisLine={false} width={40} unit="kg"
                          />
                          <Tooltip
                            contentStyle={CS.tooltip}
                            labelStyle={{ color: "#e5e7eb" }}
                            formatter={(v, name) => [`${v} kg`, name === "actual" ? "1RM (estimert)" : "Projeksjon"]}
                          />
                          <ReferenceLine y={lift.goal} stroke={lift.color} strokeDasharray="4 4" strokeOpacity={0.35} />
                          <Line type="monotone" dataKey="actual" stroke={lift.color} strokeWidth={2} dot={{ r: 3, fill: lift.color }} activeDot={{ r: 5 }} connectNulls />
                          <Line type="monotone" dataKey="proj"   stroke={lift.color} strokeWidth={1.5} strokeDasharray="5 5" dot={false} connectNulls opacity={0.55} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}

                    {/* Projection info */}
                    {projectedDate ? (
                      <div className="text-xs text-textMuted space-y-0.5">
                        <p>
                          Estimert {lift.goal} kg:{" "}
                          <span className="text-textSecondary font-medium">
                            {projectedDate.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </p>
                        {bw != null && (
                          <p>Forventet kroppsvekt:{" "}
                            <span className="text-textSecondary font-medium">{bw} kg</span>
                          </p>
                        )}
                      </div>
                    ) : points.length >= 2 ? (
                      <p className="text-xs text-textMuted">Ikke nok fremgang for projeksjon ennå</p>
                    ) : null}

                  </div>
                );
              })}
            </div>

          </section>
        ))
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-16 text-textMuted space-y-2">
          <p className="text-base font-medium">Ingen treningsdata ennå</p>
          <p className="text-sm">Eksporter fra Hevy: Profil → Innstillinger → Export &amp; Import Data → Export Workouts</p>
        </div>
      )}

    </div>
  );
}
