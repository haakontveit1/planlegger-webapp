import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";
import { JournalEntry } from "@/lib/db";

function rowToEntry(r: Record<string, unknown>): JournalEntry {
  return {
    id: r.id as string,
    date: r.date as string,
    rating: r.rating as number,
    ratingNote: r.rating_note as string | null,
    bedTime: r.bed_time as string | null,
    wakeTime: r.wake_time as string | null,
    learning: r.learning as string | null,
    tomorrow: r.tomorrow as string | null,
    photoUris: JSON.parse((r.photo_uris as string) || "[]"),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function GET(_req: Request, { params }: { params: { date: string } }) {
  const rows = await sql`SELECT * FROM journal_entries WHERE date = ${params.date}`;
  if (rows.length === 0) return NextResponse.json(null);
  return NextResponse.json(rowToEntry(rows[0]));
}

export async function PUT(req: Request, { params }: { params: { date: string } }) {
  const e = (await req.json()) as JournalEntry;
  const photoUris = JSON.stringify(e.photoUris);
  await sql`
    INSERT INTO journal_entries (id, date, rating, rating_note, bed_time, wake_time, learning, tomorrow, photo_uris, created_at, updated_at)
    VALUES (${e.id}, ${params.date}, ${e.rating}, ${e.ratingNote}, ${e.bedTime}, ${e.wakeTime}, ${e.learning}, ${e.tomorrow}, ${photoUris}, ${e.createdAt}, ${e.updatedAt})
    ON CONFLICT (date) DO UPDATE SET
      rating = EXCLUDED.rating, rating_note = EXCLUDED.rating_note,
      bed_time = EXCLUDED.bed_time, wake_time = EXCLUDED.wake_time,
      learning = EXCLUDED.learning, tomorrow = EXCLUDED.tomorrow,
      photo_uris = EXCLUDED.photo_uris, updated_at = EXCLUDED.updated_at
  `;
  return NextResponse.json(e);
}
