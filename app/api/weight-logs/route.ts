import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS weight_logs (
      date TEXT PRIMARY KEY,
      weight_kg REAL NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
}

export async function GET() {
  await ensureTable();
  const rows = await sql`SELECT * FROM weight_logs ORDER BY date DESC`;
  return NextResponse.json(rows.map((r) => ({
    date: r.date as string,
    weightKg: r.weight_kg as number,
    createdAt: r.created_at as string,
  })));
}

export async function POST(req: Request) {
  await ensureTable();
  const { date, weightKg } = await req.json() as { date: string; weightKg: number };
  await sql`
    INSERT INTO weight_logs (date, weight_kg, created_at)
    VALUES (${date}, ${weightKg}, ${new Date().toISOString()})
    ON CONFLICT (date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
  `;
  return NextResponse.json({ ok: true });
}
