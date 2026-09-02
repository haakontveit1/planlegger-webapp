import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET() {
  try {
    const rows = await sql`
      SELECT * FROM garmin_daily ORDER BY date DESC LIMIT 60
    `;
    return NextResponse.json(rows.map((r) => ({
      date: r.date as string,
      steps: r.steps as number | null,
      sleepSeconds: r.sleep_seconds as number | null,
      sleepScore: r.sleep_score as number | null,
      bodyBatteryAtWakeup: r.body_battery_at_wakeup as number | null,
      bodyBatteryChange: r.body_battery_change as number | null,
      restingHr: r.resting_hr as number | null,
      syncedAt: r.synced_at as string,
    })));
  } catch {
    return NextResponse.json([]);
  }
}
