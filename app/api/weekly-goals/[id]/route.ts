import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { achieved } = await req.json();
  await sql`UPDATE weekly_goals SET achieved = ${achieved} WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM weekly_goals WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
