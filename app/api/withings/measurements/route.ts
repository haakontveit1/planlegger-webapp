import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS withings_measurements (
        date  TEXT    NOT NULL,
        type  INTEGER NOT NULL,
        value REAL    NOT NULL,
        PRIMARY KEY (date, type)
      )
    `;
    const rows = await sql`SELECT date, type, value FROM withings_measurements ORDER BY date ASC`;
    const data = rows.map(r => ({
      date:  r.date  as string,
      type:  r.type  as number,
      value: r.value as number,
    }));
    return NextResponse.json(
      { rows: data, _debug: { count: data.length, latest: data[data.length - 1]?.date ?? null, ts: new Date().toISOString() } },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (e) {
    return NextResponse.json({ rows: [], _debug: { error: String(e) } }, { status: 500 });
  }
}
