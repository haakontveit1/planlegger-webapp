import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { DevGoal } from "@/lib/db";

function rowToGoal(r: Record<string, unknown>): DevGoal {
  return {
    id: r.id as string,
    weekStart: r.week_start as string,
    targetHours: r.target_hours as number,
    loggedMinutes: r.logged_minutes as number,
  };
}

export async function GET(_req: Request, { params }: { params: { weekStart: string } }) {
  const rows = await sql`SELECT * FROM dev_goals WHERE week_start = ${params.weekStart}`;
  if (rows.length === 0) return NextResponse.json(null);
  return NextResponse.json(rowToGoal(rows[0]));
}

export async function PUT(req: Request, { params }: { params: { weekStart: string } }) {
  const g = (await req.json()) as DevGoal;
  await sql`
    INSERT INTO dev_goals (id, week_start, target_hours, logged_minutes)
    VALUES (${g.id}, ${params.weekStart}, ${g.targetHours}, ${g.loggedMinutes})
    ON CONFLICT (week_start) DO UPDATE SET
      target_hours = EXCLUDED.target_hours,
      logged_minutes = EXCLUDED.logged_minutes
  `;
  return NextResponse.json(g);
}
