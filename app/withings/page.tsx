"use client";
import { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts";

type Row = { date: string; type: number; value: number };

const METRICS = [
  { type: 1,  label: "Vekt",         unit: "kg",  color: "#7B72FF", decimals: 1 },
  { type: 6,  label: "Fettprosent",  unit: "%",   color: "#F59E0B", decimals: 1 },
  { type: 5,  label: "Mager masse",  unit: "kg",  color: "#34D399", decimals: 1 },
  { type: 8,  label: "Fettmasse",    unit: "kg",  color: "#F87171", decimals: 1 },
  { type: 76, label: "Muskelmasse",  unit: "kg",  color: "#60A5FA", decimals: 1 },
  { type: 77, label: "Hydrering",    unit: "kg",  color: "#38BDF8", decimals: 1 },
  { type: 88, label: "Benmasse",     unit: "kg",  color: "#A78BFA", decimals: 2 },
] as const;

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("no-NO", { day: "numeric", month: "short" });
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
          <span className="text-xl font-bold text-textPrimary">
            {latest.toFixed(decimals)}
          </span>
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
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--color-textMuted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--color-textMuted)" }}
            tickLine={false}
            axisLine={false}
            domain={[minVal - pad, maxVal + pad]}
            tickFormatter={(v: number) => v.toFixed(decimals)}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-surfaceElevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => [`${v.toFixed(decimals)} ${unit}`, label]}
            labelStyle={{ color: "var(--color-textMuted)" }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={data.length <= 30 ? { r: 3, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function WithingsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/withings/measurements")
      .then(r => r.json())
      .then((data: Row[]) => { setRows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-textPrimary">Withings</h1>
        <p className="text-sm text-textMuted mt-1">Kroppsmålinger fra smart-vekten</p>
      </div>

      {loading && (
        <p className="text-textMuted text-sm">Laster målinger…</p>
      )}

      {!loading && !hasAny && (
        <div className="bg-surface rounded-xl border border-border p-8 text-center">
          <p className="text-textMuted text-sm">Ingen målinger ennå.</p>
          <p className="text-textMuted text-xs mt-1">
            Trett på vekten, så synkroniseres dataene automatisk.
          </p>
        </div>
      )}

      {!loading && hasAny && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {METRICS.map(m => {
            const data = byType.get(m.type) ?? [];
            return (
              <MetricChart
                key={m.type}
                label={m.label}
                unit={m.unit}
                color={m.color}
                decimals={m.decimals}
                data={data}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
