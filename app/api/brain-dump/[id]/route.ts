import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { notes } = await req.json();
  await sql`UPDATE brain_dump_items SET notes = ${notes} WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM brain_dump_items WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
