import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { Task } from "@/lib/db";

function rowToTask(r: Record<string, unknown>): Task {
  return {
    id: r.id as string,
    title: r.title as string,
    notes: r.notes as string | null,
    status: r.status as Task["status"],
    category: r.category as Task["category"],
    lane: r.lane as Task["lane"],
    customer: r.customer as string | null,
    durationMinutes: r.duration_minutes as number | null,
    isBacklog: r.is_backlog as boolean,
    sortOrder: Number(r.sort_order),
    projectId: r.project_id as string | null,
    dueDate: r.due_date as string | null,
    dueTime: r.due_time as string | null,
    completedAt: r.completed_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function GET() {
  try {
    const rows = await sql`SELECT * FROM tasks ORDER BY sort_order ASC, created_at ASC`;
    return NextResponse.json(rows.map(rowToTask));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const t = (await req.json()) as Task;
    await sql`
      INSERT INTO tasks (id, title, notes, status, category, lane, customer, duration_minutes,
        is_backlog, sort_order, project_id, due_date, due_time, completed_at, created_at, updated_at)
      VALUES (${t.id}, ${t.title}, ${t.notes}, ${t.status}, ${t.category}, ${t.lane},
        ${t.customer}, ${t.durationMinutes}, ${t.isBacklog}, ${t.sortOrder}, ${t.projectId},
        ${t.dueDate}, ${t.dueTime}, ${t.completedAt}, ${t.createdAt}, ${t.updatedAt})
    `;
    return NextResponse.json(t, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
