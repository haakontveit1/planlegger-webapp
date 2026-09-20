import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

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
    return NextResponse.json(rows.map(r => ({
      date:  r.date  as string,
      type:  r.type  as number,
      value: r.value as number,
    })));
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
