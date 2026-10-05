import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

async function getValidToken(): Promise<{ token: string } | null> {
  const rows = await sql`SELECT * FROM withings_tokens LIMIT 1`;
  if (rows.length === 0) return null;

  const row = rows[0];
  const expiresAt = new Date(row.expires_at as string);

  if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
    const res = await fetch("https://wbsapi.withings.net/v2/oauth2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        action: "requesttoken",
        client_id: process.env.WITHINGS_CLIENT_ID!,
        client_secret: process.env.WITHINGS_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: row.refresh_token as string,
      }),
    });
    const data = await res.json() as {
      status: number;
      body: { access_token: string; refresh_token: string; expires_in: number };
    };
    if (data.status !== 0) return null;
    const { access_token, refresh_token, expires_in } = data.body;
    const newExpiresAt = new Date(Date.now() + expires_in * 1000).toISOString();
    await sql`
      UPDATE withings_tokens
      SET access_token = ${access_token}, refresh_token = ${refresh_token}, expires_at = ${newExpiresAt}
      WHERE user_id = ${row.user_id as string}
    `;
    return { token: access_token };
  }

  return { token: row.access_token as string };
}

function toDateStr(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const MEAS_TYPES = new Set([1, 5, 6, 8, 76, 77, 88]);

export async function POST(req: Request) {
  const result = await getValidToken();
  if (!result) {
    return NextResponse.json({ error: "Not connected" }, { status: 401 });
  }

  const { token } = result;
  const body = await req.json().catch(() => ({})) as { days?: number };
  const days = body.days ?? 180;
  const startdate = Math.floor(Date.now() / 1000 - days * 86400);
  const enddate = Math.floor(Date.now() / 1000);

  await sql`
    CREATE TABLE IF NOT EXISTS withings_measurements (
      date  TEXT    NOT NULL,
      type  INTEGER NOT NULL,
      value REAL    NOT NULL,
      PRIMARY KEY (date, type)
    )
  `;

  const measureUrl = new URL("https://wbsapi.withings.net/measure");
  measureUrl.searchParams.set("action", "getmeas");
  measureUrl.searchParams.set("startdate", String(startdate));
  measureUrl.searchParams.set("enddate", String(enddate));

  const measureRes = await fetch(measureUrl.toString(), {
    headers: { "Authorization": `Bearer ${token}` },
  });

  const measureData = await measureRes.json() as {
    status: number;
    body: { measuregroups: Array<{ date: number; measures: Array<{ type: number; value: number; unit: number }> }> };
  };

  if (measureData.status !== 0) {
    return NextResponse.json({
      error: `Withings API error (status ${measureData.status})`,
      raw: measureData,
    }, { status: 500 });
  }

  const groups = measureData.body?.measuregroups ?? [];
  let count = 0;
  for (const group of groups) {
    const dateStr = toDateStr(group.date);
    for (const measure of group.measures) {
      if (!MEAS_TYPES.has(measure.type)) continue;
      const value = parseFloat((measure.value * Math.pow(10, measure.unit)).toFixed(3));
      await sql`
        INSERT INTO withings_measurements (date, type, value)
        VALUES (${dateStr}, ${measure.type}, ${value})
        ON CONFLICT (date, type) DO UPDATE SET value = EXCLUDED.value
      `;
      if (measure.type === 1) {
        await sql`
          INSERT INTO weight_logs (date, weight_kg, created_at)
          VALUES (${dateStr}, ${value}, ${new Date().toISOString()})
          ON CONFLICT (date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
        `;
      }
      count++;
    }
  }

  return NextResponse.json({
    ok: true,
    count,
    debug: {
      groupCount: groups.length,
      startdate,
      enddate,
      rawBody: measureData.body,
    },
  });
}
