import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS economy_income (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      amount_per_month REAL NOT NULL,
      type             TEXT NOT NULL DEFAULT 'income',
      created_at       TEXT NOT NULL
    )
  `;
}

export async function GET() {
  await ensureTable();
  const rows = await sql`SELECT * FROM economy_income ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    amountPerMonth: r.amount_per_month as number,
    type: r.type as "income" | "savings",
    createdAt: r.created_at as string,
  })));
}

export async function POST(req: Request) {
  await ensureTable();
  const { id, name, amountPerMonth, type } = await req.json() as {
    id: string; name: string; amountPerMonth: number; type: "income" | "savings";
  };
  await sql`
    INSERT INTO economy_income (id, name, amount_per_month, type, created_at)
    VALUES (${id}, ${name}, ${amountPerMonth}, ${type}, ${new Date().toISOString()})
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await sql`DELETE FROM economy_income WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
