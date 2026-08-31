import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { checked } = await req.json();
  await sql`UPDATE shopping_items SET checked = ${checked ? 1 : 0} WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM shopping_items WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
