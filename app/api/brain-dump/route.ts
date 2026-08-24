import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { BrainDumpItem } from "@/lib/db";

function rowToItem(r: Record<string, unknown>): BrainDumpItem {
  return {
    id: r.id as string,
    text: r.text as string,
    notes: r.notes as string | null,
    createdAt: r.created_at as string,
  };
}

export async function GET() {
  const rows = await sql`SELECT * FROM brain_dump_items ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToItem));
}

export async function POST(req: Request) {
  const item = (await req.json()) as BrainDumpItem;
  await sql`
    INSERT INTO brain_dump_items (id, text, notes, created_at)
    VALUES (${item.id}, ${item.text}, ${item.notes}, ${item.createdAt})
  `;
  return NextResponse.json(item, { status: 201 });
}
