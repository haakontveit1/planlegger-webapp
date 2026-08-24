import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

interface BuyItem {
  id: string;
  name: string;
  isRange: boolean;
  priceEstimate: number | null;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
}

function rowToItem(r: Record<string, unknown>): BuyItem {
  return {
    id: r.id as string,
    name: r.name as string,
    isRange: r.is_range as boolean,
    priceEstimate: r.price_estimate != null ? Number(r.price_estimate) : null,
    priceMin: r.price_min != null ? Number(r.price_min) : null,
    priceMax: r.price_max != null ? Number(r.price_max) : null,
    createdAt: r.created_at as string,
  };
}

export async function GET() {
  const rows = await sql`SELECT * FROM buy_items ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToItem));
}

export async function POST(req: Request) {
  const item = (await req.json()) as BuyItem;
  await sql`
    INSERT INTO buy_items (id, name, is_range, price_estimate, price_min, price_max, created_at)
    VALUES (${item.id}, ${item.name}, ${item.isRange}, ${item.priceEstimate}, ${item.priceMin}, ${item.priceMax}, ${item.createdAt})
  `;
  return NextResponse.json(item, { status: 201 });
}
