import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { ShoppingItem } from "@/lib/db";

function rowToItem(r: Record<string, unknown>): ShoppingItem {
  return {
    id: r.id as string,
    text: r.text as string,
    checked: Boolean(r.checked),
    sortOrder: r.sort_order as number,
    createdAt: r.created_at as string,
  };
}

export async function GET() {
  const rows = await sql`SELECT * FROM shopping_items ORDER BY sort_order ASC, created_at ASC`;
  return NextResponse.json(rows.map(rowToItem));
}

export async function POST(req: Request) {
  const item = (await req.json()) as ShoppingItem;
  await sql`
    INSERT INTO shopping_items (id, text, checked, sort_order, created_at)
    VALUES (${item.id}, ${item.text}, ${item.checked ? 1 : 0}, ${item.sortOrder}, ${item.createdAt})
  `;
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE() {
  await sql`DELETE FROM shopping_items WHERE checked = 1`;
  return NextResponse.json({ ok: true });
}
