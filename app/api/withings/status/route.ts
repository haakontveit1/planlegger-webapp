import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS withings_tokens (
        user_id       TEXT PRIMARY KEY,
        access_token  TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at    TEXT NOT NULL,
        created_at    TEXT NOT NULL
      )
    `;
    const rows = await sql`SELECT user_id FROM withings_tokens LIMIT 1`;
    return NextResponse.json({ connected: rows.length > 0 });
  } catch {
    return NextResponse.json({ connected: false });
  }
}

export async function DELETE() {
  try {
    await sql`DELETE FROM withings_tokens`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
