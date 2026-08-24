import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { RoutineSession } from "@/lib/db";

function rowToSession(r: Record<string, unknown>): RoutineSession {
  return {
    id: r.id as string,
    routineId: r.routine_id as string,
    durationMinutes: r.duration_minutes as number,
    date: r.date as string,
    status: r.status as RoutineSession["status"],
    completedAt: r.completed_at as string | null,
    createdAt: r.created_at as string,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const rows = date
    ? await sql`SELECT * FROM routine_sessions WHERE date = ${date}`
    : await sql`SELECT * FROM routine_sessions`;
  return NextResponse.json(rows.map(rowToSession));
}

export async function POST(req: Request) {
  const s = (await req.json()) as RoutineSession;
  await sql`
    INSERT INTO routine_sessions (id, routine_id, duration_minutes, date, status, completed_at, created_at)
    VALUES (${s.id}, ${s.routineId}, ${s.durationMinutes}, ${s.date}, ${s.status}, ${s.completedAt}, ${s.createdAt})
  `;
  return NextResponse.json(s, { status: 201 });
}
