import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

interface ProjectNote {
  id: string;
  projectId: string;
  text: string;
  createdAt: string;
}

function rowToNote(r: Record<string, unknown>): ProjectNote {
  return {
    id: r.id as string,
    projectId: r.project_id as string,
    text: r.text as string,
    createdAt: r.created_at as string,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const rows = projectId
    ? await sql`SELECT * FROM project_notes WHERE project_id = ${projectId} ORDER BY created_at ASC`
    : await sql`SELECT * FROM project_notes ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToNote));
}

export async function POST(req: Request) {
  const note = (await req.json()) as ProjectNote;
  await sql`
    INSERT INTO project_notes (id, project_id, text, created_at)
    VALUES (${note.id}, ${note.projectId}, ${note.text}, ${note.createdAt})
  `;
  return NextResponse.json(note, { status: 201 });
}
