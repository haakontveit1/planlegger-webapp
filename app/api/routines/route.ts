import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { Routine } from "@/lib/db";

function rowToRoutine(r: Record<string, unknown>): Routine {
  return {
    id: r.id as string,
    title: r.title as string,
    projectId: r.project_id as string | null,
    defaultDurationMinutes: r.default_duration_minutes as number | null,
    description: r.description as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function GET() {
  const rows = await sql`SELECT * FROM routines ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToRoutine));
}

export async function POST(req: Request) {
  const r = (await req.json()) as Routine;
  await sql`
    INSERT INTO routines (id, title, project_id, default_duration_minutes, description, created_at, updated_at)
    VALUES (${r.id}, ${r.title}, ${r.projectId}, ${r.defaultDurationMinutes}, ${r.description}, ${r.createdAt}, ${r.updatedAt})
  `;
  return NextResponse.json(r, { status: 201 });
}
