import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export const dynamic = "force-dynamic";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS economy_categories (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `;
}

export async function GET() {
  await ensureTable();
  const rows = await sql`SELECT * FROM economy_categories ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(r => ({
    id: r.id as string,
    name: r.name as string,
    color: r.color as string,
    createdAt: r.created_at as string,
  })));
}

export async function POST(req: Request) {
  await ensureTable();
  const { id, name, color } = await req.json() as { id: string; name: string; color: string };
  await sql`
    INSERT INTO economy_categories (id, name, color, created_at)
    VALUES (${id}, ${name}, ${color}, ${new Date().toISOString()})
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await sql`DELETE FROM economy_categories WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
