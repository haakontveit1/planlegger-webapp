import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { now } from "@/lib/utils";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ts = now();
  await sql`UPDATE tasks SET project_id = NULL, updated_at = ${ts} WHERE project_id = ${params.id}`;
  await sql`DELETE FROM projects WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
