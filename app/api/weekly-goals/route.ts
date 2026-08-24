import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { WeeklyGoal } from "@/lib/db";

function rowToGoal(r: Record<string, unknown>): WeeklyGoal {
  return {
    id: r.id as string,
    weekStart: r.week_start as string,
    text: r.text as string,
    isWish: r.is_wish as boolean,
    achieved: r.achieved as boolean,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  const rows = weekStart
    ? await sql`SELECT * FROM weekly_goals WHERE week_start = ${weekStart}`
    : await sql`SELECT * FROM weekly_goals`;
  return NextResponse.json(rows.map(rowToGoal));
}

export async function POST(req: Request) {
  const g = (await req.json()) as WeeklyGoal;
  await sql`
    INSERT INTO weekly_goals (id, week_start, text, is_wish, achieved)
    VALUES (${g.id}, ${g.weekStart}, ${g.text}, ${g.isWish}, ${g.achieved})
  `;
  return NextResponse.json(g, { status: 201 });
}
