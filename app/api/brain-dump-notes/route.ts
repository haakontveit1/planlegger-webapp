import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { BrainDumpNote } from "@/lib/db";

function rowToNote(r: Record<string, unknown>): BrainDumpNote {
  return {
    id: r.id as string,
    brainDumpItemId: r.brain_dump_item_id as string,
    text: r.text as string,
    createdAt: r.created_at as string,
  };
}

export async function GET() {
  const rows = await sql`SELECT * FROM brain_dump_notes ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToNote));
}

export async function POST(req: Request) {
  const note = (await req.json()) as BrainDumpNote;
  await sql`
    INSERT INTO brain_dump_notes (id, brain_dump_item_id, text, created_at)
    VALUES (${note.id}, ${note.brainDumpItemId}, ${note.text}, ${note.createdAt})
  `;
  return NextResponse.json(note, { status: 201 });
}
