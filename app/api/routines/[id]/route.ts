import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM routines WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
