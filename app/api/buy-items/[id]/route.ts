import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json();
  await sql`
    UPDATE buy_items SET
      name = ${b.name},
      is_range = ${b.isRange},
      price_estimate = ${b.priceEstimate},
      price_min = ${b.priceMin},
      price_max = ${b.priceMax}
    WHERE id = ${params.id}
  `;
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM buy_items WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
