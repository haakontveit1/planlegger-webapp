import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS economy_expenses (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      amount_per_month REAL NOT NULL,
      category_id      TEXT,
      created_at       TEXT NOT NULL
    )
  `;
}

export async function GET() {
  await ensureTable();
  const rows = await sql`SELECT * FROM economy_expenses ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    amountPerMonth: r.amount_per_month as number,
    categoryId: r.category_id as string | null,
    createdAt: r.created_at as string,
  })));
}

export async function POST(req: Request) {
  await ensureTable();
  const { id, name, amountPerMonth, categoryId } = await req.json() as {
    id: string; name: string; amountPerMonth: number; categoryId: string | null;
  };
  await sql`
    INSERT INTO economy_expenses (id, name, amount_per_month, category_id, created_at)
    VALUES (${id}, ${name}, ${amountPerMonth}, ${categoryId ?? null}, ${new Date().toISOString()})
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await sql`DELETE FROM economy_expenses WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
