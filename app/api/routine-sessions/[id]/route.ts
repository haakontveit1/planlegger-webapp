import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { status, completedAt } = await req.json();
  await sql`UPDATE routine_sessions SET status = ${status}, completed_at = ${completedAt} WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM routine_sessions WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
