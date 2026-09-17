import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const maxDuration = 30;

export async function GET() {
  if (!process.env.GARMIN_EMAIL || !process.env.GARMIN_PASSWORD) {
    return NextResponse.json({ error: "Garmin credentials not set" }, { status: 503 });
  }

  // Show what's actually stored in the DB
  let stored: unknown[] = [];
  try {
    stored = await sql`SELECT * FROM garmin_daily ORDER BY date DESC LIMIT 5`;
  } catch (e) {
    return NextResponse.json({ dbError: String(e) });
  }

  // Try fetching raw data from Garmin for yesterday
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const dateStr = yest.toISOString().split("T")[0];

  let stepsRaw: unknown = null;
  let stepsError: string | null = null;
  let sleepRaw: unknown = null;
  let sleepError: string | null = null;

  try {
    const { GarminConnect } = await import("garmin-connect");
    const client = new GarminConnect({
      username: process.env.GARMIN_EMAIL,
      password: process.env.GARMIN_PASSWORD,
    });
    await client.login();

    try { stepsRaw = await client.getSteps(yest); } catch (e) { stepsError = String(e); }
    try { sleepRaw = await client.getSleepData(yest); } catch (e) { sleepError = String(e); }
  } catch (e) {
    return NextResponse.json({ loginError: String(e), stored });
  }

  return NextResponse.json({
    date: dateStr,
    stored,
    stepsRaw,
    stepsError,
    sleepRaw,
    sleepError,
  });
}
