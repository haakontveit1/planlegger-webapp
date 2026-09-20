import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS lift_sessions (
      id            TEXT PRIMARY KEY,
      date          TEXT NOT NULL,
      workout_name  TEXT NOT NULL,
      exercise      TEXT NOT NULL,
      best_weight   REAL NOT NULL,
      best_reps     INTEGER NOT NULL,
      estimated_1rm REAL NOT NULL,
      created_at    TEXT NOT NULL
    )
  `;
}

export async function GET() {
  await ensureTable();
  const rows = await sql`SELECT * FROM lift_sessions ORDER BY date ASC`;
  return NextResponse.json(rows.map(r => ({
    id:           r.id as string,
    date:         r.date as string,
    workoutName:  r.workout_name as string,
    exercise:     r.exercise as string,
    bestWeight:   r.best_weight as number,
    bestReps:     r.best_reps as number,
    estimated1rm: r.estimated_1rm as number,
  })));
}

export async function POST(req: Request) {
  await ensureTable();
  const body = await req.json() as Array<{
    id: string; date: string; workoutName: string; exercise: string;
    bestWeight: number; bestReps: number; estimated1rm: number;
  }>;

  for (const s of body) {
    await sql`
      INSERT INTO lift_sessions (id, date, workout_name, exercise, best_weight, best_reps, estimated_1rm, created_at)
      VALUES (${s.id}, ${s.date}, ${s.workoutName}, ${s.exercise}, ${s.bestWeight}, ${s.bestReps}, ${s.estimated1rm}, ${new Date().toISOString()})
      ON CONFLICT (id) DO UPDATE SET
        best_weight   = EXCLUDED.best_weight,
        best_reps     = EXCLUDED.best_reps,
        estimated_1rm = EXCLUDED.estimated_1rm,
        workout_name  = EXCLUDED.workout_name
    `;
  }

  return NextResponse.json({ ok: true, count: body.length });
}
