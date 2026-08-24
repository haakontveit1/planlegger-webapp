import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { Project } from "@/lib/db";

function rowToProject(r: Record<string, unknown>): Project {
  return {
    id: r.id as string,
    name: r.name as string,
    category: r.category as string,
    color: r.color as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function GET() {
  const rows = await sql`SELECT * FROM projects ORDER BY created_at ASC`;
  return NextResponse.json(rows.map(rowToProject));
}

export async function POST(req: Request) {
  const p = (await req.json()) as Project;
  await sql`
    INSERT INTO projects (id, name, category, color, created_at, updated_at)
    VALUES (${p.id}, ${p.name}, ${p.category}, ${p.color}, ${p.createdAt}, ${p.updatedAt})
  `;
  return NextResponse.json(p, { status: 201 });
}
