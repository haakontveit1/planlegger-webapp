import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

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

export async function POST() {
  await ensureTable();

  // Guard: only sync once per calendar day
  const today = dateStr(new Date());
  const [{ last_sync }] = await sql`SELECT MAX(synced_at) as last_sync FROM garmin_daily` as any[];
  if (last_sync && (last_sync as string).startsWith(today)) {
    return NextResponse.json({ ok: true, cached: true });
  }

  if (!process.env.GARMIN_EMAIL || !process.env.GARMIN_PASSWORD) {
    return NextResponse.json({ error: "GARMIN_EMAIL and GARMIN_PASSWORD not configured" }, { status: 503 });
  }

  // Target: yesterday's complete data
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const target = dateStr(yesterday);

  let steps: number | null = null;
  let sleepSeconds: number | null = null;
  let sleepScore: number | null = null;
  let bodyBatteryAtWakeup: number | null = null;
  let bodyBatteryChange: number | null = null;
  let restingHr: number | null = null;

  try {
    const { GarminConnect } = await import("garmin-connect");
    const client = new GarminConnect({
      username: process.env.GARMIN_EMAIL,
      password: process.env.GARMIN_PASSWORD,
    });
    await client.login();

    try { steps = await client.getSteps(yesterday); } catch {}

    try {
      const sleep = await client.getSleepData(yesterday);
      sleepSeconds = sleep.dailySleepDTO?.sleepTimeSeconds ?? null;
      sleepScore = sleep.dailySleepDTO?.sleepScores?.overall?.value ?? null;
      restingHr = (sleep as any).restingHeartRate ?? null;
      bodyBatteryChange = (sleep as any).bodyBatteryChange ?? null;
      const bb = (sleep as any).sleepBodyBattery;
      if (Array.isArray(bb) && bb.length > 0) {
        bodyBatteryAtWakeup = bb[bb.length - 1].value ?? null;
      }
    } catch {}
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

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

  return NextResponse.json({ ok: true, date: target });
}
