import { NextResponse } from "next/server";
import { sql } from "@/lib/neon";

async function getValidToken(userId: string): Promise<string | null> {
  const rows = await sql`SELECT * FROM withings_tokens WHERE user_id = ${userId}`;
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
      WHERE user_id = ${userId}
    `;

    return access_token;
  }

  return row.access_token as string;
}

function toDateStr(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST(req: Request) {
  const text = await req.text();
  const params = new URLSearchParams(text);

  const userId = params.get("userid");
  const startdate = params.get("startdate");
  const enddate = params.get("enddate");

  if (!userId || !startdate || !enddate) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const accessToken = await getValidToken(userId);
  if (!accessToken) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const measureUrl = new URL("https://wbsapi.withings.net/measure");
  measureUrl.searchParams.set("action", "getmeas");
  measureUrl.searchParams.set("meastype", "1");
  measureUrl.searchParams.set("category", "1");
  measureUrl.searchParams.set("startdate", startdate);
  measureUrl.searchParams.set("enddate", enddate);

  const measureRes = await fetch(measureUrl.toString(), {
    headers: { "Authorization": `Bearer ${accessToken}` },
  });

  const measureData = await measureRes.json() as {
    status: number;
    body: { measuregroups: Array<{ date: number; measures: Array<{ type: number; value: number; unit: number }> }> };
  };

  if (measureData.status !== 0) {
    return NextResponse.json({ ok: false });
  }

  for (const group of measureData.body?.measuregroups ?? []) {
    for (const measure of group.measures) {
      if (measure.type !== 1) continue;
      const weightKg = parseFloat((measure.value * Math.pow(10, measure.unit)).toFixed(2));
      const dateStr = toDateStr(group.date);

      await sql`
        INSERT INTO weight_logs (date, weight_kg, created_at)
        VALUES (${dateStr}, ${weightKg}, ${new Date().toISOString()})
        ON CONFLICT (date) DO UPDATE SET weight_kg = EXCLUDED.weight_kg
      `;
    }
  }

  return NextResponse.json({ ok: true });
}
