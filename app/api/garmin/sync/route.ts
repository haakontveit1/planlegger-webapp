import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const maxDuration = 60;

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS garmin_daily (
      date TEXT PRIMARY KEY,
      steps INTEGER,
      sleep_seconds INTEGER,
      sleep_score INTEGER,
      body_battery_at_wakeup INTEGER,
      body_battery_change INTEGER,
      resting_hr INTEGER,
      synced_at TEXT NOT NULL
    )
  `;
}

function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

async function getMissingDays(): Promise<string[]> {
  const rows = await sql`SELECT date FROM garmin_daily ORDER BY date ASC`;
  if (rows.length === 0) return [];

  const stored = new Set(rows.map((r) => r.date as string));
  const oldest = rows[0].date as string;
  const yest = dateStr(yesterday());

  const missing: string[] = [];
  const cur = new Date(oldest + "T12:00:00Z");
  const end = new Date(yest + "T12:00:00Z");
  while (cur <= end) {
    const d = dateStr(cur);
    if (!stored.has(d)) missing.push(d);
    cur.setDate(cur.getDate() + 1);
  }
  return missing;
}

async function fetchDayFromGarmin(client: any, date: Date, target: string) {
  let steps: number | null = null;
  let sleepSeconds: number | null = null;
  let sleepScore: number | null = null;
  let bodyBatteryAtWakeup: number | null = null;
  let bodyBatteryChange: number | null = null;
  let restingHr: number | null = null;

  try { steps = await client.getSteps(date); } catch {}
  try {
    const sleep = await client.getSleepData(date);
    sleepSeconds = sleep.dailySleepDTO?.sleepTimeSeconds ?? null;
    sleepScore = sleep.dailySleepDTO?.sleepScores?.overall?.value ?? null;
    restingHr = (sleep as any).restingHeartRate ?? null;
    bodyBatteryChange = (sleep as any).bodyBatteryChange ?? null;
    const bb = (sleep as any).sleepBodyBattery;
    if (Array.isArray(bb) && bb.length > 0) bodyBatteryAtWakeup = bb[bb.length - 1].value ?? null;
  } catch {}

  await sql`
    INSERT INTO garmin_daily
      (date, steps, sleep_seconds, sleep_score, body_battery_at_wakeup, body_battery_change, resting_hr, synced_at)
    VALUES
      (${target}, ${steps}, ${sleepSeconds}, ${sleepScore}, ${bodyBatteryAtWakeup}, ${bodyBatteryChange}, ${restingHr}, ${new Date().toISOString()})
    ON CONFLICT (date) DO UPDATE SET
      steps = EXCLUDED.steps,
      sleep_seconds = EXCLUDED.sleep_seconds,
      sleep_score = EXCLUDED.sleep_score,
      body_battery_at_wakeup = EXCLUDED.body_battery_at_wakeup,
      body_battery_change = EXCLUDED.body_battery_change,
      resting_hr = EXCLUDED.resting_hr,
      synced_at = EXCLUDED.synced_at
  `;
}

export async function POST(req: Request) {
  await ensureTable();

  if (!process.env.GARMIN_EMAIL || !process.env.GARMIN_PASSWORD) {
    return NextResponse.json({ error: "GARMIN_EMAIL and GARMIN_PASSWORD not configured" }, { status: 503 });
  }

  const body = await req.json().catch(() => ({})) as { backfill?: string[] };

  // ── Backfill mode: fetch specific missing dates ──
  if (body.backfill && body.backfill.length > 0) {
    const dates = body.backfill.slice(0, 60); // hard cap — never more than 60 calls
    try {
      const { GarminConnect } = await import("garmin-connect");
      const client = new GarminConnect({ username: process.env.GARMIN_EMAIL, password: process.env.GARMIN_PASSWORD });
      await client.login();
      for (const d of dates) {
        const date = new Date(d + "T12:00:00Z");
        await fetchDayFromGarmin(client, date, d);
      }
      return NextResponse.json({ ok: true, backfilled: dates.length });
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 500 });
    }
  }

  // ── Regular daily sync: yesterday's data ──
  const today = dateStr(new Date());
  const [{ last_sync }] = await sql`SELECT MAX(synced_at) as last_sync FROM garmin_daily` as any[];
  if (last_sync && (last_sync as string).startsWith(today)) {
    const missingDays = await getMissingDays();
    return NextResponse.json({ ok: true, cached: true, missingDays });
  }

  const yest = yesterday();
  const target = dateStr(yest);

  try {
    const { GarminConnect } = await import("garmin-connect");
    const client = new GarminConnect({ username: process.env.GARMIN_EMAIL, password: process.env.GARMIN_PASSWORD });
    await client.login();
    await fetchDayFromGarmin(client, yest, target);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  const missingDays = await getMissingDays();
  return NextResponse.json({ ok: true, date: target, missingDays });
}
