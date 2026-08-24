import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function POST(req: Request) {
  const { orderedIds } = (await req.json()) as { orderedIds: string[] };
  await Promise.all(
    orderedIds.map((id, i) => sql`UPDATE tasks SET sort_order = ${i * 1000} WHERE id = ${id}`)
  );
  return NextResponse.json({ ok: true });
}
