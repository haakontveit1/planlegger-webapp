import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { Task } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const t = (await req.json()) as Task;
  await sql`
    UPDATE tasks SET
      title = ${t.title}, notes = ${t.notes}, status = ${t.status}, category = ${t.category},
      lane = ${t.lane}, customer = ${t.customer}, duration_minutes = ${t.durationMinutes},
      is_backlog = ${t.isBacklog}, sort_order = ${t.sortOrder}, project_id = ${t.projectId},
      due_date = ${t.dueDate}, due_time = ${t.dueTime}, completed_at = ${t.completedAt},
      updated_at = ${t.updatedAt}
    WHERE id = ${params.id}
  `;
  return NextResponse.json(t);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await sql`DELETE FROM tasks WHERE id = ${params.id}`;
  return NextResponse.json({ ok: true });
}
